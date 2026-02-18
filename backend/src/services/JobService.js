const cron = require('node-cron');
const checklistReportService = require('./ChecklistReportService');

class JobService {
  constructor() {
    this.jobs = [];
  }

  init() {
    console.log('[JobService] Inicializando agendador de tarefas...');

    // 1. Cron Job para Relatórios de Checklist (Verifica a cada minuto)
    const checklistReportJob = cron.schedule('* * * * *', async () => {
      try {
        await checklistReportService.runAllScheduledReports();
      } catch (error) {
        console.error('[JobService] Erro ao processar relatórios de checklist:', error);
      }
    });

    this.jobs.push({ name: 'ChecklistReport', job: checklistReportJob });

    console.log('[JobService] Tarefas agendadas com sucesso.');
  }

  // Futuramente, se houver outros jobs, adicionar aqui
}

module.exports = new JobService();
