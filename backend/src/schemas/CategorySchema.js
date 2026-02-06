const { z } = require('zod');

const CreateCategorySchema = z.object({
  name: z.string().min(1, "Nome da categoria é obrigatório"),
  parentId: z.string().uuid().optional().nullable(),
  order: z.number().int().default(0),
  saiposIntegrationCode: z.string().optional().nullable(),
});

const UpdateCategorySchema = CreateCategorySchema.partial();

const ReorderCategoriesSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    order: z.number().int()
  })).min(1)
});

module.exports = {
  CreateCategorySchema,
  UpdateCategorySchema,
  ReorderCategoriesSchema
};