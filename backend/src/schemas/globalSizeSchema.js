const { z } = require('zod');

const CreateGlobalSizeSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
});

const UpdateGlobalSizeSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").optional(),
  description: z.string().optional(),
});

module.exports = {
  CreateGlobalSizeSchema,
  UpdateGlobalSizeSchema,
};
