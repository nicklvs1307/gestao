const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const evolutionService = require('./EvolutionService');
const pdfService = require('./PDFService');
const { normalizePhone } = require('../lib/phoneUtils');
const { startOfDay, endOfDay, format, subDays, parseISO, subHours, addDays } = require('date-fns');
const { ptBR } = require('date-fns/locale');
const fs = require('fs');

class ChecklistReportService {
  getSaoPauloDate() {
    const now = new Date();
    return new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  }

  // Helper para obter todos os destinatários
  getRecipients(settings) {
    const recipients = [];
    
    // Número principal
    if (settings.recipientPhone) {
      const normalized = normalizePhone(settings.recipientPhone);
      if (normalized) recipients.push(normalized);
    }
    
    // Números adicionais (JSON array ou string separada por vírgula)
    if (settings.recipientPhones) {
      try {
        let phones = [];
        if (typeof settings.recipientPhones === 'string') {
          // Tentar parse JSON primeiro
          try {
            phones = JSON.parse(settings.recipientPhones);
          } catch {
            // Se não for JSON, separar por vírgula
            phones = settings.recipientPhones.split(',').map(p => p.trim()).filter(Boolean);
          }
        } else if (Array.isArray(settings.recipientPhones)) {
          phones = settings.recipientPhones;
        }
        
        phones.forEach(phone => {
          const normalized = normalizePhone(phone);
          if (normalized && !recipients.includes(normalized)) {
            recipients.push(normalized);
          }
        });
      } catch (error) {
        logger.error(`[ChecklistReport] Erro ao parsear recipientPhones:`, error);
      }
    }
    
    return recipients;
  }

  // Helper para montar mensagem com template customizado
  buildMessage(template, data) {
    if (template) {
      // Substituir placeholders no template customizado
      return template
        .replace(/\{date\}/g, data.dateStr || '')
        .replace(/\{totalChecklists\}/g, data.totalChecklists || '0')
        .replace(/\{executedToday\}/g, data.executedToday || '0')
        .replace(/\{conformityRate\}/g, data.conformityRate || '0')
        .replace(/\{checklistName\}/g, data.checklistName || '')
        .replace(/\{sectorName\}/g, data.sectorName || '')
        .replace(/\{executorName\}/g, data.executorName || '')
        .replace(/\{completionTime\}/g, data.completionTime || '')
        .replace(/\{individualRate\}/g, data.individualRate || '0')
        .replace(/\{reportLink\}/g, data.reportLink || '');
    }
    return null; // Retorna null para usar mensagem padrão
  }

  // Helper para construir URL base do frontend
  getFrontendUrl() {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  // Helper para logar envio
  async logReport(restaurantId, type, recipientPhone, status, options = {}) {
    try {
      await prisma.checklistReportLog.create({
        data: {
          restaurantId,
          type,
          checklistId: options.checklistId || null,
          recipientPhone,
          status,
          errorMessage: options.errorMessage || null,
          retryCount: options.retryCount || 0,
          summary: options.summary || null
        }
      });
    } catch (error) {
      logger.error(`[ChecklistReport] Erro ao logar envio:`, error);
    }
  }

  // Helper para enviar com retry
  async sendWithRetry(instanceName, recipient, message, pdfPath, pdfFilename, pdfCaption, maxRetries = 2) {
    let lastError = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Enviar texto
        await evolutionService.sendText(instanceName, recipient, message);

        // Enviar PDF se houver
        if (pdfPath && fs.existsSync(pdfPath)) {
          await evolutionService.sendMedia(
            instanceName,
            recipient,
            pdfPath,
            pdfFilename,
            pdfCaption
          );
        }
        return { success: true, attempts: attempt + 1 };
      } catch (error) {
        lastError = error;
        logger.warn(`[ChecklistReport] Tentativa ${attempt + 1} falhou para ${recipient}:`, error.message);
        
        if (attempt < maxRetries) {
          // Esperar exponencialmente mais entre tentativas
          await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, attempt)));
        }
      }
    }
    
    return { success: false, error: lastError, attempts: maxRetries + 1 };
  }

  async generateDailyReport(restaurantId) {
    const now = this.getSaoPauloDate();
    const settings = await prisma.checklistReportSettings.findUnique({
      where: { restaurantId },
    });

    if (!settings || !settings.enabled) {
      return;
    }

    const instance = await prisma.whatsAppInstance.findUnique({
      where: { restaurantId },
    });

    if (!instance || instance.status !== 'CONNECTED') {
      logger.warn(`[ChecklistReport] Restaurante ${restaurantId} sem WhatsApp conectado.`);
      return;
    }

    const recipients = this.getRecipients(settings);
    if (recipients.length === 0) {
      logger.warn(`[ChecklistReport] Nenhum destinatário configurado para restaurante ${restaurantId}`);
      return;
    }

    const checklists = await prisma.checklist.findMany({
      where: { restaurantId, isActive: true },
      include: {
        sector: true,
        _count: { select: { tasks: true } }
      }
    });

    const reportDate = new Date(now);
    const sendTime = settings.sendTime || '07:00';
    const turnStartHour = settings.turnStartHour || '06:00';

    const [sendHour, sendMin] = sendTime.split(':').map(Number);
    const [turnHour, turnMin] = turnStartHour.split(':').map(Number);

    let turnStart, turnEnd;

    const sendDate = new Date(reportDate);
    sendDate.setHours(sendHour, sendMin, 0, 0);

    const turnStartDate = new Date(reportDate);
    turnStartDate.setHours(turnHour, turnMin, 0, 0);

    if (sendDate <= turnStartDate) {
      turnStart = subDays(turnStartDate, 1);
      turnEnd = sendDate;
    } else {
      turnStart = turnStartDate;
      turnEnd = sendDate;
    }

    const executions = await prisma.checklistExecution.findMany({
      where: {
        restaurantId,
        completedAt: { gte: turnStart, lte: turnEnd }
      },
      include: {
        checklist: { include: { sector: true, tasks: true } },
        responses: { include: { task: true } },
        user: { select: { name: true } }
      },
      orderBy: { completedAt: 'asc' }
    });

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
    const dateStr = format(turnEnd, "dd 'de' MMMM", { locale: ptBR });
    const formatType = settings.reportFormat || "PDF";

    // Montar mensagem com template customizado ou padrão
    const templateData = {
      dateStr,
      totalChecklists,
      executedToday,
      conformityRate
    };

    let summaryMessage = this.buildMessage(settings.customMessage, { ...templateData, type: 'daily' });

    if (!summaryMessage) {
      const turnLabel = `${turnStartHour}-${sendTime}`;
      
      // Mensagem padrão
      if (formatType === "LINK") {
        const frontendUrl = this.getFrontendUrl();
        summaryMessage = `*📊 Resumo Geral de Conformidade - Turno ${turnLabel}*\n\n`;
        summaryMessage += `• Checklists Ativos: ${totalChecklists}\n`;
        summaryMessage += `• Realizados no Turno: ${executedToday}\n`;
        summaryMessage += `• Taxa de Conformidade: *${conformityRate}%*\n\n`;

        if (executions.length > 0) {
          summaryMessage += `*📋 DETALHAMENTO:*\n`;
          executions.forEach(exe => {
            const exeOk = exe.responses.filter(r => r.isOk).length;
            const exeTotal = exe.responses.length;
            const exeRate = exeTotal > 0 ? ((exeOk / exeTotal) * 100).toFixed(0) : 0;
            const time = format(exe.completedAt, "HH:mm");
            const executor = exe.user?.name || exe.externalUserName || 'N/A';
            const link = `${frontendUrl}/checklist/report/${exe.id}`;

            summaryMessage += `\n📍 *${exe.checklist.title}* - ${exe.checklist.sector.name}\n`;
            summaryMessage += `  🕒 ${time} | 📊 *${exeRate}%* | 👤 ${executor}\n`;
            summaryMessage += `  🔗 ${link}\n`;
          });
        } else {
          summaryMessage += `_Nenhum checklist realizado neste turno._`;
        }
      } else if (formatType === "TEXT" || formatType === "BOTH") {
        summaryMessage = `*📊 Resumo Geral de Conformidade - Turno ${turnLabel}*\n\n`;
        summaryMessage += `• Checklists Ativos: ${totalChecklists}\n`;
        summaryMessage += `• Realizados no Turno: ${executedToday}\n`;
        summaryMessage += `• Taxa de Conformidade: *${conformityRate}%*\n\n`;

        summaryMessage += `*━━━━━━━━━━━━━━━━━━*\n`;
        summaryMessage += `*📋 DETALHAMENTO POR SETOR*\n`;
        
        executions.forEach(exe => {
          const exeOk = exe.responses.filter(r => r.isOk).length;
          const exeTotal = exe.responses.length;
          const exeRate = exeTotal > 0 ? ((exeOk / exeTotal) * 100).toFixed(0) : 0;
          const time = format(exe.completedAt, "HH:mm");
          
          summaryMessage += `\n📍 *${exe.checklist.title.toUpperCase()}*\n`;
          summaryMessage += `  setor: _${exe.checklist.sector.name}_\n`;
          summaryMessage += `  🕒 ${time} | 📊 Conformidade: *${exeRate}%*\n`;
          summaryMessage += `  👤 Executor: ${exe.user?.name || exe.externalUserName || 'N/A'}\n`;
          
          exe.responses.forEach(res => {
            if (!res.isOk || (res.task?.type === "PHOTO" && res.value)) {
              const status = res.isOk ? "✅" : "❌";
              summaryMessage += `\n   ${status} *${res.task?.content}*\n`;
              
              if (res.notes) {
                summaryMessage += `     └ 📝 _Nota: ${res.notes}_\n`;
              }
              
              if (res.value && res.task?.type === "PHOTO") {
                try {
                  const photos = JSON.parse(res.value);
                  const baseUrl = process.env.API_URL; 
                  if (Array.isArray(photos) && baseUrl) {
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
        summaryMessage = `*📊 Resumo Geral de Conformidade - Turno ${turnLabel}*\n\n`;
        summaryMessage += `• Checklists Ativos: ${totalChecklists}\n`;
        summaryMessage += `• Realizados no Turno: ${executedToday}\n`;
        summaryMessage += `• Taxa de Conformidade: *${conformityRate}%*\n\n`;
        summaryMessage += `_O relatório detalhado segue em PDF abaixo._`;
      }
    }

    // Gerar PDF se necessário
    let pdfPath = null;
    let pdfFilename = null;
    if (formatType === "PDF" || formatType === "BOTH") {
      try {
        pdfPath = await pdfService.generateDailyGeneralPDF({
          dateStr,
          totalChecklists,
          executedToday,
          conformityRate,
          executions
        });
        pdfFilename = `Resumo_Geral_${format(today, 'yyyy-MM-dd')}.pdf`;
      } catch (error) {
        logger.error(`[ChecklistReport] Erro ao gerar PDF:`, error);
      }
    }

    // Enviar para todos os destinatários
    for (const recipient of recipients) {
      const result = await this.sendWithRetry(
        instance.name,
        recipient,
        summaryMessage,
        pdfPath,
        pdfFilename,
        `Relatório Detalhado - ${dateStr}`
      );

      await this.logReport(restaurantId, 'DAILY', recipient, result.success ? 'SUCCESS' : 'FAILED', {
        errorMessage: result.error?.message,
        retryCount: result.attempts - 1,
        summary: `Resumo: ${executedToday}/${totalChecklists} checklists, ${conformityRate}% conformidade`
      });

      if (result.success) {
        logger.info(`[ChecklistReport] Relatório (${formatType}) enviado para ${recipient}`);
      } else {
        logger.error(`[ChecklistReport] Falha ao enviar para ${recipient}: ${result.error?.message}`);
      }
    }

    // Limpar PDF temporário
    if (pdfPath && fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }
  }

  async runAllScheduledReports() {
    const now = this.getSaoPauloDate();
    const currentTime = format(now, "HH:mm");

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

    if (!settings || !settings.enabled) {
      throw new Error("Relatórios não configurados para este restaurante");
    }
    if (!instance || instance.status !== 'CONNECTED') {
      throw new Error("WhatsApp não conectado");
    }

    const recipients = this.getRecipients(settings);
    if (recipients.length === 0) {
      throw new Error("Nenhum destinatário configurado");
    }

    const execution = await prisma.checklistExecution.findFirst({
      where: { checklistId: checklist.id },
      include: {
        checklist: { include: { sector: true, tasks: true, restaurant: true } },
        responses: { include: { task: true } },
        user: { select: { name: true } }
      },
      orderBy: { completedAt: 'desc' }
    });

    if (!execution) {
      throw new Error("Nenhuma execução encontrada para este checklist");
    }

    const okTasks = execution.responses.filter(r => r.isOk).length;
    const totalTasks = execution.responses.length;
    const rate = totalTasks > 0 ? ((okTasks / totalTasks) * 100).toFixed(0) : 0;
    const time = format(execution.completedAt, "HH:mm");
    const formatType = settings.reportFormat || "PDF";
    const reportLink = `${this.getFrontendUrl()}/checklist/report/${execution.id}`;

    // Montar mensagem com template ou padrão
    const templateData = {
      checklistName: checklist.title,
      sectorName: checklist.sector.name,
      executorName: execution.user?.name || execution.externalUserName || 'N/A',
      completionTime: time,
      individualRate: rate,
      reportLink
    };

    let message = this.buildMessage(settings.customMessage, { ...templateData, type: 'individual' });

    if (!message) {
      if (formatType === "LINK") {
        message = `*✅ CHECKLIST CONCLUÍDO - ${checklist.sector.name}*\n\n`;
        message += `📋 *${checklist.title.toUpperCase()}*\n`;
        message += `👤 Executor: ${execution.user?.name || execution.externalUserName || 'N/A'}\n`;
        message += `🕒 Concluído às: ${time}\n`;
        message += `📊 Conformidade: *${rate}%*\n\n`;
        message += `🔗 Ver relatório completo:\n${reportLink}`;
      } else if (formatType === "TEXT" || formatType === "BOTH") {
        message = `*✅ RELATÓRIO INDIVIDUAL - ${checklist.sector.name}*\n\n`;
        message += `O checklist *${checklist.title.toUpperCase()}* foi concluído.\n\n`;
        message += `📊 Conformidade: *${rate}%*\n`;
        message += `🕒 Concluído às: ${time}\n`;
        message += `👤 Executor: ${execution.user?.name || execution.externalUserName || 'N/A'}\n\n`;

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
        if (formatType === "BOTH") message += `\n🔗 Relatório completo: ${reportLink}`;
      } else {
        message = `*✅ RELATÓRIO INDIVIDUAL - ${checklist.sector.name}*\n\n`;
        message += `O checklist *${checklist.title.toUpperCase()}* foi concluído.\n\n`;
        message += `📊 Conformidade: *${rate}%*\n`;
        message += `🕒 Concluído às: ${time}\n`;
        message += `👤 Executor: ${execution.user?.name || execution.externalUserName || 'N/A'}\n\n`;
        message += `_O detalhamento técnico segue em PDF._`;
      }
    }

    let pdfPath = null;
    let pdfFilename = null;
    if (formatType === "PDF" || formatType === "BOTH") {
      try {
        pdfPath = await pdfService.generateChecklistExecutionPDF(execution);
        pdfFilename = `Auditoria_${checklist.id}_${format(now, 'HHmm')}.pdf`;
      } catch (error) {
        logger.error(`[ChecklistReport] Erro ao gerar PDF individual:`, error);
      }
    }

    // Enviar para todos os destinatários
    const results = [];
    for (const recipient of recipients) {
      const result = await this.sendWithRetry(
        instance.name,
        recipient,
        message,
        pdfPath,
        pdfFilename,
        `Auditoria Detalhada - ${checklist.title}`
      );

      await this.logReport(checklist.restaurantId, 'INDIVIDUAL', recipient, result.success ? 'SUCCESS' : 'FAILED', {
        checklistId,
        errorMessage: result.error?.message,
        retryCount: result.attempts - 1,
        summary: `${checklist.title}: ${rate}% conformidade, executor: ${execution.user?.name || execution.externalUserName}`
      });

      results.push({ recipient, success: result.success });
    }

    // Limpar PDF
    if (pdfPath && fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }

    return results;
  }

  async checkIndividualDeadlines() {
    const now = this.getSaoPauloDate();
    const currentTime = format(now, "HH:mm");
    const start = startOfDay(now);
    const end = endOfDay(now);

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

    const checklistIds = checklistsWithDeadline.map(c => c.id);
    const executions = checklistIds.length > 0
      ? await prisma.checklistExecution.findMany({
          where: {
            checklistId: { in: checklistIds },
            completedAt: { gte: start, lte: end }
          },
          include: {
            checklist: { include: { sector: true, tasks: true } },
            responses: { include: { task: true } },
            user: { select: { name: true } }
          }
        })
      : [];

    const executionMap = {};
    executions.forEach(exec => {
      if (!executionMap[exec.checklistId]) {
        executionMap[exec.checklistId] = exec;
      }
    });

    for (const checklist of checklistsWithDeadline) {
      const settings = checklist.restaurant.checklistReportSettings;
      const instance = checklist.restaurant.whatsappInstance;

      if (!settings || !settings.enabled || !settings.recipientPhone) continue;
      if (!instance || instance.status !== 'CONNECTED') continue;

      const recipients = this.getRecipients(settings);
      const execution = executionMap[checklist.id];

      for (const recipient of recipients) {
        if (!execution) {
          let message = `*⚠️ ALERTA DE OPERAÇÃO EM ATRASO*\n\n`;
          message += `O checklist *${checklist.title}* do setor *${checklist.sector.name}* ainda não foi realizado hoje.\n\n`;
          message += `⏰ Horário Limite: ${checklist.deadlineTime}\n`;
          message += `📍 Status: *PENDENTE*\n\n`;
          message += `_Notificação automática KiCardapio_`;

          try {
            await evolutionService.sendText(instance.name, recipient, message);
            await this.logReport(checklist.restaurantId, 'DEADLINE_ALERT', recipient, 'SUCCESS', {
              checklistId: checklist.id,
              summary: `Alerta atraso: ${checklist.title} - ${checklist.sector.name}`
            });
          } catch (error) {
            logger.error(`[ChecklistDeadline] Erro ao enviar alerta:`, error);
            await this.logReport(checklist.restaurantId, 'DEADLINE_ALERT', recipient, 'FAILED', {
              checklistId: checklist.id,
              errorMessage: error.message
            });
          }
        } else {
          const okTasks = execution.responses.filter(r => r.isOk).length;
          const totalTasks = execution.responses.length;
          const rate = totalTasks > 0 ? ((okTasks / totalTasks) * 100).toFixed(0) : 0;
          const time = format(execution.completedAt, "HH:mm");
          const formatType = settings.reportFormat || "PDF";
          const reportLink = `${this.getFrontendUrl()}/checklist/report/${execution.id}`;

          if (formatType === "LINK") {
            let message = `*✅ CHECKLIST REALIZADO - ${checklist.sector.name}*\n\n`;
            message += `📋 *${checklist.title}*\n`;
            message += `📊 Conformidade: *${rate}%*\n`;
            message += `🕒 Concluído às: ${time}\n`;
            message += `👤 Executor: ${execution.user?.name || execution.externalUserName || 'N/A'}\n\n`;
            message += `🔗 Ver relatório completo:\n${reportLink}`;

            try {
              await evolutionService.sendText(instance.name, recipient, message);
              await this.logReport(checklist.restaurantId, 'DEADLINE_OK', recipient, 'SUCCESS', {
                checklistId: checklist.id,
                summary: `${checklist.title}: ${rate}% conformidade`
              });
            } catch (error) {
              logger.error(`[ChecklistDeadline] Erro ao enviar mensagem:`, error);
              await this.logReport(checklist.restaurantId, 'DEADLINE_OK', recipient, 'FAILED', {
                checklistId: checklist.id,
                errorMessage: error.message
              });
            }
          } else {
            let message = `*✅ CHECKLIST REALIZADO - ${checklist.sector.name}*\n\n`;
            message += `O checklist *${checklist.title}* foi concluído.\n\n`;
            message += `📊 Conformidade: *${rate}%*\n`;
            message += `🕒 Concluído às: ${time}\n`;
            message += `👤 Executor: ${execution.user?.name || execution.externalUserName || 'N/A'}\n\n`;
            message += `_O detalhamento técnico segue em PDF._`;

            let pdfPath = null;
            try {
              pdfPath = await pdfService.generateChecklistExecutionPDF(execution);
              
              const result = await this.sendWithRetry(
                instance.name,
                recipient,
                message,
                pdfPath,
                `Auditoria_${checklist.id}_${format(now, 'HHmm')}.pdf`,
                `Auditoria Detalhada - ${checklist.title}`
              );

              await this.logReport(checklist.restaurantId, 'DEADLINE_OK', recipient, result.success ? 'SUCCESS' : 'FAILED', {
                checklistId: checklist.id,
                errorMessage: result.error?.message,
                retryCount: result.attempts - 1,
                summary: `${checklist.title}: ${rate}% conformidade`
              });
            } catch (error) {
              logger.error(`[ChecklistDeadline] Erro ao enviar PDF:`, error);
              await this.logReport(checklist.restaurantId, 'DEADLINE_OK', recipient, 'FAILED', {
                checklistId: checklist.id,
                errorMessage: error.message
              });
            } finally {
              if (pdfPath && fs.existsSync(pdfPath)) {
                fs.unlinkSync(pdfPath);
              }
            }
          }
        }
      }
    }
  }
}

module.exports = new ChecklistReportService();
