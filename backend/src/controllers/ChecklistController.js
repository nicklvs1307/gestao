const prisma = require('../lib/prisma');
const asyncHandler = require('../middlewares/asyncHandler');
const { differenceInSeconds } = require('date-fns');

const checklistReportService = require('../services/ChecklistReportService');

class ChecklistController {
  // ... (existing methods)

  getAvailableToday = asyncHandler(async (req, res) => {
    const { restaurantId } = req;
    const { sectorId } = req.query;

    const weekDays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const today = weekDays[new Date().getDay()];
    const todayStr = today;

    const whereClause = {
      restaurantId,
      isActive: true,
      ...(sectorId && { sectorId }),
      OR: [
        { days: null },
        { days: { contains: today } }
      ]
    };

    const checklists = await prisma.checklist.findMany({
      where: whereClause,
      include: {
        sector: true,
        tasks: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            tasks: { where: { isActive: true } }
          }
        }
      },
      orderBy: { title: 'asc' }
    });

    const filteredChecklists = checklists.map(checklist => {
      const allTasks = checklist.tasks || [];
      const validTasks = allTasks.filter(task => {
        let taskDays = [];
        if (task.days) {
          try {
            taskDays = typeof task.days === 'string' ? JSON.parse(task.days) : (Array.isArray(task.days) ? task.days : []);
          } catch (e) {
            taskDays = [];
          }
        }
        if (taskDays.length === 0) return true;
        return taskDays.includes(todayStr);
      });
      return {
        ...checklist,
        tasks: validTasks,
        _count: { tasks: validTasks.length }
      };
    });

    res.json({ data: filteredChecklists, today });
  });

  sendManualDailyReport = asyncHandler(async (req, res) => {
    const { restaurantId } = req;
    await checklistReportService.generateDailyReport(restaurantId);
    res.json({ message: "Relatório geral enviado com sucesso!" });
  });

  sendManualIndividualReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await checklistReportService.sendIndividualReport(id);
    res.json({ message: "Relatório individual enviado com sucesso!" });
  });

  index = asyncHandler(async (req, res) => {
    const { restaurantId } = req;
    const { sectorId, search, day } = req.query;

    const weekDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

    const whereClause = {
      restaurantId,
      ...(sectorId && { sectorId }),
      ...(day && weekDays.includes(day.toUpperCase()) ? {
        OR: [
          { days: null },
          { days: { contains: day.toUpperCase() } }
        ]
      } : {})
    };

    const [checklists, totalCount] = await Promise.all([
      prisma.checklist.findMany({
        where: whereClause,
        include: {
          sector: true,
          tasks: {
            where: { isActive: true },
            orderBy: { order: 'asc' }
          },
          _count: {
            select: {
              tasks: { where: { isActive: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.checklist.count({ where: whereClause })
    ]);

    res.json({ data: checklists, total: totalCount });
  });

show = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { checkDay } = req.query;
  
  const checklist = await prisma.checklist.findUnique({
    where: { id },
    include: { 
      sector: true, 
      tasks: { 
        where: { isActive: true },
        orderBy: { order: 'asc' } 
      } 
    }
  });
  
  if (!checklist) {
    res.status(404);
    throw new Error("Checklist não encontrado");
  }

  const weekDays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

  if (checkDay === 'true' && checklist.days) {
    const today = weekDays[new Date().getDay()];
    let allowedDays = [];
    try {
      allowedDays = typeof checklist.days === 'string' ? JSON.parse(checklist.days) : (Array.isArray(checklist.days) ? checklist.days : []);
    } catch (e) {
      allowedDays = [];
    }
    
    if (allowedDays.length > 0 && !allowedDays.includes(today)) {
      res.status(403);
      throw new Error(`Checklist disponível apenas em: ${allowedDays.join(', ')}`);
    }
  }

  if (checkDay === 'true') {
    const today = weekDays[new Date().getDay()];
    const todayStr = today;
    
    const allTasks = checklist.tasks || [];
    const filteredTasks = allTasks.filter(task => {
      let taskDays = [];
      if (task.days) {
        try {
          taskDays = typeof task.days === 'string' ? JSON.parse(task.days) : (Array.isArray(task.days) ? task.days : []);
        } catch (e) {
          taskDays = [];
        }
      }
      if (taskDays.length === 0) return true;
      return taskDays.includes(todayStr);
    });
    
    checklist.tasks = filteredTasks;
  }
  
  res.json(checklist);
});

  getExecutionReport = asyncHandler(async (req, res) => {
    const { executionId } = req.params;
    
    const execution = await prisma.checklistExecution.findUnique({
      where: { id: executionId },
      include: {
        checklist: {
          include: {
            sector: true
          }
        },
        user: { select: { name: true } },
        responses: {
          include: { task: true }
        }
      }
    });

    if (!execution) {
      res.status(404);
      throw new Error("Execução não encontrada");
    }

    res.json(execution);
  });

  store = asyncHandler(async (req, res) => {
    const { restaurantId } = req;
    const { title, description, frequency, sectorId, tasks, deadlineTime, days } = req.body;

    const daysString = Array.isArray(days) ? JSON.stringify(days) : days;

    const checklist = await prisma.checklist.create({
      data: {
        title, description, frequency, sectorId, restaurantId, deadlineTime, days: daysString,
        tasks: {
          create: (tasks || []).map((t, idx) => ({
            content: t.content,
            isRequired: t.isRequired ?? true,
            type: t.type || 'CHECKBOX',
            order: idx,
            procedureType: t.procedureType || 'NONE',
            procedureContent: t.procedureContent,
            days: t.days ? (Array.isArray(t.days) ? JSON.stringify(t.days) : t.days) : null,
            isActive: true
          }))
        }
      },
      include: { tasks: { where: { isActive: true } } }
    });
    res.status(201).json(checklist);
  });

  update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { restaurantId } = req;
    const { title, description, frequency, sectorId, tasks, isActive, deadlineTime, days } = req.body;

    const existingChecklist = await prisma.checklist.findFirst({
      where: { id, restaurantId }
    });

    if (!existingChecklist) {
      res.status(404);
      throw new Error("Checklist não encontrado");
    }

    const daysString = Array.isArray(days) ? JSON.stringify(days) : days;

    const checklist = await prisma.$transaction(async (tx) => {
      if (Array.isArray(tasks)) {
        const sentTaskIds = tasks.filter(t => t.id).map(t => t.id);
        
        // Soft Delete: Desativar tarefas que não foram enviadas
        await tx.checklistTask.updateMany({
          where: {
            checklistId: id,
            id: { notIn: sentTaskIds }
          },
          data: { isActive: false }
        });

        for (let i = 0; i < tasks.length; i++) {
          const t = tasks[i];
          const taskDays = t.days ? (Array.isArray(t.days) ? JSON.stringify(t.days) : t.days) : null;
          if (t.id) {
            await tx.checklistTask.update({
              where: { id: t.id },
              data: {
                content: t.content,
                isRequired: t.isRequired,
                type: t.type,
                order: i,
                procedureType: t.procedureType,
                procedureContent: t.procedureContent,
                days: taskDays,
                isActive: true // Garante que reative se for enviado
              }
            });
          } else {
            await tx.checklistTask.create({
              data: {
                checklistId: id,
                content: t.content,
                isRequired: t.isRequired,
                type: t.type,
                order: i,
                procedureType: t.procedureType || 'NONE',
                procedureContent: t.procedureContent,
                days: taskDays,
                isActive: true
              }
            });
          }
        }
      }

      return await tx.checklist.update({
        where: { id },
        data: {
          title, description, frequency, sectorId, isActive, deadlineTime, days: daysString
        },
        include: { 
          tasks: { 
            where: { isActive: true },
            orderBy: { order: 'asc' } 
          } 
        }
      });
    });

    res.json(checklist);
  });

  delete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { restaurantId } = req;

    const checklist = await prisma.checklist.findFirst({
        where: { id, restaurantId }
    });

    if (!checklist) {
        res.status(404);
        throw new Error("Checklist não encontrado");
    }

    await prisma.checklist.delete({ where: { id } });
    res.json({ message: 'Checklist excluído.' });
  });

  submitExecution = asyncHandler(async (req, res) => {
    const { user } = req;
    const { checklistId, notes, responses, userName, startedAt } = req.body;

    const checklist = await prisma.checklist.findUnique({ 
      where: { id: checklistId },
      include: { tasks: { select: { id: true } } }
    });

    if (!checklist) {
      res.status(404);
      throw new Error("Checklist não encontrado");
    }

    // Garantir que responses seja um array
    const responsesArray = Array.isArray(responses) ? responses : [];

    // Garantir que tasks seja um array (safety check)
    const checklistTasks = Array.isArray(checklist.tasks) ? checklist.tasks : [];

    const validTaskIds = checklistTasks.map(t => t.id);
    const invalidResponses = responsesArray.filter(r => !validTaskIds.includes(r.taskId));
    
    if (invalidResponses.length > 0) {
      res.status(400);
      throw new Error("Uma ou mais tarefas não pertencem a este checklist");
    }

    let durationSeconds = null;
    const completedAt = new Date();
    if (startedAt) {
      durationSeconds = differenceInSeconds(completedAt, new Date(startedAt));
    }

    const execution = await prisma.checklistExecution.create({
      data: {
        checklistId,
        userId: user?.id || undefined, 
        externalUserName: userName,
        restaurantId: checklist.restaurantId,
        notes,
        status: 'COMPLETED',
        startedAt: startedAt ? new Date(startedAt) : undefined,
        completedAt,
        durationSeconds,
        responses: {
          create: responsesArray.map(r => ({
            taskId: r.taskId,
            value: String(r.value),
            isOk: r.isOk ?? true,
            notes: r.notes
          }))
        }
      },
      include: { responses: true }
    });

    res.status(201).json(execution);
  });

  executions = asyncHandler(async (req, res) => {
    const { restaurantId } = req;
    const { checklistId, startDate, endDate, executionId, page = '1', limit = '10' } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    if (executionId) {
      const execution = await prisma.checklistExecution.findUnique({
        where: { id: executionId },
        include: {
          checklist: {
            include: { sector: true }
          },
          user: { select: { name: true } },
          responses: {
            include: { task: { select: { id: true, content: true, type: true } } }
          }
        }
      });

      if (!execution) {
        res.status(404);
        throw new Error("Execução não encontrada");
      }

      return res.json({ data: execution });
    }

    const whereClause = {
      restaurantId,
      ...(checklistId && { checklistId }),
      ...(startDate && endDate && {
        completedAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    const [history, totalCount] = await Promise.all([
      prisma.checklistExecution.findMany({
        where: whereClause,
        include: {
          checklist: {
            include: { sector: true }
          },
          user: { select: { name: true } },
          responses: {
            select: { id: true, value: true, isOk: true, notes: true, task: true }
          }
        },
        orderBy: { completedAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.checklistExecution.count({ where: whereClause })
    ]);

    res.json({
      data: history,
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum)
    });
  });

  stats = asyncHandler(async (req, res) => {
    const { restaurantId } = req;
    const { startDate, endDate } = req.query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateFilter = startDate && endDate
      ? {
          completedAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        }
      : {};

    const [
      totalChecklists,
      totalExecutions,
      todayExecutions,
      executionsWithResponses
    ] = await Promise.all([
      prisma.checklist.count({
        where: { restaurantId, isActive: true }
      }),
      prisma.checklistExecution.count({
        where: { restaurantId, ...dateFilter }
      }),
      prisma.checklistExecution.count({
        where: {
          restaurantId,
          completedAt: {
            gte: today,
            lt: tomorrow
          }
        }
      }),
      prisma.checklistExecution.findMany({
        where: { restaurantId, ...dateFilter },
        include: {
          responses: { select: { isOk: true } }
        }
      })
    ]);

    let totalTasks = 0;
    let okTasks = 0;
    executionsWithResponses.forEach(exec => {
      exec.responses.forEach(resp => {
        totalTasks++;
        if (resp.isOk) okTasks++;
      });
    });

    const avgConformity = totalTasks > 0 ? Math.round((okTasks / totalTasks) * 100) : 0;

    res.json({
      totalChecklists,
      totalExecutions,
      todayExecutions,
      avgConformity,
      totalTasks,
      okTasks
    });
  });

  getReportSettings = asyncHandler(async (req, res) => {
    const { restaurantId } = req;
    const settings = await prisma.checklistReportSettings.upsert({
      where: { restaurantId },
      update: {},
      create: { restaurantId, enabled: false, sendTime: '07:00', turnStartHour: '06:00' }
    });
    res.json(settings);
  });

  updateReportSettings = asyncHandler(async (req, res) => {
    const { restaurantId } = req;
    const { enabled, recipientPhone, recipientPhones, sendTime, turnStartHour, reportFormat, customMessage } = req.body;

    const settings = await prisma.checklistReportSettings.upsert({
      where: { restaurantId },
      update: { enabled, recipientPhone, recipientPhones, sendTime, turnStartHour, reportFormat, customMessage },
      create: { restaurantId, enabled, recipientPhone, recipientPhones, sendTime, turnStartHour, reportFormat, customMessage }
    });

    res.json(settings);
  });

  uploadFile = asyncHandler(async (req, res) => {
    const MAX_SIZES = require('../config/multer').MAX_SIZES;
    const path = require('path');
    const fs = require('fs');

    if (!req.file) {
      res.status(400);
      throw new Error("Nenhum arquivo enviado");
    }

    const { originalname, mimetype, size, path: originalPath, filename } = req.file;
    const isImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimetype);
    const isVideo = ['video/mp4', 'video/webm', 'video/quicktime'].includes(mimetype);

    // Validar tamanho antes deprocessar
    const maxSize = isImage ? MAX_SIZES.image : MAX_SIZES.video;
    if (size > maxSize) {
      fs.unlinkSync(originalPath);
      const typeLabel = isImage ? 'imagem' : 'vídeo';
      const sizeMB = (maxSize / (1024 * 1024)).toFixed(0);
      res.status(400);
      throw new Error(`Tamanho máximo para ${typeLabel}: ${sizeMB}MB`);
    }

    // Se arquivo muito pequeno (< 1KB), provavelmente é inválido
    if (size < 1024) {
      fs.unlinkSync(originalPath);
      res.status(400);
      throw new Error("Arquivo muito pequeno ou inválido");
    }

    if (isImage) {
      await this.convertImageToWebP(res, originalPath, filename, maxSize);
    } else if (isVideo) {
      await this.processVideo(res, originalPath, filename);
    } else {
      res.json({ url: `/uploads/${filename}` });
    }
  });

  convertImageToWebP = async (res, originalPath, filename, maxSize) => {
    const sharp = require('sharp');
    const path = require('path');
    const fs = require('fs');

    const webpFilename = filename.replace(/\.[^.]+$/, '.webp');
    const webpPath = path.join(path.dirname(originalPath), webpFilename);

    try {
      const stats = fs.statSync(originalPath);
      let quality = 80;
      let maxDimension = 1280;

      if (stats.size > 5 * 1024 * 1024) {
        quality = 65;
        maxDimension = 1024;
      } else if (stats.size > 2 * 1024 * 1024) {
        quality = 70;
        maxDimension = 1152;
      }

      await sharp(originalPath)
        .webp({ quality, effort: 6 })
        .resize(maxDimension, maxDimension, { fit: 'inside', withoutEnlargement: true })
        .toFile(webpPath);

      fs.unlinkSync(originalPath);
      res.json({ url: `/uploads/${webpFilename}` });
    } catch (error) {
      console.error('Erro ao converter imagem para WebP:', error);
      try { fs.unlinkSync(originalPath); } catch {}
      res.status(500);
      throw new Error("Erro ao processar imagem. Tente novamente.");
    }
  };

  processVideo = async (res, originalPath, filename) => {
    const path = require('path');
    const fs = require('fs');

    const ext = path.extname(filename).toLowerCase();
    const stats = fs.statSync(originalPath);
    console.log(`Vídeo recebido: ${filename} (${(stats.size / (1024 * 1024)).toFixed(2)}MB)`);

    res.json({ url: `/uploads/${filename}` });
  };

  // Histórico de envios de relatórios
  getReportLogs = asyncHandler(async (req, res) => {
    const { restaurantId } = req;
    const { page = '1', limit = '20', type } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const whereClause = {
      restaurantId,
      ...(type && { type })
    };

    const [logs, totalCount] = await Promise.all([
      prisma.checklistReportLog.findMany({
        where: whereClause,
        orderBy: { sentAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.checklistReportLog.count({ where: whereClause })
    ]);

    res.json({
      data: logs,
      total: totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum)
    });
  });
}

module.exports = new ChecklistController();
