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
   * Roda a cada 30 segundos para todos os restaurantes com integração ativa.
   */
  init() {
    this.pollingJob = cron.schedule('*/30 * * * * *', async () => {
      if (this.isPolling) {
        logger.debug('[IFOOD POLLING] Polling anterior ainda em execução, pulando...');
        return;
      }

      this.isPolling = true;

      try {
        await this.pollAllRestaurants();
      } catch (error) {
        logger.error('[IFOOD POLLING] Erro geral no polling:', error.message);
      } finally {
        this.isPolling = false;
      }
    });

    logger.info('[IFOOD POLLING] Serviço de polling iniciado (a cada 30 segundos)');
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
   * Faz polling de eventos para todos os restaurantes com integração iFood ativa.
   */
  async pollAllRestaurants() {
    const settings = await prisma.integrationSettings.findMany({
      where: { ifoodIntegrationActive: true }
    });

    if (settings.length === 0) return;

    for (const setting of settings) {
      try {
        await this.pollRestaurant(setting.restaurantId);
      } catch (error) {
        logger.error(`[IFOOD POLLING] Erro ao processar restaurante ${setting.restaurantId}:`, error.message);
      }
    }
  }

  /**
   * Faz polling de eventos para um restaurante específico.
   */
  async pollRestaurant(restaurantId) {
    const token = await IfoodAuthService.getValidToken(restaurantId);

    if (!token) {
      logger.debug(`[IFOOD POLLING] Sem token válido para restaurante ${restaurantId}`);
      return;
    }

    try {
      const response = await axios.get(
        `${this.BASE_URL}/order/v1.0/events:polling`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const events = response.data || [];

      if (events.length === 0) return;

      logger.info(`[IFOOD POLLING] ${events.length} evento(s) recebido(s) para restaurante ${restaurantId}`);

      const processedEventIds = [];

      for (const event of events) {
        try {
          await this.processEvent(restaurantId, event, token);
          processedEventIds.push(event.id);
        } catch (error) {
          logger.error(`[IFOOD POLLING] Erro ao processar evento ${event.id}:`, error.message);
          // Mesmo com erro, faz acknowledgment para nao reprocessar infinitamente
          processedEventIds.push(event.id);
        }
      }

      // Acknowledgment dos eventos processados
      if (processedEventIds.length > 0) {
        await this.acknowledgeEvents(token, processedEventIds);
      }
    } catch (error) {
      if (error.response?.status === 304) {
        // 304 = Nenhum evento novo (Not Modified) -- comportamento normal
        return;
      }

      if (error.response?.status === 401) {
        logger.warn(`[IFOOD POLLING] Token expirado para restaurante ${restaurantId}. Tentando renovar...`);
        await IfoodAuthService.refreshAccessToken(restaurantId);
        return;
      }

      if (error.response?.status === 429) {
        logger.warn(`[IFOOD POLLING] Rate limit atingido para restaurante ${restaurantId}. Aguardando...`);
        return;
      }

      logger.error(`[IFOOD POLLING] Erro HTTP ao fazer polling para ${restaurantId}:`, 
        error.response?.status, error.response?.data || error.message);
    }
  }

  /**
   * Processa um evento individual do iFood.
   * Eventos de pedido (PLACED, CONFIRMED) buscam detalhes completos antes de criar.
   */
  async processEvent(restaurantId, event, token) {
    const { code, orderId, id: eventId } = event;

    logger.info(`[IFOOD POLLING] Processando evento ${code} (${eventId}) para pedido ${orderId}`);

    switch (code) {
      case 'PLACED':
      case 'CONFIRMED': {
        // Buscar detalhes completos do pedido na API do iFood
        const orderDetails = await this.getOrderDetails(orderId, token);
        if (orderDetails) {
          await IfoodOrderService.createOrderFromIfood(restaurantId, orderId, orderDetails);
        }
        break;
      }

      case 'CANCELLED':
      case 'CANCELLATION_REQUEST_FAILED':
        await IfoodOrderService.cancelOrderFromIfood(restaurantId, orderId);
        break;

      case 'ORDER_PATCHED':
        // Buscar detalhes atualizados
        const updatedDetails = await this.getOrderDetails(orderId, token);
        if (updatedDetails) {
          await IfoodOrderService.updateOrderFromIfood(restaurantId, orderId, updatedDetails);
        }
        break;

      // Eventos de status que atualizam o pedido localmente
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

  /**
   * Busca detalhes completos de um pedido na API do iFood.
   */
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

  /**
   * Envia acknowledgment dos eventos processados para o iFood.
   * Isso sinaliza ao iFood que os eventos foram recebidos e processados.
   */
  async acknowledgeEvents(token, eventIds) {
    try {
      await axios.post(
        `${this.BASE_URL}/order/v1.0/events/acknowledgment`,
        eventIds.map(id => ({ id })),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      logger.info(`[IFOOD POLLING] ${eventIds.length} evento(s) confirmado(s) (ack)`);
    } catch (error) {
      logger.error('[IFOOD POLLING] Erro ao enviar acknowledgment:', 
        error.response?.status, error.response?.data || error.message);
    }
  }

  /**
   * Atualiza o status local de um pedido baseado em evento do iFood.
   */
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

      // Adicionar timestamps específicos
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

      logger.info(`[IFOOD POLLING] Pedido ${order.id} atualizado para ${newStatus} via iFood`);
    } catch (error) {
      logger.error(`[IFOOD POLLING] Erro ao atualizar status do pedido ${ifoodOrderId}:`, error.message);
    }
  }

  /**
   * Lida com pedidos de cancelamento vindo do consumidor/iFood.
   */
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

      logger.info(`[IFOOD POLLING] Solicitação de cancelamento recebida para pedido ${order.id}`);
    } catch (error) {
      logger.error(`[IFOOD POLLING] Erro ao processar solicitação de cancelamento:`, error.message);
    }
  }
}

module.exports = new IfoodPollingService();
