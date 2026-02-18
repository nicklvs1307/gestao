const prisma = require('../lib/prisma');
const asyncHandler = require('../middlewares/asyncHandler');

class ChecklistController {
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
        tasks: { orderBy: { order: 'asc' } },
        _count: { select: { tasks: true } }
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
        tasks: { orderBy: { order: 'asc' } } 
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
    const { title, description, frequency, sectorId, tasks } = req.body;

    const checklist = await prisma.checklist.create({
      data: {
        title, description, frequency, sectorId, restaurantId,
        tasks: {
          create: tasks?.map((t, idx) => ({
            content: t.content,
            isRequired: t.isRequired ?? true,
            type: t.type || 'CHECKBOX',
            order: idx
          }))
        }
      },
      include: { tasks: true }
    });
    res.status(201).json(checklist);
  });

  update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, frequency, sectorId, tasks, isActive } = req.body;

    const checklist = await prisma.$transaction(async (tx) => {
      if (tasks) {
        await tx.checklistTask.deleteMany({ where: { checklistId: id } });
      }

      return await tx.checklist.update({
        where: { id },
        data: {
          title, description, frequency, sectorId, isActive,
          ...(tasks && {
            tasks: {
              create: tasks.map((t, idx) => ({
                content: t.content,
                isRequired: t.isRequired ?? true,
                type: t.type || 'CHECKBOX',
                order: idx
              }))
            }
          })
        },
        include: { tasks: true }
      });
    });

    res.json(checklist);
  });

  delete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.checklist.delete({ where: { id } });
    res.json({ message: 'Checklist excluído.' });
  });

  // Execuções e Respostas
  submitExecution = asyncHandler(async (req, res) => {
    const { user } = req;
    const { checklistId, notes, responses, userName } = req.body;

    // Busca o restaurantId do checklist se não estiver no req (acesso público)
    let restaurantId = req.restaurantId;
    if (!restaurantId) {
      const checklist = await prisma.checklist.findUnique({ 
        where: { id: checklistId },
        select: { restaurantId: true }
      });
      if (!checklist) {
        res.status(404);
        throw new Error("Checklist não encontrado");
      }
      restaurantId = checklist.restaurantId;
    }

    const execution = await prisma.checklistExecution.create({
      data: {
        checklistId,
        userId: user?.id || undefined, 
        restaurantId: restaurantId,
        notes: userName ? `[Executado por: ${userName}] ${notes || ''}` : notes,
        status: 'COMPLETED',
        responses: {
          create: responses.map(r => ({
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
        responses: true
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
    const { enabled, recipientPhone, sendTime } = req.body;

    const settings = await prisma.checklistReportSettings.upsert({
      where: { restaurantId },
      update: { enabled, recipientPhone, sendTime },
      create: { restaurantId, enabled, recipientPhone, sendTime }
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
