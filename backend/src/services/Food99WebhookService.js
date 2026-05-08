const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const Food99OrderAdapter = require('./Food99OrderAdapter');
const IntegrationOrderService = require('./IntegrationOrderService');
const IntegrationTypeService = require('./IntegrationTypeService');
const socketLib = require('../lib/socket');

const PLATFORM = 'food99';

const STATUS_MAP = {
  1: 'PENDING',
  2: 'PREPARING',
  3: 'READY',
  4: 'SHIPPED',
  5: 'CANCELED',
  6: 'CANCELED',
  7: 'CANCELED',
  8: 'COMPLETED',
};

class Food99WebhookService {

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
   */
  async handleWebhook(req, res) {
    const body = req.body;
    logger.info(`[FOOD99 WEBHOOK] Recebido: order_id=${body?.order_id}, status=${body?.status}, shop_accept_status=${body?.shop_accept_status}`);

    res.status(200).json({ received: true });

    try {
      await this._processWebhook(body);
    } catch (error) {
      logger.error('[FOOD99 WEBHOOK] Erro ao processar webhook:', error.message);
    }
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

    const kiStatus = STATUS_MAP[shopAcceptStatus] || STATUS_MAP[status] || 'PENDING';

    switch (shopAcceptStatus || status) {
      case 1:
        await this._handleNewOrder(restaurantId, platformOrderId, body);
        await this._markEventProcessed(PLATFORM, String(platformOrderId), eventType, restaurantId, null);
        break;

      case 2:
        await IntegrationOrderService.updateFromIntegration(PLATFORM, restaurantId, String(platformOrderId), { status: 'PREPARING' });
        await this._markEventProcessed(PLATFORM, String(platformOrderId), eventType, restaurantId, null);
        break;

      case 3:
        await IntegrationOrderService.updateFromIntegration(PLATFORM, restaurantId, String(platformOrderId), { status: 'READY' });
        await this._markEventProcessed(PLATFORM, String(platformOrderId), eventType, restaurantId, null);
        break;

      case 5:
      case 6:
      case 7:
        await IntegrationOrderService.cancelFromIntegration(PLATFORM, restaurantId, String(platformOrderId));
        await this._markEventProcessed(PLATFORM, String(platformOrderId), eventType, restaurantId, null);
        break;

      case 8:
        await IntegrationOrderService.updateFromIntegration(PLATFORM, restaurantId, String(platformOrderId), { status: 'COMPLETED' });
        await this._markEventProcessed(PLATFORM, String(platformOrderId), eventType, restaurantId, null);
        break;

      default:
        logger.info(`[FOOD99 WEBHOOK] Evento ${shopAcceptStatus} não requer processamento específico`);
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
