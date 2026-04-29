const cron = require('node-cron');
const checklistReportService = require('./ChecklistReportService');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const socketLib = require('../lib/socket');
const { format, parse } = require('date-fns');
const { ptBR } = require('date-fns/locale');
const IfoodAuthService = require('./IfoodAuthService');
const IfoodPollingService = require('./IfoodPollingService');
const UairangoPollingService = require('./UairangoPollingService');

class JobService {
  constructor() {
    this.jobs = [];
  }

  init() {
    logger.info('[JobService] Inicializando agendador de tarefas...');
    let isRunningChecklist = false;
    let lockTimeout = null;

    // Cron Job para Relatórios de Checklist (Verifica a cada 5 minutos)
    const checklistReportJob = cron.schedule('*/5 * * * *', async () => {
      if (isRunningChecklist) return;

      try {
        isRunningChecklist = true;

        lockTimeout = setTimeout(() => {
          isRunningChecklist = false;
          logger.warn('[JobService] Lock de relatórios liberado por timeout (4min).');
        }, 4 * 60 * 1000);

        await checklistReportService.runAllScheduledReports();
        await checklistReportService.checkIndividualDeadlines();
      } catch (error) {
        logger.error('[JobService] Erro ao processar relatórios de checklist:', error);
      } finally {
        if (lockTimeout) clearTimeout(lockTimeout);
        isRunningChecklist = false;
      }
    });

    this.jobs.push({ name: 'ChecklistReport', job: checklistReportJob });

    // Cron Job para Abertura/Fechamento Automático de Delivery (Verifica a cada 1 minuto)
    const autoDeliveryJob = cron.schedule('* * * * *', async () => {
      try {
        const now = new Date();
        const currentTimeInt = now.getHours() * 60 + now.getMinutes();
        const currentDay = now.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb

        // Buscar todas as configurações com autoOpenDelivery ativado
        const settings = await prisma.restaurantSettings.findMany({
          where: { autoOpenDelivery: true }
        });

        for (const setting of settings) {
          try {
            let shouldBeOpen = false;

            // Prioridade 1: Horário por dia (operatingHours)
            if (setting.operatingHours && Array.isArray(setting.operatingHours)) {
              const todaySchedule = setting.operatingHours.find(h => h.dayOfWeek === currentDay);
              
              if (todaySchedule) {
                if (todaySchedule.isClosed) {
                  shouldBeOpen = false;
                } else {
                  const [openH, openM] = todaySchedule.openingTime.split(':').map(Number);
                  const [closeH, closeM] = todaySchedule.closingTime.split(':').map(Number);
                  const openTimeInt = openH * 60 + openM;
                  const closeTimeInt = closeH * 60 + closeM;

                  if (openTimeInt <= closeTimeInt) {
                    shouldBeOpen = currentTimeInt >= openTimeInt && currentTimeInt < closeTimeInt;
                  } else {
                    shouldBeOpen = currentTimeInt >= openTimeInt || currentTimeInt < closeTimeInt;
                  }
                }
              }
            }
            // Fallback: Horário único legado
            else if (setting.deliveryOpeningTime && setting.deliveryClosingTime) {
              const [openH, openM] = setting.deliveryOpeningTime.split(':').map(Number);
              const [closeH, closeM] = setting.deliveryClosingTime.split(':').map(Number);
              const openTimeInt = openH * 60 + openM;
              const closeTimeInt = closeH * 60 + closeM;

              if (openTimeInt <= closeTimeInt) {
                shouldBeOpen = currentTimeInt >= openTimeInt && currentTimeInt < closeTimeInt;
              } else {
                shouldBeOpen = currentTimeInt >= openTimeInt || currentTimeInt < closeTimeInt;
              }
            }

            if (setting.isOpen !== shouldBeOpen) {
              await prisma.restaurantSettings.update({
                where: { id: setting.id },
                data: { isOpen: shouldBeOpen }
              });

              logger.info(`[JobService] Loja ${setting.restaurantId} alternada para ${shouldBeOpen ? 'ABERTA' : 'FECHADA'}`);
              
              // Emitir evento para clientes conectados
              socketLib.emitToRestaurant(setting.restaurantId, 'restaurantUpdate', { isOpen: shouldBeOpen });
            }
          } catch (err) {
             logger.error(`[JobService] Erro ao processar loja ${setting.restaurantId}:`, err);
          }
        }
      } catch (error) {
        logger.error('[JobService] Erro ao processar abertura automática:', error);
      }
    });

    this.jobs.push({ name: 'AutoDeliveryOpenClose', job: autoDeliveryJob });

    // Cron Job para Renew de Token iFood (a cada 30 minutos)
    const ifoodTokenRefreshJob = cron.schedule('*/30 * * * *', async () => {
      try {
        const settings = await prisma.integrationSettings.findMany({
          where: { ifoodIntegrationActive: true }
        });

        for (const setting of settings) {
          try {
            const expiresAt = setting.ifoodAccessTokenExpiresAt;
            
            if (!expiresAt) {
              continue;
            }

            // Se não tem refresh token, não tenta renovar
            if (!setting.ifoodRefreshToken) {
              continue;
            }

            const expires = new Date(expiresAt);
            const now = new Date();
            const minutesUntilExpiry = Math.floor((expires - now) / 1000 / 60);

            // Renovar se expira em até 30 min OU se já expirou (tentativa de recuperação)
            if (minutesUntilExpiry <= 30) {
              const status = minutesUntilExpiry <= 0 ? 'EXPIRADO' : `expira em ${minutesUntilExpiry} min`;
              logger.info(`[JobService] Renovando token iFood para restaurante ${setting.restaurantId} (${status})`);
              
              const result = await IfoodAuthService.getValidToken();
              
              if (result) {
                logger.info(`[JobService] Token iFood renovado com sucesso para ${setting.restaurantId}`);
              } else {
                logger.warn(`[JobService] Falha ao renovar token iFood para ${setting.restaurantId}`);
              }
            }
          } catch (err) {
            logger.error(`[JobService] Erro ao processar renew token para ${setting.restaurantId}:`, err);
          }
        }
      } catch (error) {
        logger.error('[JobService] Erro ao processar renew de tokens iFood:', error);
      }
    });

    this.jobs.push({ name: 'IfoodTokenRefresh', job: ifoodTokenRefreshJob });

    // Iniciar polling de eventos do iFood
    try {
      IfoodPollingService.init();
      logger.info('[JobService] iFood Polling Service iniciado com sucesso.');
    } catch (error) {
      logger.error('[JobService] Erro ao iniciar iFood Polling Service:', error);
    }

    // Iniciar polling de pedidos do Uai Rangô
    try {
      UairangoPollingService.init();
      logger.info('[JobService] Uai Rangô Polling Service iniciado com sucesso.');
    } catch (error) {
      logger.error('[JobService] Erro ao iniciar Uai Rangô Polling Service:', error);
    }

    logger.info('[JobService] Tarefas agendadas com sucesso.');
  }
}

module.exports = new JobService();
