const { z } = require('zod');

const weekDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

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
      type: z.enum(['CHECKBOX', 'PHOTO', 'TEXT', 'NUMBER']).default('CHECKBOX'),
      procedureType: z.enum(['NONE', 'TEXT', 'IMAGE', 'VIDEO']).default('NONE'),
      procedureContent: z.string().optional().nullable()
    })).min(1, "O checklist deve ter pelo menos uma tarefa")
  })
});

const checklistSubmitSchema = z.object({
  body: z.object({
    checklistId: z.string().cuid("ID de checklist inválido"),
    userName: z.string().optional(),
    notes: z.string().optional(),
    startedAt: z.string().datetime().optional(),
    responses: z.array(z.object({
      taskId: z.string().cuid("ID de tarefa inválido"),
      value: z.any(),
      isOk: z.boolean().default(true),
      notes: z.string().optional()
    })).min(1, "Pelo menos uma resposta deve ser enviada")
  })
});

module.exports = {
  checklistStoreSchema,
  checklistSubmitSchema
};
