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
    return ['didi-header-sign', 'x-didi-signature', 'x-food99-signature', 'x-signature'];
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

  _verifySignature(rawBody, signature, secret) {
    if (!signature || !secret || !rawBody) return false;

    const candidates = [
      crypto.createHash('md5').update(rawBody).digest('hex'),
      crypto.createHash('md5').update(`${rawBody}${secret}`).digest('hex'),
      crypto.createHash('md5').update(`${secret}${rawBody}`).digest('hex'),
    ];

    return candidates.includes(signature.toLowerCase());
  }

  /**
   * Normaliza o payload do webhook 99Food.
   * 
   * Payload real (orderNew):
   * {
   *   "app_id": 5764607675764049800,
   *   "app_shop_id": "5764607675764049800",
   *   "type": "orderNew",
   *   "timestamp": 1780594949,
   *   "data": {
   *     "order_id": 5764607573746648888,
   *     "order_info": { "order_id": ..., "status": 100, "pay_type": 1, ... }
   *   }
   * }
   * 
   * Payload para status/apply (provável):
   * {
   *   "app_id": ..., "app_shop_id": "...",
   *   "type": "status" | "cancel_apply" | "refund_apply",
   *   "data": { "order_id": ..., "status": ..., "apply_id": ..., ... }
   * }
   */
  _unwrapPayload(body) {
    if (!body) return { eventType: null, orderId: null, appShopId: null, orderData: null };

    const eventType = body.type || body.event;

    // order_id pode estar em data.order_id ou no top level
    // Sempre converter para string para evitar perda de precisão de números grandes (>MAX_SAFE_INTEGER)
    const rawOrderId = body.data?.order_id || body.order_id;
    const orderId = rawOrderId != null ? String(rawOrderId) : null;

    // app_shop_id pode estar no top level ou dentro de data.order_info.shop
    const appShopId = body.app_shop_id
      || body.data?.order_info?.shop?.app_shop_id
      || body.data?.shop?.app_shop_id
      || body.shop?.app_shop_id;

    // Dados do pedido: data.order_info (orderNew) ou data (status updates)
    const orderData = body.data?.order_info || body.data || body;

    // Status e shop_accept_status
    const status = orderData.status;
    const shopAcceptStatus = orderData.shop_accept_status || body.shop_accept_status;

    // Para cancel/refund apply
    const applyId = orderData.apply_id || body.apply_id;
    const reason = orderData.reason || body.reason;

    return {
      eventType,
      orderId,
      appShopId,
      status,
      shopAcceptStatus,
      orderData,
      applyId,
      reason,
      rawBody: body,
    };
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

  async _findSettingForWebhook(appShopId) {
    const settings = await prisma.integrationSettings.findMany({
      where: { food99IntegrationActive: true, food99AppShopId: { not: null } },
    });

    if (settings.length === 0) return null;

    if (appShopId) {
      const found = settings.find(s => s.food99AppShopId === appShopId);
      if (found) return found;
    }

    // Fallback: se há apenas uma loja 99Food ativa, usar ela
    if (settings.length === 1) return settings[0];

    return null;
  }

  async _handleApplyRequest(unwrapped, kind) {
    const orderId = unwrapped.orderId;
    const applyId = unwrapped.applyId;
    const reason = unwrapped.reason;

    if (!orderId || !applyId) {
      logger.warn(`[FOOD99 WEBHOOK] ${kind}_apply sem order_id ou apply_id`);
      return;
    }

    logger.info(`[FOOD99 WEBHOOK] ${kind}_apply recebido: order=${orderId}, apply=${applyId}, reason=${reason}`);

    const setting = await this._findSettingForWebhook(unwrapped.appShopId);
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
      'didi-header-sign': req.headers['didi-header-sign'] ? 'presente' : 'ausente',
      'x-didi-signature': req.headers['x-didi-signature'] ? 'presente' : 'ausente',
      'x-food99-signature': req.headers['x-food99-signature'] ? 'presente' : 'ausente',
      'x-signature': req.headers['x-signature'] ? 'presente' : 'ausente',
      'x-forwarded-for': req.headers['x-forwarded-for'] || req.ip,
    };
    const bodyPreview = JSON.stringify(body)?.slice(0, 800);

    const unwrapped = this._unwrapPayload(body);
    logger.info(`[FOOD99 WEBHOOK] Recebido: type=${unwrapped.eventType}, order_id=${unwrapped.orderId}, status=${unwrapped.status}, shop_accept_status=${unwrapped.shopAcceptStatus}, app_shop_id=${unwrapped.appShopId}`);
    logger.info(`[FOOD99 WEBHOOK] Headers: ${JSON.stringify(headersLog)}`);
    logger.debug(`[FOOD99 WEBHOOK] Body raw: ${bodyPreview}`);

    const sig = this._extractSignature(req.headers);
    if (sig && process.env.FOOD99_CLIENT_SECRET) {
      const rawBody = req.rawBody || JSON.stringify(body);
      const isValid = this._verifySignature(rawBody, sig.value, process.env.FOOD99_CLIENT_SECRET);
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
      if (unwrapped.eventType === 'cancel_apply') {
        logger.info(`[FOOD99 WEBHOOK] Processando cancel_apply para order=${unwrapped.orderId}`);
        await this._handleApplyRequest(unwrapped, 'cancel');
        this._logProcessingTime(startedAt, 'cancel_apply');
        return;
      }
      if (unwrapped.eventType === 'refund_apply') {
        logger.info(`[FOOD99 WEBHOOK] Processando refund_apply para order=${unwrapped.orderId}`);
        await this._handleApplyRequest(unwrapped, 'refund');
        this._logProcessingTime(startedAt, 'refund_apply');
        return;
      }
      await this._processWebhook(unwrapped);
      this._logProcessingTime(startedAt, unwrapped.eventType || 'unknown');
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

  async _processWebhook(unwrapped) {
    const platformOrderId = unwrapped.orderId;
    if (!platformOrderId) {
      logger.warn(`[FOOD99 WEBHOOK] Payload sem order_id, ignorando. EventType=${unwrapped.eventType}`);
      return;
    }

    const status = unwrapped.status;
    const shopAcceptStatus = unwrapped.shopAcceptStatus;

    const targetSetting = await this._findSettingForWebhook(unwrapped.appShopId);
    if (!targetSetting) {
      logger.warn(`[FOOD99 WEBHOOK] Loja não encontrada para app_shop_id=${unwrapped.appShopId}. Order=${platformOrderId}, status=${status}`);
      return;
    }

    const restaurantId = targetSetting.restaurantId;

    // Determinar o tipo de evento
    // Para orderNew: status=100 (novo pedido)
    // Para updates: usar status numérico ou shop_accept_status
    const rawStatusForMapping = shopAcceptStatus || status;
    const eventType = `STATUS_${rawStatusForMapping}`;

    const alreadyProcessed = await this._isEventProcessed(PLATFORM, String(platformOrderId), eventType);
    if (alreadyProcessed) {
      logger.info(`[FOOD99 WEBHOOK] Evento ${eventType} para ${platformOrderId} já processado`);
      return;
    }

    const kiStatus = IntegrationTypeService.mapStatus(PLATFORM, String(rawStatusForMapping));
    logger.info(`[FOOD99 WEBHOOK] Processando order=${platformOrderId} type=${unwrapped.eventType} status=${status} shop_accept_status=${shopAcceptStatus} -> ki=${kiStatus} (restaurantId=${restaurantId})`);

    switch (kiStatus) {
      case 'PENDING':
        await this._handleNewOrder(restaurantId, platformOrderId, unwrapped);
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

  async _handleNewOrder(restaurantId, platformOrderId, unwrapped) {
    try {
      // orderData contém os dados do pedido (data.order_info ou data)
      // Food99OrderAdapter.processNewOrder espera o body com os campos do pedido
      // Precisamos passar o orderData que tem order_items, price, pay_type, etc.
      const orderData = unwrapped.orderData || unwrapped.rawBody;
      const order = await Food99OrderAdapter.processNewOrder(restaurantId, orderData);
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
