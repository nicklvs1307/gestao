const cron = require('node-cron');
const axios = require('axios');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const UairangoAuthService = require('./UairangoAuthService');
const IntegrationOrderService = require('./IntegrationOrderService');
const IntegrationTypeService = require('./IntegrationTypeService');

class UairangoPollingService {
  constructor() {
    this.pollingJob = null;
    this.isPolling = false;
    this.BASE_URL = 'https://www.uairango.com/api2';
  }

  /**
   * Obtém token válido via OAuth 2.0
   */
  async getAccessToken(restaurantId) {
    return await UairangoAuthService.getAccessToken(restaurantId);
  }

  /**
   * Inicia o cron job de polling de eventos do Uai Rangô.
   * ATENÇÃO: Webhook é PRIORITÁRIO. Polling é FALLBACK.
   * Roda a cada 30 segundos.
   */
  init() {
    this.pollingJob = cron.schedule('*/30 * * * * *', async () => {
      if (this.isPolling) {
        logger.debug('[UAIRANGO POLLING] Polling anterior ainda em execução, pulando...');
        return;
      }

      this.isPolling = true;

      try {
        await this.pollEvents();
      } catch (error) {
        logger.error('[UAIRANGO POLLING] Erro geral no polling:', error.message);
      } finally {
        this.isPolling = false;
      }
    });

    logger.info('[UAIRANGO POLLING] Serviço de polling iniciado (FALLBACK - Webhook é prioritário)');
  }

  /**
   * Para o cron job de polling.
   */
  stop() {
    if (this.pollingJob) {
      this.pollingJob.stop();
      logger.info('[UAIRANGO POLLING] Serviço de polling parado');
    }
  }

  /**
   * Faz polling de eventos para todos os restaurantes com integração Uai Rangô ativa.
   * Usa a Events API: /events/v1.0/events:polling
   */
  async pollEvents() {
    const settings = await prisma.integrationSettings.findMany({
      where: { uairangoActive: true }
    });

    if (settings.length === 0) return;

    for (const setting of settings) {
      try {
        await this.pollRestaurantEvents(setting);
      } catch (error) {
        logger.error(`[UAIRANGO POLLING] Erro ao processar ${setting.restaurantId}:`, error.message);
      }
    }
  }

  /**
   * Faz polling de eventos para um restaurante específico.
   */
  async pollRestaurantEvents(setting) {
    const token = await this.getAccessToken(setting.restaurantId);
    if (!token) return;

    try {
      // Busca eventos via Events API
      const response = await axios.get(
        `${this.BASE_URL}/events/v1.0/events:polling`,
        {
          params: {
            types: 'PLC,CFM,RTP,DSP,CAN',
            groups: 'ORDER_STATUS'
          },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const events = Array.isArray(response.data) ? response.data : [];

      if (events.length === 0) {
        logger.debug(`[UAIRANGO POLLING] Nenhum evento novo para ${setting.restaurantId}`);
        return;
      }

      logger.info(`[UAIRANGO POLLING] ${events.length} evento(s) recebido(s) para ${setting.restaurantId}`);

      // Processa eventos
      const eventIds = [];
      for (const event of events) {
        try {
          await this._processEvent(event, setting.restaurantId);
          eventIds.push(event.id);
        } catch (error) {
          logger.error(`[UAIRANGO POLLING] Erro ao processar evento ${event.id}:`, error.message);
        }
      }

      // Acknowlegment obrigatório (para não receber os mesmos eventos novamente)
      if (eventIds.length > 0) {
        await this._acknowledgeEvents(token, eventIds);
      }
    } catch (error) {
      if (error.response?.status === 204) {
        logger.debug(`[UAIRANGO POLLING] Nenhum evento novo (204)`);
        return;
      }
      logger.error(`[UAIRANGO POLLING] Erro ao buscar eventos:`, error.message);
    }
  }

  /**
   * Processa um evento individual
   */
  async _processEvent(event, restaurantId) {
    const { id: eventId, code, orderId: platformOrderId, merchantId } = event;

    if (!platformOrderId || !code) {
      logger.warn(`[UAIRANGO POLLING] Evento inválido:`, event);
      return;
    }

    // Se for evento de pedido novo (PLC)
    if (code === 'PLC' || code === 'PLACED') {
      const fullOrderData = await this._fetchOrderDetails(restaurantId, platformOrderId);
      if (fullOrderData) {
        await IntegrationOrderService.createFromIntegration(
          'uairango',
          restaurantId,
          platformOrderId,
          fullOrderData
        );
      }
    } else {
      // Outros eventos: mapear e atualizar status
      const newStatus = IntegrationTypeService.mapStatus('uairango', code);
      await IntegrationOrderService.updateFromIntegration(
        'uairango',
        restaurantId,
        platformOrderId,
        { status: newStatus }
      );
    }

    logger.info(`[UAIRANGO POLLING] Evento ${eventId} (${code}) processado`);
  }

  /**
   * Acknowlegment de eventos (obrigatório)
   */
  async _acknowledgeEvents(token, eventIds) {
    try {
      await axios.post(
        `${this.BASE_URL}/events/v1.0/events/acknowledgment`,
        { ids: eventIds },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      logger.info(`[UAIRANGO POLLING] ${eventIds.length} evento(s) confirmado(s) via acknowledgment`);
    } catch (error) {
      logger.error(`[UAIRANGO POLLING] Erro no acknowledgment:`, error.message);
    }
  }

  /**
   * Busca detalhes do pedido via API
   */
  async _fetchOrderDetails(restaurantId, orderId) {
    const token = await this.getAccessToken(restaurantId);
    if (!token) return null;

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
      logger.error(`[UAIRANGO POLLING] Erro ao buscar pedido ${orderId}:`, error.message);
      return null;
    }
  }
}

module.exports = new UairangoPollingService();