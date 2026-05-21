const crypto = require('crypto');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const Food99OrderAdapter = require('./Food99OrderAdapter');
const IntegrationOrderService = require('./IntegrationOrderService');
const IntegrationTypeService = require('./IntegrationTypeService');
const socketLib = require('../lib/socket');

const PLATFORM = 'food99';

class Food99WebhookService {

  _verifySignature(body, signature, secret) {
    if (!signature || !secret) return false;

    const sortedKeys = Object.keys(body).sort();
    const queryString = sortedKeys
      .map(key => `${key}=${body[key]}`)
      .join('&');
    const expectedSignature = crypto.createHash('md5').update(`${queryString}${secret}`).digest('hex');

    return expectedSignature === signature;
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

  /**
   * Handler do webhook /webhooks/food99.
   * Recebe payload da 99Food e processa eventos.
   *
   * Evento típico:
   * {
   *   order_id: 2352921557674426622,
   *   status: 1,
   *   shop_accept_status: 1,
   *   before_status: 0,
   *   ...OrderModel fields
   * }
   *
   * Eventos de apply (quando receive_cancel_apply=1 ou receive_refund_apply=1):
   * {
   *   event: 'cancel_apply' | 'refund_apply',
   *   order_id: 2352921557674426622,
   *   apply_id: 2352921557674426621,
   *   reason: 'motivo do cliente',
   *   ...
   * }
   */
  async handleWebhook(req, res) {
    const body = req.body;
    logger.info(`[FOOD99 WEBHOOK] Recebido: order_id=${body?.order_id}, event=${body?.event}, status=${body?.status}`);

    const signature = req.headers['x-didi-signature'] || req.query.sign;
    if (signature && process.env.FOOD99_CLIENT_SECRET) {
      const isValid = this._verifySignature(body, signature, process.env.FOOD99_CLIENT_SECRET);
      if (!isValid) {
        logger.warn('[FOOD99 WEBHOOK] Assinatura inválida, rejeitando request');
        return res.status(403).json({ error: 'Assinatura inválida' });
      }
    }

    res.status(200).json({ received: true });

    try {
      if (body?.event === 'cancel_apply') {
        await this._handleCancelApply(body);
        return;
      }
      if (body?.event === 'refund_apply') {
        await this._handleRefundApply(body);
        return;
      }
      await this._processWebhook(body);
    } catch (error) {
      logger.error('[FOOD99 WEBHOOK] Erro ao processar webhook:', error.message);
    }
  }

  async _handleCancelApply(body) {
    const { order_id: orderId, apply_id: applyId, reason } = body;
    if (!orderId || !applyId) {
      logger.warn('[FOOD99 WEBHOOK] cancel_apply sem order_id ou apply_id');
      return;
    }

    logger.info(`[FOOD99 WEBHOOK] Solicitação de cancelamento recebida: order=${orderId}, apply=${applyId}, reason=${reason}`);

    const settings = await prisma.integrationSettings.findMany({
      where: { food99IntegrationActive: true, food99MerchantId: { not: null } },
    });

    if (settings.length === 0) return;

    const appShopId = body.shop?.app_shop_id || body.app_shop_id;
    let targetSetting = appShopId ? settings.find(s => s.food99AppShopId === appShopId) : null;
    if (!targetSetting && settings.length === 1) targetSetting = settings[0];
    if (!targetSetting) return;

    socketLib.emitToRestaurant(targetSetting.restaurantId, 'cancel_apply_request', {
      platform: PLATFORM,
      orderId,
      applyId,
      reason,
    });

    logger.info(`[FOOD99 WEBHOOK] Notificação de cancel apply enviada para restaurante ${targetSetting.restaurantId}`);
  }

  async _handleRefundApply(body) {
    const { order_id: orderId, apply_id: applyId, reason } = body;
    if (!orderId || !applyId) {
      logger.warn('[FOOD99 WEBHOOK] refund_apply sem order_id ou apply_id');
      return;
    }

    logger.info(`[FOOD99 WEBHOOK] Solicitação de reembolso recebida: order=${orderId}, apply=${applyId}, reason=${reason}`);

    const settings = await prisma.integrationSettings.findMany({
      where: { food99IntegrationActive: true, food99MerchantId: { not: null } },
    });

    if (settings.length === 0) return;

    const appShopId = body.shop?.app_shop_id || body.app_shop_id;
    let targetSetting = appShopId ? settings.find(s => s.food99AppShopId === appShopId) : null;
    if (!targetSetting && settings.length === 1) targetSetting = settings[0];
    if (!targetSetting) return;

    socketLib.emitToRestaurant(targetSetting.restaurantId, 'refund_apply_request', {
      platform: PLATFORM,
      orderId,
      applyId,
      reason,
    });

    logger.info(`[FOOD99 WEBHOOK] Notificação de refund apply enviada para restaurante ${targetSetting.restaurantId}`);
  }

  async _processWebhook(body) {
    if (!body || !body.order_id) {
      logger.warn('[FOOD99 WEBHOOK] Payload sem order_id, ignorando');
      return;
    }

    const { order_id: platformOrderId, status, shop_accept_status: shopAcceptStatus } = body;

    const settings = await prisma.integrationSettings.findMany({
      where: { food99IntegrationActive: true, food99MerchantId: { not: null } },
    });

    if (settings.length === 0) {
      logger.warn('[FOOD99 WEBHOOK] Nenhuma loja 99Food ativa');
      return;
    }

    const appShopId = body.shop?.app_shop_id || body.app_shop_id;
    let targetSetting = null;

    if (appShopId) {
      targetSetting = settings.find(s => s.food99AppShopId === appShopId);
    }

    if (!targetSetting && settings.length === 1) {
      targetSetting = settings[0];
    }

    if (!targetSetting) {
      logger.warn(`[FOOD99 WEBHOOK] Loja não encontrada para app_shop_id=${appShopId}`);
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
        logger.info(`[FOOD99 WEBHOOK] Evento ${kiStatus} não requer processamento específico`);
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
