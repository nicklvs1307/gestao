const crypto = require('crypto');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const Food99OrderAdapter = require('./Food99OrderAdapter');
const IntegrationOrderService = require('./IntegrationOrderService');
const IntegrationTypeService = require('./IntegrationTypeService');
const socketLib = require('../lib/socket');

const PLATFORM = 'food99';

class Food99WebhookService {

  _getSignHeaders() {
    return ['x-didi-signature', 'x-food99-signature', 'x-signature'];
  }

  _extractSignature(headers) {
    if (!headers) return null;
    for (const h of this._getSignHeaders()) {
      const v = headers[h];
      if (v) return { header: h, value: String(v).trim() };
    }
    if (headers.sign) return { header: 'query.sign', value: String(headers.sign).trim() };
    return null;
  }

  _verifySignature(body, signature, secret, algo = 'md5') {
    if (!signature || !secret) return false;

    let payload;
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      const sortedKeys = Object.keys(body).sort();
      payload = sortedKeys.map(key => `${key}=${body[key]}`).join('&');
    } else if (typeof body === 'string') {
      payload = body;
    } else {
      payload = JSON.stringify(body);
    }

    const candidates = [
      crypto.createHash(algo).update(`${payload}${secret}`).digest('hex'),
      crypto.createHash(algo).update(`${secret}${payload}`).digest('hex'),
    ];

    return candidates.includes(signature.toLowerCase());
  }

  async _isEventProcessed(platform, platformOrderId, eventType) {
    if (!platformOrderId) return false;

    const event = await prisma.integrationEvent.findUnique({
      where: {
        platform_platformOrderId_eventType: {
          platform,
          platformOrderId,
          eventType,
        },
      },
    });

    return event?.status === 'PROCESSED';
  }

  async _markEventProcessed(platform, platformOrderId, eventType, restaurantId, orderId) {
    await IntegrationOrderService.registerEvent(
      platform,
      platformOrderId,
      eventType,
      restaurantId,
      orderId,
      'PROCESSED',
    );
  }

  async _findSettingForWebhook(body) {
    const settings = await prisma.integrationSettings.findMany({
      where: { food99IntegrationActive: true, food99AppShopId: { not: null } },
    });

    if (settings.length === 0) return null;

    const appShopId = body?.shop?.app_shop_id || body?.app_shop_id || body?.appShopId;
    if (appShopId) {
      const found = settings.find(s => s.food99AppShopId === appShopId);
      if (found) return found;
    }

    if (settings.length === 1) return settings[0];

    return null;
  }

  async _handleApplyRequest(body, kind) {
    const orderId = body?.order_id;
    const applyId = body?.apply_id;
    const reason = body?.reason;

    if (!orderId || !applyId) {
      logger.warn(`[FOOD99 WEBHOOK] ${kind}_apply sem order_id ou apply_id`);
      return;
    }

    logger.info(`[FOOD99 WEBHOOK] ${kind}_apply recebido: order=${orderId}, apply=${applyId}, reason=${reason}`);

    const setting = await this._findSettingForWebhook(body);
    if (!setting) {
      logger.warn(`[FOOD99 WEBHOOK] Nenhuma loja 99Food ativa para ${kind}_apply`);
      return;
    }

    if (kind === 'cancel' && !setting.food99ReceiveCancelApply) {
      logger.info(`[FOOD99 WEBHOOK] cancel_apply ignorado para restaurante ${setting.restaurantId} (config desabilitada)`);
      return;
    }
    if (kind === 'refund' && !setting.food99ReceiveRefundApply) {
      logger.info(`[FOOD99 WEBHOOK] refund_apply ignorado para restaurante ${setting.restaurantId} (config desabilitada)`);
      return;
    }

    const eventName = kind === 'cancel' ? 'cancel_apply_request' : 'refund_apply_request';
    socketLib.emitToRestaurant(setting.restaurantId, eventName, {
      platform: PLATFORM,
      orderId,
      applyId,
      reason,
    });

    logger.info(`[FOOD99 WEBHOOK] Notificação de ${kind} apply enviada para restaurante ${setting.restaurantId}`);
  }

  async handleWebhook(req, res) {
    const body = req.body;
    const startedAt = Date.now();

    const headersLog = {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      'x-didi-signature': req.headers['x-didi-signature'] ? 'presente' : 'ausente',
      'x-food99-signature': req.headers['x-food99-signature'] ? 'presente' : 'ausente',
      'x-signature': req.headers['x-signature'] ? 'presente' : 'ausente',
      'x-forwarded-for': req.headers['x-forwarded-for'] || req.ip,
    };
    const bodyPreview = JSON.stringify(body)?.slice(0, 500);

    logger.info(`[FOOD99 WEBHOOK] Recebido: order_id=${body?.order_id}, event=${body?.event}, status=${body?.status}, shop_accept_status=${body?.shop_accept_status}`);
    logger.info(`[FOOD99 WEBHOOK] Headers: ${JSON.stringify(headersLog)}`);
    logger.debug(`[FOOD99 WEBHOOK] Body raw: ${bodyPreview}`);

    const sig = this._extractSignature(req.headers);
    if (sig && process.env.FOOD99_CLIENT_SECRET) {
      const isValid = this._verifySignature(body, sig.value, process.env.FOOD99_CLIENT_SECRET);
      if (!isValid) {
        logger.warn(`[FOOD99 WEBHOOK] Assinatura inválida (header=${sig.header}, value=${sig.value?.slice(0, 16)}...), rejeitando request`);
        return res.status(403).json({ error: 'Assinatura inválida' });
      }
      logger.debug(`[FOOD99 WEBHOOK] Assinatura válida (header=${sig.header})`);
    } else {
      logger.debug(`[FOOD99 WEBHOOK] Sem assinatura presente (header=${sig?.header || 'none'}, secret=${process.env.FOOD99_CLIENT_SECRET ? 'OK' : 'MISSING'}), processando sem validar`);
    }

    res.status(200).json({ received: true });

    try {
      if (body?.event === 'cancel_apply') {
        logger.info(`[FOOD99 WEBHOOK] Processando cancel_apply para order=${body.order_id}`);
        await this._handleApplyRequest(body, 'cancel');
        this._logProcessingTime(startedAt, 'cancel_apply');
        return;
      }
      if (body?.event === 'refund_apply') {
        logger.info(`[FOOD99 WEBHOOK] Processando refund_apply para order=${body.order_id}`);
        await this._handleApplyRequest(body, 'refund');
        this._logProcessingTime(startedAt, 'refund_apply');
        return;
      }
      await this._processWebhook(body);
      this._logProcessingTime(startedAt, body?.event || 'unknown');
    } catch (error) {
      logger.error('[FOOD99 WEBHOOK] Erro ao processar webhook:', error.message, error.stack);
    }
  }

  _logProcessingTime(startedAt, event) {
    const ms = Date.now() - startedAt;
    if (ms > 1000) {
      logger.warn(`[FOOD99 WEBHOOK] Processamento lento: ${event} levou ${ms}ms`);
    } else {
      logger.debug(`[FOOD99 WEBHOOK] Processado ${event} em ${ms}ms`);
    }
  }

  async _processWebhook(body) {
    if (!body || !body.order_id) {
      logger.warn(`[FOOD99 WEBHOOK] Payload sem order_id, ignorando. Body keys: ${Object.keys(body || {}).join(',')}`);
      return;
    }

    const { order_id: platformOrderId, status, shop_accept_status: shopAcceptStatus } = body;

    const targetSetting = await this._findSettingForWebhook(body);
    if (!targetSetting) {
      logger.warn(`[FOOD99 WEBHOOK] Loja não encontrada para app_shop_id=${body.shop?.app_shop_id || body.app_shop_id || 'não informado'}. Body: ${JSON.stringify({ order_id: platformOrderId, status, shop_accept_status: shopAcceptStatus, shop: body.shop })}`);
      return;
    }

    const restaurantId = targetSetting.restaurantId;

    const eventType = `STATUS_${shopAcceptStatus || status}`;
    const alreadyProcessed = await this._isEventProcessed(PLATFORM, String(platformOrderId), eventType);
    if (alreadyProcessed) {
      logger.info(`[FOOD99 WEBHOOK] Evento ${eventType} para ${platformOrderId} já processado`);
      return;
    }

    const kiStatus = IntegrationTypeService.mapStatus(PLATFORM, String(shopAcceptStatus || status));
    logger.info(`[FOOD99 WEBHOOK] Processando order=${platformOrderId} status=${status} shop_accept_status=${shopAcceptStatus} -> ki=${kiStatus} (restaurantId=${restaurantId})`);

    switch (kiStatus) {
      case 'PENDING':
        await this._handleNewOrder(restaurantId, platformOrderId, body);
        await this._markEventProcessed(PLATFORM, String(platformOrderId), eventType, restaurantId, null);
        break;

      case 'PREPARING':
        await IntegrationOrderService.updateFromIntegration(PLATFORM, restaurantId, String(platformOrderId), { status: 'PREPARING' });
        await this._markEventProcessed(PLATFORM, String(platformOrderId), eventType, restaurantId, null);
        break;

      case 'READY':
        await IntegrationOrderService.updateFromIntegration(PLATFORM, restaurantId, String(platformOrderId), { status: 'READY' });
        await this._markEventProcessed(PLATFORM, String(platformOrderId), eventType, restaurantId, null);
        break;

      case 'CANCELED':
        await IntegrationOrderService.cancelFromIntegration(PLATFORM, restaurantId, String(platformOrderId));
        await this._markEventProcessed(PLATFORM, String(platformOrderId), eventType, restaurantId, null);
        break;

      case 'COMPLETED':
        await IntegrationOrderService.updateFromIntegration(PLATFORM, restaurantId, String(platformOrderId), { status: 'COMPLETED' });
        await this._markEventProcessed(PLATFORM, String(platformOrderId), eventType, restaurantId, null);
        break;

      default:
        logger.info(`[FOOD99 WEBHOOK] Evento ${kiStatus} (raw: status=${status}, shop_accept_status=${shopAcceptStatus}) não requer processamento específico`);
    }
  }

  async _handleNewOrder(restaurantId, platformOrderId, rawData) {
    try {
      const order = await Food99OrderAdapter.processNewOrder(restaurantId, rawData);
      if (order && !order.isReplayed) {
        logger.info(`[FOOD99 WEBHOOK] Pedido ${platformOrderId} criado com sucesso`);
        socketLib.emitToRestaurant(restaurantId, 'new_order', {
          platform: PLATFORM,
          orderId: order.id,
          platformOrderId,
        });
      }
    } catch (error) {
      logger.error(`[FOOD99 WEBHOOK] Erro ao criar pedido ${platformOrderId}:`, error.message);
      await IntegrationOrderService.registerEvent(
        PLATFORM,
        String(platformOrderId),
        'ORDER_PLACED',
        restaurantId,
        null,
        'FAILED',
        error.message,
      );
    }
  }
}

module.exports = new Food99WebhookService();
