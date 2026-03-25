const cron = require('node-cron');
const checklistReportService = require('./ChecklistReportService');
const logger = require('../config/logger');

class JobService {
  constructor() {
    this.jobs = [];
  }

  init() {
    logger.info('[JobService] Inicializando agendador de tarefas...');
    let isRunningChecklist = false;
    let lockTimeout = null;

    // Cron Job para Relatórios de Checklist (Verifica a cada 5 minutos)
    // Reduzido de 1 minuto para 5 minutos - suficiente para HH:mm checks
    const checklistReportJob = cron.schedule('*/5 * * * *', async () => {
      if (isRunningChecklist) return;

      try {
        isRunningChecklist = true;

        // Timeout de segurança: libera o lock após 4 minutos
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

    logger.info('[JobService] Tarefas agendadas com sucesso.');
  }
}

module.exports = new JobService();
