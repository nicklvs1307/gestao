const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const UairangoOrderService = require('./UairangoOrderService');
const UairangoOrderAdapter = require('./UairangoOrderAdapter');
const IntegrationOrderService = require('./IntegrationOrderService');
const IntegrationTypeService = require('./IntegrationTypeService');
const socketLib = require('../lib/socket');
const api = require('./UairangoApiClient');

class UairangoWebhookService {
  constructor() {
    this._processingQueue = [];
    this._isProcessing = false;
    this.adapter = UairangoOrderAdapter;
    this._pendingAcks = new Map();
  }

  async handleWebhook(req, res) {
    res.status(202).json({ received: true });

    const events = Array.isArray(req.body) ? req.body : [req.body];

    logger.info(`[UAIRANGO WEBHOOK] Recebido ${events.length} evento(s)`);

    for (const event of events) {
      const { orderId, code, id: eventId } = event;

      if (orderId && code) {
        const eventType = code === 'PLC' || code === 'PLACED' ? 'ORDER_PLACED' : code;
        const alreadyProcessed = await this._isEventProcessed('uairango', orderId, eventType);
        if (alreadyProcessed) {
          logger.info(`[UAIRANGO WEBHOOK] Evento ${orderId} (${code}) já processado, ignorando`);
          continue;
        }
      }

      this._processingQueue.push(event);
    }

    this._processQueue();
  }

  async _processQueue() {
    if (this._isProcessing) return;

    this._isProcessing = true;

    try {
      while (this._processingQueue.length > 0) {
        const event = this._processingQueue.shift();
        try {
          const { merchantId } = event;

          if (!merchantId) {
            logger.warn(`[UAIRANGO WEBHOOK] Evento sem merchantId:`, event.id);
            continue;
          }

          const settings = await prisma.integrationSettings.findFirst({
            where: { uairangoEstablishmentId: merchantId }
          });

          if (!settings) {
            logger.warn(`[UAIRANGO WEBHOOK] MerchantId ${merchantId} não encontrado`);
            continue;
          }

          await this.processEvent(event, settings.restaurantId);
        } catch (error) {
          logger.error(`[UAIRANGO WEBHOOK] Erro ao processar evento:`, error.message);
        }
      }
    } finally {
      this._isProcessing = false;
      await this._flushAcks();
    }
  }

  async processEvent(event, restaurantId) {
    const { code, orderId: platformOrderId, id: eventId } = event;

    if (!platformOrderId || !code) {
      logger.warn(`[UAIRANGO WEBHOOK] Evento inválido:`, event);
      return;
    }

    logger.info(`[UAIRANGO WEBHOOK] Processando evento ${code} (${eventId}) para pedido ${platformOrderId}`);

    switch (code) {
      case 'PLC':
      case 'PLACED': {
        const existingEvent = await prisma.integrationEvent.findUnique({
          where: {
            platform_platformOrderId_eventType: {
              platform: 'uairango',
              platformOrderId,
              eventType: 'ORDER_PLACED',
            },
          },
        });
        if (existingEvent?.status === 'PROCESSED') {
          logger.info(`[UAIRANGO WEBHOOK] Pedido ${platformOrderId} já processado, ignorando`);
          return;
        }

        const fullOrderData = await UairangoOrderService.getOrderDetails(restaurantId, platformOrderId);
        if (fullOrderData) {
          const order = await UairangoOrderAdapter.processNewOrder(restaurantId, fullOrderData);
          await this._markEventProcessed('uairango', platformOrderId, 'ORDER_PLACED', restaurantId, order?.id);
          logger.info(`[UAIRANGO WEBHOOK] Pedido ${platformOrderId} criado com sucesso`);
        }
        break;
      }

      case 'CAN':
      case 'CANCELLED': {
        const result = await IntegrationOrderService.cancelFromIntegration('uairango', restaurantId, platformOrderId);
        await this._markEventProcessed('uairango', platformOrderId, code, restaurantId, result?.id);
        logger.info(`[UAIRANGO WEBHOOK] Pedido ${platformOrderId} cancelado`);
        break;
      }

      case 'CFM':
      case 'CONFIRMED':
      case 'SPE': {
        await this._updateLocalOrderStatus(restaurantId, platformOrderId, 'PREPARING');
        await this._markEventProcessed('uairango', platformOrderId, code, restaurantId, null);
        break;
      }

      case 'RTP':
      case 'READY_TO_PICKUP': {
        await this._updateLocalOrderStatus(restaurantId, platformOrderId, 'READY');
        await this._markEventProcessed('uairango', platformOrderId, code, restaurantId, null);
        break;
      }

      case 'DSP':
      case 'DISPATCHED': {
        await this._updateLocalOrderStatus(restaurantId, platformOrderId, 'SHIPPED');
        await this._markEventProcessed('uairango', platformOrderId, code, restaurantId, null);
        break;
      }

      default: {
        const newStatus = IntegrationTypeService.mapStatus('uairango', code);
        if (newStatus !== 'PENDING') {
          await this._updateLocalOrderStatus(restaurantId, platformOrderId, newStatus);
        } else {
          logger.info(`[UAIRANGO WEBHOOK] Evento ${code} não mapeado, ignorando`);
        }
        await this._markEventProcessed('uairango', platformOrderId, code, restaurantId, null);
      }
    }

    if (eventId) {
      const acks = this._pendingAcks.get(restaurantId) || [];
      acks.push(eventId);
      this._pendingAcks.set(restaurantId, acks);
    }
  }

  async _updateLocalOrderStatus(restaurantId, uairangoOrderId, newStatus) {
    try {
      const order = await prisma.order.findFirst({
        where: { restaurantId, uairangoOrderId }
      });

      if (!order) {
        logger.warn(`[UAIRANGO WEBHOOK] Pedido ${uairangoOrderId} não encontrado localmente`);
        return null;
      }

      const updateData = { status: newStatus };
      if (newStatus === 'READY') updateData.readyAt = new Date();
      if (newStatus === 'COMPLETED' || newStatus === 'DELIVERED') updateData.completedAt = new Date();
      if (newStatus === 'CANCELED') updateData.canceledAt = new Date();

      await prisma.order.update({
        where: { id: order.id },
        data: updateData
      });

      socketLib.emitToRestaurant(restaurantId, 'order_updated', {
        orderId: order.id,
        status: newStatus,
        source: 'UAIRANGO'
      });

      logger.info(`[UAIRANGO WEBHOOK] Pedido ${order.id} atualizado para ${newStatus}`);
      return order;
    } catch (error) {
      logger.error(`[UAIRANGO WEBHOOK] Erro ao atualizar status do pedido ${uairangoOrderId}:`, error.message);
      return null;
    }
  }

  async _isEventProcessed(platform, platformOrderId, eventType) {
    try {
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
    } catch {
      return false;
    }
  }

  async _markEventProcessed(platform, platformOrderId, eventType, restaurantId, orderId) {
    try {
      await IntegrationOrderService.registerEvent(
        platform,
        platformOrderId,
        eventType,
        restaurantId,
        orderId,
        'PROCESSED'
      );
    } catch (error) {
      logger.error(`[UAIRANGO WEBHOOK] Erro ao registrar evento:`, error.message);
    }
  }

  async _flushAcks() {
    if (this._pendingAcks.size === 0) return;

    for (const [restaurantId, eventIds] of this._pendingAcks.entries()) {
      try {
        await api.post(restaurantId, '/events/v1.0/events/acknowledgment',
          eventIds.map(id => ({ id })),
          { timeout: 10000 }
        );
        logger.info(`[UAIRANGO WEBHOOK] ${eventIds.length} evento(s) confirmados via acknowledgment`);
      } catch (error) {
        logger.error(`[UAIRANGO WEBHOOK] Erro no acknowledgment:`, error.message);
      }
    }

    this._pendingAcks.clear();
  }
}

const uairangoWebhookService = new UairangoWebhookService();
module.exports = uairangoWebhookService;
module.exports.UairangoWebhookService = UairangoWebhookService;
