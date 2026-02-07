const { z } = require('zod');

const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional().nullable(),
  cuisineType: z.string().optional().default('Geral'),
  saiposIntegrationCode: z.string().optional().nullable(),
  
  // Regras de Pizza
  halfAndHalfRule: z.enum(['NONE', 'HIGHER_VALUE', 'AVERAGE_VALUE']).default('NONE'),
  
  // Disponibilidade
  availableDays: z.string().optional().default('1,2,3,4,5,6,7'),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  
  parentId: z.string().optional().nullable(),
  order: z.number().int().optional().default(0),
});

const UpdateCategorySchema = CreateCategorySchema.partial();

const ReorderCategoriesSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    order: z.number().int()
  }))
});

module.exports = {
  CreateCategorySchema,
  UpdateCategorySchema,
  ReorderCategoriesSchema
};
