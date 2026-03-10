const { z } = require('zod');

const checklistStoreSchema = z.object({
  body: z.object({
    title: z.string().min(3, "O título deve ter pelo menos 3 caracteres"),
    description: z.string().optional(),
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('DAILY'),
    sectorId: z.string().cuid("ID de setor inválido"),
    tasks: z.array(z.object({
      id: z.string().optional(),
      content: z.string().min(1, "O conteúdo da tarefa é obrigatório"),
      isRequired: z.boolean().default(true),
      type: z.enum(['CHECKBOX', 'PHOTO', 'TEXT', 'NUMBER']).default('CHECKBOX')
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
