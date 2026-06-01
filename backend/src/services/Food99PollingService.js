const cron = require('node-cron');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const Food99AuthService = require('./Food99AuthService');
const Food99OrderAdapter = require('./Food99OrderAdapter');
const IntegrationOrderService = require('./IntegrationOrderService');
const IntegrationTypeService = require('./IntegrationTypeService');
const { requestWithRetry } = require('../lib/food99Client');

class Food99PollingService {
  constructor() {
    this.pollingJob = null;
    this.isPolling = false;
    this._enabled = process.env.FOOD99_POLLING_ENABLED === 'true';
  }

  isEnabled() {
    return this._enabled;
  }

  init() {
    if (!this._enabled) {
      logger.info('[FOOD99 POLLING] Polling desabilitado por FOOD99_POLLING_ENABLED. Webhook é a única fonte de pedidos.');
      return;
    }

    logger.info('[FOOD99 POLLING] Modo FALLBACK ativado - retry de eventos falhos e health check');

    this.pollingJob = cron.schedule('*/30 * * * * *', async () => {
      if (this.isPolling) {
        logger.debug('[FOOD99 POLLING] Polling anterior ainda em execução, pulando...');
        return;
      }

      this.isPolling = true;

      try {
        await this.pollEvents();
      } catch (error) {
        logger.error('[FOOD99 POLLING] Erro geral no polling:', error.message);
      } finally {
        this.isPolling = false;
      }
    });

    logger.info('[FOOD99 POLLING] Serviço de polling iniciado (fallback a cada 30 segundos)');
  }

  stop() {
    if (this.pollingJob) {
      this.pollingJob.stop();
      logger.info('[FOOD99 POLLING] Serviço de polling parado');
    }
  }

  async pollEvents() {
    const settings = await prisma.integrationSettings.findMany({
      where: { food99IntegrationActive: true, food99AppShopId: { not: null } },
    });

    if (settings.length === 0) return;

    for (const setting of settings) {
      try {
        await this._pollForRestaurant(setting);
      } catch (error) {
        logger.error(`[FOOD99 POLLING] Erro para restaurant ${setting.restaurantId}:`, error.message);
      }
    }
  }

  async _pollForRestaurant(setting) {
    const token = await Food99AuthService.getValidToken(setting.food99AppShopId);

    if (!token) {
      logger.warn(`[FOOD99 POLLING] Sem token válido para shop ${setting.food99AppShopId}, pulando...`);
      return;
    }

    const shopHealthy = await this._validateTokenHealth(token, setting.food99AppShopId, setting.food99Env);

    if (!shopHealthy) {
      logger.warn(`[FOOD99 POLLING] Token inválido para shop ${setting.food99AppShopId}, tentando renovar...`);
      await Food99AuthService.refreshToken(setting.food99AppShopId);
      return;
    }

    const failedEvents = await prisma.integrationEvent.findMany({
      where: {
        platform: 'food99',
        restaurantId: setting.restaurantId,
        status: 'FAILED',
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    if (failedEvents.length === 0) {
      logger.debug(`[FOOD99 POLLING] Nenhum evento falho para restaurant ${setting.restaurantId}`);
      return;
    }

    logger.info(`[FOOD99 POLLING] ${failedEvents.length} evento(s) falho(s) para retry no restaurant ${setting.restaurantId}`);

    for (const event of failedEvents) {
      try {
        await this._retryFailedEvent(event, token, setting);
      } catch (error) {
        logger.error(`[FOOD99 POLLING] Erro ao retry evento ${event.id}:`, error.message);
      }
    }
  }

  _isRateLimitError(errmsg) {
    if (!errmsg) return false;
    const lower = String(errmsg).toLowerCase();
    return lower.includes('frequency') ||
           lower.includes('rate limit') ||
           lower.includes('exceeds') ||
           lower.includes('too many');
  }

  _healthCheckIntervalMs() {
    return parseInt(process.env.FOOD99_HEALTH_CHECK_INTERVAL_MS, 10) || 10 * 60 * 1000;
  }

  async _validateTokenHealth(token, appShopId, env) {
    if (!this._lastHealthCheckAt) this._lastHealthCheckAt = {};
    const now = Date.now();
    const lastCheck = this._lastHealthCheckAt[appShopId] || 0;
    const interval = this._healthCheckIntervalMs();

    if (now - lastCheck < interval) {
      logger.debug(`[FOOD99 POLLING] Health check suprimido para shop ${appShopId} (próximo em ${Math.round((interval - (now - lastCheck)) / 1000)}s)`);
      return true;
    }

    const result = await requestWithRetry({
      method: 'get',
      url: '/v1/shop/shop/detail',
      env,
      params: { auth_token: token },
      logContext: `Health check shop ${appShopId}`,
      retries: 1,
    });

    this._lastHealthCheckAt[appShopId] = Date.now();

    if (!result.ok) {
      const status = result.status;
      if (status === 401 || status === 403) return false;
      if (status === 429 || this._isRateLimitError(result.error)) {
        logger.warn(`[FOOD99 POLLING] Rate limit no health check, considerando token válido`);
        return true;
      }
      logger.error(`[FOOD99 POLLING] Erro no health check: ${result.error}`);
      return false;
    }

    const data = result.data;
    if (data && typeof data === 'object' && 'errno' in data && data.errno !== 0) {
      const errmsg = data.errmsg || `errno ${data.errno}`;
      if (this._isRateLimitError(errmsg)) {
        logger.warn(`[FOOD99 POLLING] Rate limit detectado (${errmsg}), considerando token válido`);
        return true;
      }
      logger.warn(`[FOOD99 POLLING] Health check falhou para shop ${appShopId}: ${errmsg}`);
      return false;
    }

    logger.debug(`[FOOD99 POLLING] Health check OK para shop ${appShopId}`);
    return true;
  }

  async _retryFailedEvent(event, token, setting) {
    const { platformOrderId: orderId, eventType } = event;

    if (!orderId) {
      logger.warn(`[FOOD99 POLLING] Evento ${event.id} sem orderId, marcando como inválido`);
      await IntegrationOrderService.registerEvent(
        'food99',
        event.platformOrderId || 'unknown',
        eventType,
        setting.restaurantId,
        null,
        'PROCESSED',
        'Evento sem orderId - ignorado'
      );
      return;
    }

    const alreadyProcessed = await prisma.integrationEvent.findUnique({
      where: {
        platform_platformOrderId_eventType: {
          platform: 'food99',
          platformOrderId: orderId,
          eventType: `${eventType}_retried`,
        },
      },
    });

    if (alreadyProcessed?.status === 'PROCESSED') {
      logger.debug(`[FOOD99 POLLING] Evento ${eventType} para ${orderId} já resolvido, ignorando retry`);
      return;
    }

    logger.info(`[FOOD99 POLLING] Retrying evento ${eventType} para pedido ${orderId}`);

    const orderDetails = await Food99OrderAdapter.getOrderDetails(setting.restaurantId, orderId);

    if (!orderDetails) {
      await IntegrationOrderService.registerEvent(
        'food99',
        orderId,
        eventType,
        setting.restaurantId,
        null,
        'FAILED',
        'Falha ao buscar detalhes do pedido na API 99Food'
      );
      return;
    }

    const food99Status = orderDetails.status;
    const mappedStatus = IntegrationTypeService.mapStatus('food99', String(food99Status));

    if (!mappedStatus) {
      logger.warn(`[FOOD99 POLLING] Status desconhecido ${food99Status} para pedido ${orderId}`);
      await IntegrationOrderService.registerEvent(
        'food99',
        orderId,
        eventType,
        setting.restaurantId,
        null,
        'FAILED',
        `Status desconhecido: ${food99Status}`
      );
      return;
    }

    switch (mappedStatus) {
      case 'PENDING': {
        const order = await Food99OrderAdapter.processNewOrder(setting.restaurantId, orderDetails);
        await IntegrationOrderService.registerEvent(
          'food99',
          orderId,
          `${eventType}_retried`,
          setting.restaurantId,
          order?.id,
          'PROCESSED'
        );
        await IntegrationOrderService.registerEvent(
          'food99',
          orderId,
          eventType,
          setting.restaurantId,
          order?.id,
          'PROCESSED'
        );
        break;
      }

      case 'CANCELED':
        try {
          const result = await IntegrationOrderService.cancelFromIntegration('food99', setting.restaurantId, orderId);
          if (result) {
            logger.info(`[FOOD99 POLLING] Pedido ${result.id} cancelado com sucesso via retry`);
          }
        } catch (error) {
          logger.error(`[FOOD99 POLLING] Erro ao cancelar via retry: ${error.message}`);
        }
        await IntegrationOrderService.registerEvent(
          'food99',
          orderId,
          `${eventType}_retried`,
          setting.restaurantId,
          null,
          'PROCESSED'
        );
        await IntegrationOrderService.registerEvent(
          'food99',
          orderId,
          eventType,
          setting.restaurantId,
          null,
          'PROCESSED'
        );
        break;

      case 'PREPARING':
      case 'READY':
      case 'SHIPPED':
      case 'COMPLETED':
        await this._updateOrderStatus(setting.restaurantId, orderId, mappedStatus);
        await IntegrationOrderService.registerEvent(
          'food99',
          orderId,
          `${eventType}_retried`,
          setting.restaurantId,
          null,
          'PROCESSED'
        );
        await IntegrationOrderService.registerEvent(
          'food99',
          orderId,
          eventType,
          setting.restaurantId,
          null,
          'PROCESSED'
        );
        break;

      default:
        logger.info(`[FOOD99 POLLING] Status ${mappedStatus} não requer ação para retry`);
    }
  }

  async _updateOrderStatus(restaurantId, food99OrderId, newStatus) {
    try {
      const order = await prisma.order.findFirst({
        where: { restaurantId, food99OrderId },
      });

      if (!order) {
        logger.warn(`[FOOD99 POLLING] Pedido ${food99OrderId} não encontrado localmente para status ${newStatus}`);
        return;
      }

      const statusUpdateData = { status: newStatus };

      if (newStatus === 'READY') statusUpdateData.readyAt = new Date();
      if (newStatus === 'COMPLETED') statusUpdateData.completedAt = new Date();
      if (newStatus === 'CANCELED') statusUpdateData.canceledAt = new Date();

      await prisma.order.update({
        where: { id: order.id },
        data: statusUpdateData,
      });

      const socketLib = require('../lib/socket');
      socketLib.emitToRestaurant(restaurantId, 'order_updated', {
        orderId: order.id,
        status: newStatus,
        source: 'FOOD99',
      });

      logger.info(`[FOOD99 POLLING] Pedido ${order.id} atualizado para ${newStatus} via retry`);
    } catch (error) {
      logger.error(`[FOOD99 POLLING] Erro ao atualizar status para ${newStatus}:`, error.message);
    }
  }
}

module.exports = new Food99PollingService();
