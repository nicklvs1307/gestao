const cron = require('node-cron');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const Food99AuthService = require('./Food99AuthService');
const Food99OrderAdapter = require('./Food99OrderAdapter');
const IntegrationOrderService = require('./IntegrationOrderService');

const FALLBACK_MODE = true;

class Food99PollingService {
  constructor() {
    this.pollingJob = null;
    this.isPolling = false;
  }

  init() {
    if (FALLBACK_MODE) {
      logger.info('[FOOD99 POLLING] Modo FALLBACK ativado - backup do webhook');
    }

    this.pollingJob = cron.schedule('*/30 * * * * *', async () => {
      if (this.isPolling) {
        logger.debug('[FOOD99 POLLING] Polling anterior em execução, pulando...');
        return;
      }

      this.isPolling = true;

      try {
        await this.pollEvents();
      } catch (error) {
        logger.error('[FOOD99 POLLING] Erro no polling:', error.message);
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
    if (!token) return;

    const lastEvents = await prisma.integrationEvent.findMany({
      where: {
        platform: 'food99',
        restaurantId: setting.restaurantId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    if (lastEvents.length === 0) return;

    logger.debug(`[FOOD99 POLLING] ${lastEvents.length} eventos pendentes para restaurant ${setting.restaurantId}`);
  }
}

module.exports = new Food99PollingService();
