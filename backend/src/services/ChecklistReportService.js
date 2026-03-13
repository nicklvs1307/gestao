const prisma = require('../lib/prisma');
const evolutionService = require('./EvolutionService');
const { normalizePhone } = require('../lib/phoneUtils');
const { startOfDay, endOfDay, format } = require('date-fns');
const { ptBR } = require('date-fns/locale');

class ChecklistReportService {
  // Auxiliar para obter a data/hora atual em São Paulo
  getSaoPauloDate() {
    const now = new Date();
    // Converte para o fuso de São Paulo (Brasília)
    return new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  }

  async generateDailyReport(restaurantId) {
    const today = this.getSaoPauloDate();
    const start = startOfDay(today);
    const end = endOfDay(today);

    // 1. Busca as configurações de relatório
    const settings = await prisma.checklistReportSettings.findUnique({
      where: { restaurantId },
    });

    if (!settings || !settings.enabled || !settings.recipientPhone) {
      return;
    }

    const recipient = normalizePhone(settings.recipientPhone);
    if (!recipient) return;

    // 2. Busca a instância do WhatsApp conectada
    const instance = await prisma.whatsAppInstance.findUnique({
      where: { restaurantId },
    });

    if (!instance || instance.status !== 'CONNECTED') {
      console.warn(`[ChecklistReport] Restaurante ${restaurantId} sem WhatsApp conectado.`);
      return;
    }

    // 3. Busca os checklists ativos do restaurante
    const checklists = await prisma.checklist.findMany({
      where: { restaurantId, isActive: true },
      include: {
        sector: true,
        _count: { select: { tasks: true } }
      }
    });

    // 4. Busca as execuções de hoje
    const executions = await prisma.checklistExecution.findMany({
      where: {
        restaurantId,
        completedAt: { gte: start, lte: end }
      },
      include: {
        checklist: true,
        responses: true,
        user: { select: { name: true } }
      }
    });

    // 5. Processa os dados
    const totalChecklists = checklists.length;
    const executedToday = executions.length;
    
    let totalTasks = 0;
    let okTasks = 0;
    let notOkTasks = 0;

    executions.forEach(exe => {
      exe.responses.forEach(res => {
        totalTasks++;
        if (res.isOk) okTasks++;
        else notOkTasks++;
      });
    });

    const conformityRate = totalTasks > 0 ? ((okTasks / totalTasks) * 100).toFixed(1) : 0;

    // 6. Monta a mensagem
    const dateStr = format(today, "dd 'de' MMMM", { locale: ptBR });
    let message = `*📊 Relatório de Conformidade - ${dateStr}*

`;
    
    message += `✅ *Resumo Geral:*
`;
    message += `• Checklists Ativos: ${totalChecklists}
`;
    message += `• Realizados Hoje: ${executedToday}
`;
    message += `• Taxa de Conformidade: *${conformityRate}%*

`;

    if (executedToday > 0) {
      message += `📍 *Detalhamento por Execução:*
`;
      executions.forEach(exe => {
        const exeOk = exe.responses.filter(r => r.isOk).length;
        const exeTotal = exe.responses.length;
        const exeRate = ((exeOk / exeTotal) * 100).toFixed(0);
        const time = format(exe.completedAt, "HH:mm");
        const user = exe.user?.name || "N/A";

        message += `
📝 *${exe.checklist.title}*
`;
        message += `  🕒 ${time} | 👤 ${user}
`;
        message += `  📉 Status: ${exeRate}% de conformidade
`;
        if (exe.notes) message += `  💬 Obs: ${exe.notes}
`;
      });
    } else {
      message += `⚠️ *Nenhum checklist foi executado hoje.*`;
    }

    message += `

_Relatório gerado automaticamente pelo sistema Pedify._`;

    // 7. Envia via WhatsApp
    try {
      await evolutionService.sendText(instance.name, recipient, message);
      console.log(`[ChecklistReport] Relatório enviado para ${recipient} (Restaurante: ${restaurantId})`);
    } catch (error) {
      console.error(`[ChecklistReport] Erro ao enviar relatório:`, error);
    }
  }

  async runAllScheduledReports() {
    const now = this.getSaoPauloDate();
    const currentTime = format(now, "HH:mm");

    // Busca todos os restaurantes que tem relatório habilitado para este horário
    const activeSettings = await prisma.checklistReportSettings.findMany({
      where: {
        enabled: true,
        sendTime: currentTime
      }
    });

    for (const setting of activeSettings) {
      await this.generateDailyReport(setting.restaurantId);
    }
  }

  async checkIndividualDeadlines() {
    const now = this.getSaoPauloDate();
    const currentTime = format(now, "HH:mm");
    const start = startOfDay(now);
    const end = endOfDay(now);

    // 1. Busca todos os checklists que tem horário limite para AGORA
    const checklistsWithDeadline = await prisma.checklist.findMany({
      where: {
        isActive: true,
        deadlineTime: currentTime
      },
      include: {
        sector: true,
        restaurant: {
          include: { 
            checklistReportSettings: true,
            whatsAppInstance: true
          }
        }
      }
    });

    for (const checklist of checklistsWithDeadline) {
      const settings = checklist.restaurant.checklistReportSettings;
      const instance = checklist.restaurant.whatsAppInstance;

      // Só envia se tiver configuração de envio e WhatsApp conectado
      if (!settings || !settings.enabled || !settings.recipientPhone) continue;
      if (!instance || instance.status !== 'CONNECTED') continue;

      const recipient = normalizePhone(settings.recipientPhone);

      // 2. Verifica se houve execução HOJE para este checklist
      const execution = await prisma.checklistExecution.findFirst({
        where: {
          checklistId: checklist.id,
          completedAt: { gte: start, lte: end }
        },
        include: {
          responses: true,
          user: { select: { name: true } }
        },
        orderBy: { completedAt: 'desc' }
      });

      let message = '';
      if (!execution) {
        // Alerta de ATRASO
        message = `*⚠️ ALERTA DE OPERAÇÃO EM ATRASO*\n\n`;
        message += `O checklist *${checklist.title}* do setor *${checklist.sector.name}* ainda não foi realizado hoje.\n\n`;
        message += `⏰ Horário Limite: ${checklist.deadlineTime}\n`;
        message += `📍 Status: *PENDENTE*`;
      } else {
        // Relatório de CONFORMIDADE INDIVIDUAL
        const okTasks = execution.responses.filter(r => r.isOk).length;
        const totalTasks = execution.responses.length;
        const rate = totalTasks > 0 ? ((okTasks / totalTasks) * 100).toFixed(0) : 0;
        const time = format(execution.completedAt, "HH:mm");

        message = `*✅ CHECKLIST REALIZADO - ${checklist.sector.name}*\n\n`;
        message += `O checklist *${checklist.title}* foi concluído com sucesso.\n\n`;
        message += `📊 Conformidade: *${rate}%*\n`;
        message += `🕒 Concluído às: ${time}\n`;
        message += `👤 Executor: ${execution.user?.name || execution.externalUserName || 'N/A'}\n`;
        
        if (execution.notes) {
          message += `\n💬 Observações: ${execution.notes}`;
        }
      }

      message += `\n\n_Notificação automática Pedify_`;

      try {
        await evolutionService.sendText(instance.name, recipient, message);
        console.log(`[ChecklistDeadline] Alerta individual enviado para ${recipient} (Checklist: ${checklist.id})`);
      } catch (error) {
        console.error(`[ChecklistDeadline] Erro ao enviar alerta individual:`, error);
      }
    }
  }
}

module.exports = new ChecklistReportService();
