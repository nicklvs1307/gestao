const { z } = require('zod');

const ProductSizeSchema = z.object({
  name: z.string(),
  price: z.number().min(0),
  order: z.number().default(0),
  saiposIntegrationCode: z.string().optional().nullable(),
});

const ProductIngredientSchema = z.object({
  ingredientId: z.string(),
  quantity: z.number().min(0.0001),
});

const CreateProductSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional().nullable(),
  price: z.number().min(0),
  imageUrl: z.string().optional().nullable(),
  isFeatured: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
  stock: z.number().int().default(0),
  productionArea: z.string().default("Cozinha"),
  saiposIntegrationCode: z.string().optional().nullable(),
  
  // Categorias (Suporta ID único legado ou array)
  categoryId: z.string().optional().nullable(),
  categoryIds: z.array(z.string()).optional(),

  // Relações complexas
  sizes: z.array(ProductSizeSchema).optional().default([]),
  addonGroups: z.array(z.object({ id: z.string() })).optional().default([]),
  ingredients: z.array(ProductIngredientSchema).optional().default([]),
  
  // Campos Fiscais
  ncm: z.string().optional().nullable(),
  cfop: z.string().optional().nullable(),
  measureUnit: z.string().default("UN"),
});

const UpdateProductSchema = CreateProductSchema.partial();

module.exports = {
  CreateProductSchema,
  UpdateProductSchema
};