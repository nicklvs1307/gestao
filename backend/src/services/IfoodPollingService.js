const cron = require('node-cron');
const axios = require('axios');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const IfoodAuthService = require('./IfoodAuthService');
const IfoodOrderAdapter = require('./IfoodOrderAdapter');
const IntegrationOrderService = require('./IntegrationOrderService');

class IfoodPollingService {
  constructor() {
    this.pollingJob = null;
    this.isPolling = false;
    this.BASE_URL = 'https://merchant-api.ifood.com.br';
  }

/**
    * Inicia o cron job de polling de eventos do iFood.
    * Polling é apenas FALLBACK - webhook é o primário.
    * Verifica via IntegrationEvent se webhook já processou antes de agir.
    */
  init() {
    logger.info('[IFOOD POLLING] Modo FALLBACK ativado - apenas backup do webhook');

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
          logger.error(`[IFOOD POLLING] Stack trace:`, error.stack);
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
   * Verifica via IntegrationEvent se o webhook já processou antes de agir.
   */
  async processEvent(event, token) {
    const { code, orderId, id: eventId, merchantId } = event;
    const platform = 'ifood';

    // Deduplicação: verificar se webhook já processou este evento
    if (orderId) {
      const alreadyProcessed = await prisma.integrationEvent.findUnique({
        where: {
          platform_platformOrderId_eventType: {
            platform,
            platformOrderId: orderId,
            eventType: code
          }
        }
      });
      if (alreadyProcessed?.status === 'PROCESSED') {
        logger.debug(`[IFOOD POLLING] Evento ${code} para ${orderId} já processado pelo webhook, ignorando`);
        return;
      }
    }

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
          // Usa o mesmo adapter do webhook → OrderService.createOrderFromIntegration()
          const order = await IfoodOrderAdapter.processNewOrder(restaurantId, orderDetails);
          await this._markEventProcessed(platform, orderId, code, restaurantId, order?.id);
        }
        break;
      }

      case 'CANCELLED':
      case 'CAN':
        try {
          logger.info(`[IFOOD POLLING] Evento CAN recebido para pedido iFood ${orderId}, buscando pedido local...`);
          const result = await IntegrationOrderService.cancelFromIntegration('ifood', restaurantId, orderId);
          if (result) {
            logger.info(`[IFOOD POLLING] Pedido ${result.id} cancelado com sucesso via evento CAN`);
          } else {
            logger.warn(`[IFOOD POLLING] Pedido não encontrado ou já cancelado para evento CAN ${orderId}`);
          }
        } catch (error) {
          logger.error(`[IFOOD POLLING] Erro ao processar cancelamento CAN: ${error.message}`, error.stack);
        }
        await this._markEventProcessed(platform, orderId, code, restaurantId, null);
        break;

      case 'CANCELLATION_REQUEST_FAILED':
        await this.clearCancellationRequest(restaurantId, orderId);
        await this._markEventProcessed(platform, orderId, code, restaurantId, null);
        break;

      case 'ORDER_PATCHED': {
        const updatedDetails = await this.getOrderDetails(orderId, token);
        if (updatedDetails) {
          await IntegrationOrderService.updateFromIntegration('ifood', restaurantId, orderId, updatedDetails);
        }
        await this._markEventProcessed(platform, orderId, code, restaurantId, null);
        break;
      }

      case 'READY_TO_PICKUP':
        await this.updateLocalOrderStatus(restaurantId, orderId, 'READY');
        await this._markEventProcessed(platform, orderId, code, restaurantId, null);
        break;

      case 'DISPATCHED':
        await this.updateLocalOrderStatus(restaurantId, orderId, 'SHIPPED');
        await this._markEventProcessed(platform, orderId, code, restaurantId, null);
        break;

      case 'CONCLUDED':
        await this.updateLocalOrderStatus(restaurantId, orderId, 'COMPLETED');
        await this._markEventProcessed(platform, orderId, code, restaurantId, null);
        break;

      case 'CANCELLATION_REQUESTED':
        await this.handleCancellationRequest(restaurantId, orderId, event);
        await this._markEventProcessed(platform, orderId, code, restaurantId, null);
        break;

      case 'HANDSHAKE_DISPUTE':
        await this.handleDisputeRequest(restaurantId, orderId, event);
        await this._markEventProcessed(platform, orderId, code, restaurantId, null);
        break;

      case 'HANDSHAKE_SETTLEMENT':
        await this.handleDisputeSettlement(restaurantId, orderId, event);
        await this._markEventProcessed(platform, orderId, code, restaurantId, null);
        break;

      default:
        logger.info(`[IFOOD POLLING] Evento ${code} não requer processamento`);
    }
  }

  /**
   * Registra evento como processado no banco para deduplicação com webhook.
   */
  async _markEventProcessed(platform, platformOrderId, eventType, restaurantId, orderId) {
    await IntegrationOrderService.registerEvent(
      platform,
      platformOrderId,
      eventType,
      restaurantId,
      orderId,
      'PROCESSED'
    );
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
      logger.info(`[IFOOD POLLING] Raw API response for order ${orderId}: ${JSON.stringify(response.data)}`);

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

      const deadline = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

      await prisma.order.update({
        where: { id: order.id },
        data: {
          cancellationRequested: true,
          cancellationReason: event.metadata?.reason || event.metadata?.cancelCodeId || 'Motivo não informado',
          cancellationDeadline: deadline,
          cancellationSource: 'CUSTOMER'
        }
      });

      const socketLib = require('../lib/socket');
      socketLib.emitToRestaurant(restaurantId, 'ifood_cancellation_requested', {
        orderId: order.id,
        ifoodOrderId,
        reason: event.metadata?.cancelCodeId || 'Motivo não informado',
        deadline: deadline.toISOString(),
        source: 'IFOOD'
      });

      logger.info(`[IFOOD POLLING] Solicitação de cancelamento para pedido ${order.id}`);
    } catch (error) {
      logger.error(`[IFOOD POLLING] Erro ao processar cancelamento:`, error.message);
    }
  }

  async clearCancellationRequest(restaurantId, ifoodOrderId) {
    try {
      const order = await prisma.order.findFirst({
        where: { restaurantId, ifoodOrderId }
      });

      if (!order) return;

      await prisma.order.update({
        where: { id: order.id },
        data: {
          cancellationRequested: false,
          cancellationReason: order.cancellationSource === 'MERCHANT'
            ? 'Cancelamento solicitado pelo restaurante foi rejeitado pelo iFood'
            : 'Cancelamento rejeitado pelo sistema',
          cancellationDeadline: null,
          cancellationSource: null
        }
      });

      const socketLib = require('../lib/socket');
      socketLib.emitToRestaurant(restaurantId, 'ifood_cancellation_failed', {
        orderId: order.id,
        ifoodOrderId,
        message: 'O cancelamento foi rejeitado. O pedido continua ativo.',
        source: 'IFOOD'
      });

      logger.info(`[IFOOD POLLING] Cancelamento rejeitado para pedido ${order.id}`);
    } catch (error) {
      logger.error(`[IFOOD POLLING] Erro ao limpar solicitação de cancelamento:`, error.message);
    }
  }

  async handleDisputeRequest(restaurantId, ifoodOrderId, event) {
    try {
      const order = await prisma.order.findFirst({
        where: { restaurantId, ifoodOrderId }
      });

      if (!order) return;

      const disputeId = event.metadata?.disputeId || event.id;
      const expiresAt = event.metadata?.expiresAt ? new Date(event.metadata.expiresAt) : new Date(Date.now() + 5 * 60 * 1000);

      await prisma.order.update({
        where: { id: order.id },
        data: {
          disputeId,
          disputeExpiresAt: expiresAt,
          disputeReason: event.metadata?.reason || 'Disputa pós-entrega',
          disputeEvidence: event.metadata?.evidence || null
        }
      });

      const socketLib = require('../lib/socket');
      socketLib.emitToRestaurant(restaurantId, 'ifood_dispute_opened', {
        orderId: order.id,
        ifoodOrderId,
        disputeId,
        reason: event.metadata?.reason,
        expiresAt: expiresAt.toISOString(),
        evidence: event.metadata?.evidence,
        source: 'IFOOD'
      });

      logger.info(`[IFOOD POLLING] Disputa aberta para pedido ${order.id}`);
    } catch (error) {
      logger.error(`[IFOOD POLLING] Erro ao processar disputa:`, error.message);
    }
  }

  async handleDisputeSettlement(restaurantId, ifoodOrderId, event) {
    try {
      const order = await prisma.order.findFirst({
        where: { restaurantId, ifoodOrderId }
      });

      if (!order) return;

      const settlement = event.metadata?.settlement || event.metadata?.result;

      await prisma.order.update({
        where: { id: order.id },
        data: {
          disputeId: null,
          disputeExpiresAt: null,
          disputeReason: null,
          disputeEvidence: null,
          ...(settlement === 'ACCEPTED' && {
            status: 'CANCELED',
            canceledAt: new Date()
          })
        }
      });

      const socketLib = require('../lib/socket');
      socketLib.emitToRestaurant(restaurantId, 'ifood_dispute_settled', {
        orderId: order.id,
        ifoodOrderId,
        settlement,
        source: 'IFOOD'
      });

      logger.info(`[IFOOD POLLING] Disputa resolvida para pedido ${order.id}: ${settlement}`);
    } catch (error) {
      logger.error(`[IFOOD POLLING] Erro ao processar resolução de disputa:`, error.message);
    }
  }
}

module.exports = new IfoodPollingService();