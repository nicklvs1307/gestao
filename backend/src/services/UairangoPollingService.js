const cron = require('node-cron');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const api = require('./UairangoApiClient');
const UairangoWebhookService = require('./UairangoWebhookService');

class UairangoPollingService {
  constructor() {
    this.pollingJob = null;
    this.isPolling = false;
  }

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

  stop() {
    if (this.pollingJob) {
      this.pollingJob.stop();
      logger.info('[UAIRANGO POLLING] Serviço de polling parado');
    }
  }

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

  async pollRestaurantEvents(setting) {
    try {
      const response = await api.get(setting.restaurantId, '/events/v1.0/events:polling', {
        params: {
          types: 'PLC,CFM,RTP,DSP,CAN',
          groups: 'ORDER_STATUS'
        },
        timeout: 15000
      });

      const events = Array.isArray(response.data) ? response.data : [];

      if (events.length === 0) {
        logger.debug(`[UAIRANGO POLLING] Nenhum evento novo para ${setting.restaurantId}`);
        return;
      }

      logger.info(`[UAIRANGO POLLING] ${events.length} evento(s) recebido(s) para ${setting.restaurantId}`);

      const eventIds = [];
      for (const event of events) {
        try {
          const { orderId, code, id: eventId } = event;

          if (!orderId || !code) {
            logger.warn(`[UAIRANGO POLLING] Evento inválido:`, event);
            continue;
          }

          // Deduplicação: verificar se webhook já processou
          const eventType = code === 'PLC' || code === 'PLACED' ? 'ORDER_PLACED' : code;
          const alreadyProcessed = await prisma.integrationEvent.findUnique({
            where: {
              platform_platformOrderId_eventType: {
                platform: 'uairango',
                platformOrderId: orderId,
                eventType,
              },
            },
          });

          if (alreadyProcessed?.status === 'PROCESSED') {
            logger.debug(`[UAIRANGO POLLING] Evento ${code} para ${orderId} já processado pelo webhook, ignorando`);
            eventIds.push(eventId);
            continue;
          }

          // Usar mesma lógica do webhook
          await UairangoWebhookService.processEvent(event, setting.restaurantId);
          eventIds.push(eventId);
        } catch (error) {
          logger.error(`[UAIRANGO POLLING] Erro ao processar evento ${event.id}:`, error.message);
          eventIds.push(event.id);
        }
      }

      if (eventIds.length > 0) {
        await this._acknowledgeEvents(setting.restaurantId, eventIds);
      }
    } catch (error) {
      if (error.response?.status === 204) {
        logger.debug(`[UAIRANGO POLLING] Nenhum evento novo (204)`);
        return;
      }
      logger.error(`[UAIRANGO POLLING] Erro ao buscar eventos:`, error.message);
    }
  }

  async _acknowledgeEvents(restaurantId, eventIds) {
    try {
      const body = eventIds.map(id => ({ id }));
      await api.post(restaurantId, '/events/v1.0/events/acknowledgment', body, { timeout: 10000 });
      logger.info(`[UAIRANGO POLLING] ${eventIds.length} evento(s) confirmado(s) via acknowledgment`);
    } catch (error) {
      logger.error(`[UAIRANGO POLLING] Erro no acknowledgment:`, error.message);
    }
  }
}

module.exports = new UairangoPollingService();
