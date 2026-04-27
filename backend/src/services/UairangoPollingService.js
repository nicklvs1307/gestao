const cron = require('node-cron');
const axios = require('axios');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const UairangoOrderService = require('./UairangoOrderService');

class UairangoPollingService {
  constructor() {
    this.pollingJob = null;
    this.isPolling = false;
    this.BASE_URL = 'https://www.uairango.com/api2';
  }

  /**
   * Obtém o token de acesso válido para o restaurante.
   */
  async getAccessToken(restaurantId) {
    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId }
    });

    if (!settings?.uairangoActive || !settings?.uairangoToken) {
      return null;
    }

    try {
      const response = await axios.post(`${this.BASE_URL}/login`, {
        token: settings.uairangoToken
      });

      if (response.data && response.data.success && response.data.token) {
        return response.data.token;
      }
      return null;
    } catch (error) {
      logger.error(`[UAIRANGO POLLING] Erro ao obter token para restaurante ${restaurantId}:`, error.message);
      return null;
    }
  }

  /**
   * Inicia o cron job de polling de pedidos do Uai Rangô.
   * Roda a cada 30 segundos para todos os restaurantes com integração ativa.
   */
  init() {
    this.pollingJob = cron.schedule('*/30 * * * * *', async () => {
      if (this.isPolling) {
        logger.debug('[UAIRANGO POLLING] Polling anterior ainda em execução, pulando...');
        return;
      }

      this.isPolling = true;

      try {
        await this.pollAllRestaurants();
      } catch (error) {
        logger.error('[UAIRANGO POLLING] Erro geral no polling:', error.message);
      } finally {
        this.isPolling = false;
      }
    });

    logger.info('[UAIRANGO POLLING] Serviço de polling iniciado (a cada 30 segundos)');
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
   * Faz polling de pedidos para todos os restaurantes com integração Uai Rangô ativa.
   */
  async pollAllRestaurants() {
    const settings = await prisma.integrationSettings.findMany({
      where: { uairangoActive: true }
    });

    if (settings.length === 0) return;

    for (const setting of settings) {
      try {
        await this.pollRestaurant(setting.restaurantId);
      } catch (error) {
        logger.error(`[UAIRANGO POLLING] Erro ao processar restaurante ${setting.restaurantId}:`, error.message);
      }
    }
  }

  /**
   * Faz polling de pedidos pendentes para um restaurante específico.
   */
  async pollRestaurant(restaurantId) {
    const token = await this.getAccessToken(restaurantId);

    if (!token) {
      logger.debug(`[UAIRANGO POLLING] Sem token válido para restaurante ${restaurantId}`);
      return;
    }

    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId }
    });

    if (!settings?.uairangoEstablishmentId) {
      logger.warn(`[UAIRANGO POLLING] ID do estabelecimento não configurado para restaurante ${restaurantId}`);
      return;
    }

    try {
      const response = await axios.get(
        `${this.BASE_URL}/auth/pedidos/${settings.uairangoEstablishmentId}`,
        {
          params: {
            skip: 0,
            status: 0,
            limit: 50
          },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const orders = Array.isArray(response.data) ? response.data : [];

      if (orders.length === 0) return;

      logger.info(`[UAIRANGO POLLING] ${orders.length} pedido(s) pendente(s) encontrado(s) para restaurante ${restaurantId}`);

      for (const order of orders) {
        try {
          await this.processOrder(restaurantId, order);
        } catch (error) {
          logger.error(`[UAIRANGO POLLING] Erro ao processar pedido ${order.cod_pedido}:`, error.message);
        }
      }
    } catch (error) {
      logger.error(`[UAIRANGO POLLING] Erro ao buscar pedidos para restaurante ${restaurantId}:`, error.message);
    }
  }

  /**
   * Processa um pedido pendente - cria no sistema se não existir.
   */
  async processOrder(restaurantId, orderData) {
    const uairangoOrderId = orderData.cod_pedido;

    const existingOrder = await prisma.order.findFirst({
      where: {
        restaurantId,
        uairangoOrderId
      }
    });

    if (existingOrder) {
      logger.debug(`[UAIRANGO POLLING] Pedido ${uairangoOrderId} já existe no sistema`);
      return;
    }

    const fullOrderData = await this.getOrderDetails(restaurantId, uairangoOrderId);
    
    if (!fullOrderData) {
      logger.error(`[UAIRANGO POLLING] Não foi possível obter detalhes do pedido ${uairangoOrderId}`);
      return;
    }

    await UairangoOrderService.createOrderFromUairango(restaurantId, uairangoOrderId, fullOrderData);
  }

  /**
   * Obtém os detalhes completos de um pedido.
   */
  async getOrderDetails(restaurantId, orderId) {
    const token = await this.getAccessToken(restaurantId);

    if (!token) return null;

    try {
      const response = await axios.get(
        `${this.BASE_URL}/auth/pedido/${orderId}`,
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
      logger.error(`[UAIRANGO POLLING] Erro ao obter detalhes do pedido ${orderId}:`, error.message);
      return null;
    }
  }
}

module.exports = new UairangoPollingService();