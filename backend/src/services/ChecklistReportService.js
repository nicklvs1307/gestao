const prisma = require('../lib/prisma');
const evolutionService = require('./EvolutionService');
const pdfService = require('./PDFService');
const { normalizePhone } = require('../lib/phoneUtils');
const { startOfDay, endOfDay, format } = require('date-fns');
const { ptBR } = require('date-fns/locale');
const fs = require('fs');

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
        checklist: { include: { sector: true, tasks: true } },
        responses: { include: { task: true } },
        user: { select: { name: true } }
      }
    });

    // 5. Processa os dados
    const totalChecklists = checklists.length;
    const executedToday = executions.length;
    
    let totalTasks = 0;
    let okTasks = 0;

    executions.forEach(exe => {
      exe.responses.forEach(res => {
        totalTasks++;
        if (res.isOk) okTasks++;
      });
    });

    const conformityRate = totalTasks > 0 ? ((okTasks / totalTasks) * 100).toFixed(1) : 0;
    const dateStr = format(today, "dd 'de' MMMM", { locale: ptBR });

    // 6. Define o que será enviado com base nas configurações
    const formatType = settings.reportFormat || "PDF"; // "PDF", "TEXT", "BOTH"

    // 7. Monta a mensagem de texto (Resumo Geral)
    let summaryMessage = `*📊 Resumo Geral de Conformidade - ${dateStr}*\n\n`;
    summaryMessage += `• Checklists Ativos: ${totalChecklists}\n`;
    summaryMessage += `• Realizados Hoje: ${executedToday}\n`;
    summaryMessage += `• Taxa de Conformidade: *${conformityRate}%*\n\n`;

    // 8. Se for TEXT ou BOTH, adiciona os detalhes das execuções no texto
    if (formatType === "TEXT" || formatType === "BOTH") {
      summaryMessage += `*━━━━━━━━━━━━━━━━━━*\n`;
      summaryMessage += `*📋 DETALHAMENTO POR SETOR*\n`;
      
      executions.forEach(exe => {
        const exeOk = exe.responses.filter(r => r.isOk).length;
        const exeTotal = exe.responses.length;
        const exeRate = exeTotal > 0 ? ((exeOk / exeTotal) * 100).toFixed(0) : 0;
        const time = format(exe.completedAt, "HH:mm");
        
        summaryMessage += `\n📍 *${exe.checklist.title.toUpperCase()}*\n`;
        summaryMessage += ` setor: _${exe.checklist.sector.name}_\n`;
        summaryMessage += ` 🕒 ${time} | 📊 Conformidade: *${exeRate}%*\n`;
        summaryMessage += ` 👤 Executor: ${exe.user?.name || exe.externalUserName || 'N/A'}\n`;
        
        // Adiciona itens irregulares ou com fotos
        exe.responses.forEach(res => {
          if (!res.isOk || (res.task?.type === "PHOTO" && res.value)) {
            const status = res.isOk ? "✅" : "❌";
            summaryMessage += `\n   ${status} *${res.task?.content}*\n`;
            
            if (res.notes) {
              summaryMessage += `     └ 📝 _Nota: ${res.notes}_\n`;
            }
            
            // Link das fotos com URL de produção
            if (res.value && res.task?.type === "PHOTO") {
              try {
                const photos = JSON.parse(res.value);
                // Prioriza URL de produção do .env ou tenta montar a URL base
                const baseUrl = process.env.API_URL || "https://api.kicardapio.com.br"; 
                if (Array.isArray(photos)) {
                  photos.forEach((p, idx) => {
                    summaryMessage += `     └ 📸 Foto ${idx+1}: ${baseUrl}${p}\n`;
                  });
                }
              } catch (e) {}
            }
          }
        });
        summaryMessage += `\n----------------------------------\n`;
      });

      if (formatType === "BOTH") {
        summaryMessage += `\n_O relatório técnico oficial segue em PDF abaixo._`;
      }
    } else {
      summaryMessage += `_O relatório detalhado segue em PDF abaixo._`;
    }

    // 9. Processa envios
    let pdfPath = null;
    try {
      // Envia Mensagem de Texto
      await evolutionService.sendText(instance.name, recipient, summaryMessage);

      // Envia PDF (Se não for apenas TEXT)
      if (formatType === "PDF" || formatType === "BOTH") {
        pdfPath = await pdfService.generateDailyGeneralPDF({
          dateStr,
          totalChecklists,
          executedToday,
          conformityRate,
          executions
        });

        await evolutionService.sendMedia(
          instance.name, 
          recipient, 
          pdfPath, 
          `Resumo_Geral_${format(today, 'yyyy-MM-dd')}.pdf`,
          `Relatório Detalhado - ${dateStr}`
        );
      }

      console.log(`[ChecklistReport] Relatório (${formatType}) enviado para ${recipient} (Restaurante: ${restaurantId})`);
    } catch (error) {
      console.error(`[ChecklistReport] Erro ao enviar relatório:`, error);
    } finally {
      if (pdfPath && fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath); // Remove arquivo temporário
      }
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

  async sendIndividualReport(checklistId) {
    const now = this.getSaoPauloDate();
    const start = startOfDay(now);
    const end = endOfDay(now);

    const checklist = await prisma.checklist.findUnique({
      where: { id: checklistId },
      include: {
        sector: true,
        restaurant: {
          include: { 
            checklistReportSettings: true,
            whatsappInstance: true
          }
        }
      }
    });

    if (!checklist) throw new Error("Checklist não encontrado");

    const settings = checklist.restaurant.checklistReportSettings;
    const instance = checklist.restaurant.whatsappInstance;

    if (!settings || !settings.enabled || !settings.recipientPhone) {
      throw new Error("Relatórios não configurados para este restaurante");
    }
    if (!instance || instance.status !== 'CONNECTED') {
      throw new Error("WhatsApp não conectado");
    }

    const recipient = normalizePhone(settings.recipientPhone);

    // 2. Busca a ÚLTIMA execução (removido filtro de data 'hoje')
    const execution = await prisma.checklistExecution.findFirst({
      where: {
        checklistId: checklist.id
      },
      include: {
        checklist: { include: { sector: true, tasks: true, restaurant: true } },
        responses: { include: { task: true } },
        user: { select: { name: true } }
      },
      orderBy: { completedAt: 'desc' }
    });

    if (!execution) {
      throw new Error("Nenhuma execução encontrada para este checklist na história");
    }

    const okTasks = execution.responses.filter(r => r.isOk).length;
    const totalTasks = execution.responses.length;
    const rate = totalTasks > 0 ? ((okTasks / totalTasks) * 100).toFixed(0) : 0;
    const time = format(execution.completedAt, "HH:mm");
    const formatType = settings.reportFormat || "PDF";

    let message = `*✅ RELATÓRIO INDIVIDUAL - ${checklist.sector.name}*\n\n`;
    message += `O checklist *${checklist.title.toUpperCase()}* foi concluído.\n\n`;
    message += `📊 Conformidade: *${rate}%*\n`;
    message += `🕒 Concluído às: ${time}\n`;
    message += `👤 Executor: ${execution.user?.name || execution.externalUserName || 'N/A'}\n\n`;

    if (formatType === "TEXT" || formatType === "BOTH") {
      message += `*DETALHAMENTO DOS ITENS:*\n`;
      execution.responses.forEach(res => {
        const status = res.isOk ? "✅" : "❌";
        message += `\n ${status} *${res.task?.content}*\n`;
        if (res.notes) message += `    └ 📝 _Nota: ${res.notes}_\n`;
        
        if (res.value && res.task?.type === "PHOTO") {
          try {
            const photos = JSON.parse(res.value);
            const baseUrl = process.env.API_URL || "https://api.kicardapio.com.br";
            if (Array.isArray(photos)) {
              photos.forEach((p, idx) => {
                message += `    └ 📸 Foto ${idx+1}: ${baseUrl}${p}\n`;
              });
            }
          } catch (e) {}
        }
      });
      if (formatType === "BOTH") message += `\n_O detalhamento técnico segue em PDF._`;
    } else {
      message += `_O detalhamento técnico segue em PDF._`;
    }

    let pdfPath = null;
    try {
      await evolutionService.sendText(instance.name, recipient, message);

      if (formatType === "PDF" || formatType === "BOTH") {
        pdfPath = await pdfService.generateChecklistExecutionPDF(execution);
        await evolutionService.sendMedia(
          instance.name,
          recipient,
          pdfPath,
          `Auditoria_Manual_${checklist.id}_${format(now, 'HHmm')}.pdf`,
          `Auditoria Detalhada - ${checklist.title}`
        );
      }
      return true;
    } finally {
      if (pdfPath && fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
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
            whatsappInstance: true
          }
        }
      }
    });

    for (const checklist of checklistsWithDeadline) {
      const settings = checklist.restaurant.checklistReportSettings;
      const instance = checklist.restaurant.whatsappInstance;

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
          checklist: { include: { sector: true, tasks: true } },
          responses: { include: { task: true } },
          user: { select: { name: true } }
        },
        orderBy: { completedAt: 'desc' }
      });

      if (!execution) {
        // Alerta de ATRASO (Apenas texto)
        let message = `*⚠️ ALERTA DE OPERAÇÃO EM ATRASO*\n\n`;
        message += `O checklist *${checklist.title}* do setor *${checklist.sector.name}* ainda não foi realizado hoje.\n\n`;
        message += `⏰ Horário Limite: ${checklist.deadlineTime}\n`;
        message += `📍 Status: *PENDENTE*\n\n`;
        message += `\n\n_Notificação automática KiCardapio_`;


        try {
          await evolutionService.sendText(instance.name, recipient, message);
        } catch (error) {
          console.error(`[ChecklistDeadline] Erro ao enviar alerta de atraso:`, error);
        }
      } else {
        // Relatório de CONFORMIDADE INDIVIDUAL (Texto + PDF)
        const okTasks = execution.responses.filter(r => r.isOk).length;
        const totalTasks = execution.responses.length;
        const rate = totalTasks > 0 ? ((okTasks / totalTasks) * 100).toFixed(0) : 0;
        const time = format(execution.completedAt, "HH:mm");

        let message = `*✅ CHECKLIST REALIZADO - ${checklist.sector.name}*\n\n`;
        message += `O checklist *${checklist.title}* foi concluído.\n\n`;
        message += `📊 Conformidade: *${rate}%*\n`;
        message += `🕒 Concluído às: ${time}\n`;
        message += `👤 Executor: ${execution.user?.name || execution.externalUserName || 'N/A'}\n\n`;
        message += `_O detalhamento técnico segue em PDF._`;

        let pdfPath = null;
        try {
          pdfPath = await pdfService.generateChecklistExecutionPDF(execution);
          
          await evolutionService.sendText(instance.name, recipient, message);
          await evolutionService.sendMedia(
            instance.name,
            recipient,
            pdfPath,
            `Auditoria_${checklist.id}_${format(now, 'HHmm')}.pdf`,
            `Auditoria Detalhada - ${checklist.title}`
          );
        } catch (error) {
          console.error(`[ChecklistDeadline] Erro ao enviar PDF individual:`, error);
        } finally {
          if (pdfPath && fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
          }
        }
      }
    }
  }
}

module.exports = new ChecklistReportService();
