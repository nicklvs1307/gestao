const cron = require('node-cron');
const axios = require('axios');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const IfoodAuthService = require('./IfoodAuthService');
const IfoodOrderService = require('./IfoodOrderService');

class IfoodPollingService {
  constructor() {
    this.pollingJob = null;
    this.isPolling = false;
    this.BASE_URL = 'https://merchant-api.ifood.com.br';
  }

  /**
   * Inicia o cron job de polling de eventos do iFood.
   * Modelo centralizado: polling é fallback quando webhook não está disponível.
   * Roda a cada 30 segundos.
   */
  init() {
    this.pollingJob = cron.schedule('*/30 * * * * *', async () => {
      if (this.isPolling) {
        logger.debug('[IFOOD POLLING] Polling anterior ainda em execução, pulando...');
        return;
      }

      this.isPolling = true;

      try {
        await this.pollEvents();
      } catch (error) {
        logger.error('[IFOOD POLLING] Erro geral no polling:', error.message);
      } finally {
        this.isPolling = false;
      }
    });

    logger.info('[IFOOD POLLING] Serviço de polling iniciado (fallback a cada 30 segundos)');
  }

  /**
   * Para o cron job de polling.
   */
  stop() {
    if (this.pollingJob) {
      this.pollingJob.stop();
      logger.info('[IFOOD POLLING] Serviço de polling parado');
    }
  }

  /**
   * Faz polling de eventos usando token centralizado.
   * Modelo centralizado: usa header x-polling-merchants para filtrar por loja.
   */
  async pollEvents() {
    const token = await IfoodAuthService.getValidToken();

    if (!token) {
      logger.debug('[IFOOD POLLING] Sem token válido, pulando...');
      return;
    }

    try {
      const settings = await prisma.integrationSettings.findMany({
        where: { ifoodIntegrationActive: true }
      });

      if (settings.length === 0) return;

      const merchantIds = settings.map(s => s.ifoodMerchantId).filter(Boolean);

      if (merchantIds.length === 0) {
        logger.debug('[IFOOD POLLING] Nenhum merchant ID configurado');
        return;
      }

      const response = await axios.get(
        `${this.BASE_URL}/events/v1.0/events:polling`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-polling-merchants': merchantIds.join(','),
            'excludeHeartbeat': 'true'
          },
          timeout: 15000
        }
      );

      const events = response.data || [];

      if (events.length === 0) return;

      logger.info(`[IFOOD POLLING] ${events.length} evento(s) recebido(s)`);

      const processedEventIds = [];

      for (const event of events) {
        try {
          await this.processEvent(event, token);
          processedEventIds.push(event.id);
        } catch (error) {
          logger.error(`[IFOOD POLLING] Erro ao processar evento ${event.id}:`, error.message);
          processedEventIds.push(event.id);
        }
      }

      if (processedEventIds.length > 0) {
        await this.acknowledgeEvents(token, processedEventIds);
      }
    } catch (error) {
      if (error.response?.status === 304) {
        return;
      }

      if (error.response?.status === 401) {
        logger.warn('[IFOOD POLLING] Token expirado. Tentando renovar...');
        await IfoodAuthService.getValidToken();
        return;
      }

      if (error.response?.status === 429) {
        logger.warn('[IFOOD POLLING] Rate limit atingido. Aguardando...');
        return;
      }

      logger.error('[IFOOD POLLING] Erro HTTP:', 
        error.response?.status, error.response?.data || error.message);
    }
  }

  /**
   * Processa um evento individual do iFood.
   */
  async processEvent(event, token) {
    const { code, orderId, id: eventId, merchantId } = event;

    logger.info(`[IFOOD POLLING] Processando evento ${code} (${eventId}) para pedido ${orderId}`);

    const settings = await prisma.integrationSettings.findMany({
      where: { ifoodIntegrationActive: true }
    });

    const setting = merchantId 
      ? settings.find(s => s.ifoodMerchantId === merchantId)
      : settings[0];

    const restaurantId = setting?.restaurantId;

    if (!restaurantId) {
      logger.warn(`[IFOOD POLLING] Restaurant não encontrado para merchant ${merchantId}`);
      return;
    }

    switch (code) {
      case 'PLACED':
      case 'PLC':
      case 'CONFIRMED': {
        const orderDetails = await this.getOrderDetails(orderId, token);
        if (orderDetails) {
          await IfoodOrderService.createOrderFromIfood(restaurantId, orderId, orderDetails);
        }
        break;
      }

      case 'CANCELLED':
      case 'CAN':
      case 'CANCELLATION_REQUEST_FAILED':
        await IfoodOrderService.cancelOrderFromIfood(restaurantId, orderId);
        break;

      case 'ORDER_PATCHED': {
        const updatedDetails = await this.getOrderDetails(orderId, token);
        if (updatedDetails) {
          await IfoodOrderService.updateOrderFromIfood(restaurantId, orderId, updatedDetails);
        }
        break;
      }

      case 'READY_TO_PICKUP':
        await this.updateLocalOrderStatus(restaurantId, orderId, 'READY');
        break;

      case 'DISPATCHED':
        await this.updateLocalOrderStatus(restaurantId, orderId, 'DELIVERING');
        break;

      case 'CONCLUDED':
        await this.updateLocalOrderStatus(restaurantId, orderId, 'COMPLETED');
        break;

      case 'CANCELLATION_REQUESTED':
        await this.handleCancellationRequest(restaurantId, orderId, event);
        break;

      default:
        logger.info(`[IFOOD POLLING] Evento ${code} não requer processamento`);
    }
  }

  async getOrderDetails(orderId, token) {
    try {
      const response = await axios.get(
        `${this.BASE_URL}/order/v1.0/orders/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      return response.data;
    } catch (error) {
      logger.error(`[IFOOD POLLING] Erro ao buscar detalhes do pedido ${orderId}:`, 
        error.response?.status, error.response?.data || error.message);
      return null;
    }
  }

  async acknowledgeEvents(token, eventIds) {
    try {
      await axios.post(
        `${this.BASE_URL}/events/v1.0/events/acknowledgment`,
        eventIds.map(id => ({ id })),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      logger.info(`[IFOOD POLLING] ${eventIds.length} evento(s) confirmado(s)`);
    } catch (error) {
      logger.error('[IFOOD POLLING] Erro ao enviar acknowledgment:', 
        error.response?.status, error.response?.data || error.message);
    }
  }

  async updateLocalOrderStatus(restaurantId, ifoodOrderId, newStatus) {
    try {
      const order = await prisma.order.findFirst({
        where: { restaurantId, ifoodOrderId }
      });

      if (!order) {
        logger.warn(`[IFOOD POLLING] Pedido ${ifoodOrderId} não encontrado localmente`);
        return;
      }

      const statusUpdateData = { status: newStatus };

      if (newStatus === 'READY') statusUpdateData.readyAt = new Date();
      if (newStatus === 'COMPLETED') statusUpdateData.completedAt = new Date();

      await prisma.order.update({
        where: { id: order.id },
        data: statusUpdateData
      });

      const socketLib = require('../lib/socket');
      socketLib.emitToRestaurant(restaurantId, 'order_updated', {
        orderId: order.id,
        status: newStatus,
        source: 'IFOOD'
      });

      logger.info(`[IFOOD POLLING] Pedido ${order.id} atualizado para ${newStatus}`);
    } catch (error) {
      logger.error(`[IFOOD POLLING] Erro ao atualizar status:`, error.message);
    }
  }

  async handleCancellationRequest(restaurantId, ifoodOrderId, event) {
    try {
      const order = await prisma.order.findFirst({
        where: { restaurantId, ifoodOrderId }
      });

      if (!order) return;

      const socketLib = require('../lib/socket');
      socketLib.emitToRestaurant(restaurantId, 'ifood_cancellation_requested', {
        orderId: order.id,
        ifoodOrderId,
        reason: event.metadata?.cancelCodeId || 'Motivo não informado',
        source: 'IFOOD'
      });

      logger.info(`[IFOOD POLLING] Solicitação de cancelamento para pedido ${order.id}`);
    } catch (error) {
      logger.error(`[IFOOD POLLING] Erro ao processar cancelamento:`, error.message);
    }
  }
}

module.exports = new IfoodPollingService();