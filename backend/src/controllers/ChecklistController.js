const prisma = require('../lib/prisma');
const asyncHandler = require('../middlewares/asyncHandler');
const { differenceInSeconds } = require('date-fns');

const checklistReportService = require('../services/ChecklistReportService');

class ChecklistController {
  // ... (existing methods)

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
    const { sectorId } = req.query;

    const checklists = await prisma.checklist.findMany({
      where: { 
        restaurantId,
        ...(sectorId && { sectorId })
      },
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
    res.json(checklists);
  });

  show = asyncHandler(async (req, res) => {
    const { id } = req.params;
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
    res.json(checklist);
  });

  store = asyncHandler(async (req, res) => {
    const { restaurantId } = req;
    const { title, description, frequency, sectorId, tasks, deadlineTime } = req.body;

    const checklist = await prisma.checklist.create({
      data: {
        title, description, frequency, sectorId, restaurantId, deadlineTime,
        tasks: {
          create: (tasks || []).map((t, idx) => ({
            content: t.content,
            isRequired: t.isRequired ?? true,
            type: t.type || 'CHECKBOX',
            order: idx,
            procedureType: t.procedureType || 'NONE',
            procedureContent: t.procedureContent,
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
    const { title, description, frequency, sectorId, tasks, isActive, deadlineTime } = req.body;

    const existingChecklist = await prisma.checklist.findFirst({
      where: { id, restaurantId }
    });

    if (!existingChecklist) {
      res.status(404);
      throw new Error("Checklist não encontrado");
    }

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
                isActive: true
              }
            });
          }
        }
      }

      return await tx.checklist.update({
        where: { id },
        data: {
          title, description, frequency, sectorId, isActive, deadlineTime
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

    const validTaskIds = checklist.tasks.map(t => t.id);
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
    const { checklistId, startDate, endDate } = req.query;

    const history = await prisma.checklistExecution.findMany({
      where: {
        restaurantId,
        ...(checklistId && { checklistId }),
        ...(startDate && endDate && {
          completedAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        })
      },
      include: {
        checklist: true,
        user: { select: { name: true } },
        responses: {
            include: { task: true }
        }
      },
      orderBy: { completedAt: 'desc' }
    });

    res.json(history);
  });

  getReportSettings = asyncHandler(async (req, res) => {
    const { restaurantId } = req;
    const settings = await prisma.checklistReportSettings.upsert({
      where: { restaurantId },
      update: {},
      create: { restaurantId, enabled: false, sendTime: '22:00' }
    });
    res.json(settings);
  });

  updateReportSettings = asyncHandler(async (req, res) => {
    const { restaurantId } = req;
    const { enabled, recipientPhone, sendTime, reportFormat } = req.body;

    const settings = await prisma.checklistReportSettings.upsert({
      where: { restaurantId },
      update: { enabled, recipientPhone, sendTime, reportFormat },
      create: { restaurantId, enabled, recipientPhone, sendTime, reportFormat }
    });

    res.json(settings);
  });

  uploadFile = asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400);
      throw new Error("Nenhum arquivo enviado");
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });
}

module.exports = new ChecklistController();
