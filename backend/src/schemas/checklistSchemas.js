const { z } = require('zod');

const weekDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const taskTypes = ['CHECKBOX', 'PHOTO', 'TEXT', 'NUMBER'];
const procedureTypes = ['NONE', 'TEXT', 'IMAGE', 'VIDEO'];

const checklistStoreSchema = z.object({
  body: z.object({
    title: z.string().min(3, "O título deve ter pelo menos 3 caracteres"),
    description: z.string().optional().nullable(),
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('DAILY'),
    isActive: z.boolean().optional(),
    deadlineTime: z.preprocess(
      (val) => (val === "" ? null : val),
      z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Horário inválido (HH:mm)").optional().nullable()
    ),
    days: z.preprocess(
      (val) => {
        if (!val) return null;
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch { return val; }
        }
        return val;
      },
      z.array(z.enum(weekDays)).optional().nullable()
    ),
    sectorId: z.string().cuid("ID de setor inválido"),
    tasks: z.array(z.object({
      id: z.string().optional(),
      content: z.string().min(1, "O conteúdo da tarefa é obrigatório"),
      isRequired: z.boolean().default(true),
      type: z.enum(taskTypes).default('CHECKBOX'),
      procedureType: z.enum(procedureTypes).default('NONE'),
      procedureContent: z.string().optional().nullable()
    })).min(1, "O checklist deve ter pelo menos uma tarefa")
  })
});

const taskResponseSchemas = {
  CHECKBOX: z.boolean(),
  PHOTO: z.string().min(1, "Foto é obrigatória"),
  TEXT: z.string().min(1, "Texto é obrigatório"),
  NUMBER: z.union([
    z.number(),
    z.string().transform((val) => Number(val)).pipe(z.number().min(0, "Valor deve ser positivo"))
  ])
};

const checklistSubmitSchema = z.object({
  body: z.object({
    checklistId: z.string().cuid("ID de checklist inválido"),
    userName: z.string().max(100, "Nome muito longo").optional(),
    notes: z.string().max(1000, "Notas muito longas").optional(),
    startedAt: z.string().datetime().optional(),
    responses: z.array(z.object({
      taskId: z.string().cuid("ID de tarefa inválido"),
      value: z.union([
        taskResponseSchemas.CHECKBOX,
        taskResponseSchemas.PHOTO,
        taskResponseSchemas.TEXT,
        taskResponseSchemas.NUMBER
      ]).optional(),
      isOk: z.boolean().default(true),
      notes: z.string().max(500, "Observação muito longa").optional()
    })).min(1, "Pelo menos uma resposta deve ser enviada")
  })
});

const checklistUpdateSchema = checklistStoreSchema.partial();

const sectorSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Nome do setor é obrigatório").max(100, "Nome muito longo")
  })
});

module.exports = {
  checklistStoreSchema,
  checklistSubmitSchema,
  checklistUpdateSchema,
  sectorSchema,
  taskTypes,
  procedureTypes
};
