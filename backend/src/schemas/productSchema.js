const { z } = require('zod');

// Schema Base
const productBase = {
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional().nullable(),
  price: z.coerce.number().min(0, 'Preço deve ser maior ou igual a zero'),
  imageUrl: z.string().optional().nullable().or(z.literal('')),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  productionArea: z.string().optional().default('Cozinha'),
  saiposIntegrationCode: z.string().optional().nullable(),
  stock: z.coerce.number().int().default(0),
  measureUnit: z.string().default('UN'),
  order: z.coerce.number().default(0),
  
  // IDs de relacionamento
  categoryId: z.string().optional().nullable(),
  categoryIds: z.array(z.string()).optional(),
  
  // Campos Fiscais
  ncm: z.string().optional().nullable(),
  cfop: z.string().optional().nullable(),
  cest: z.string().optional().nullable(),
  origin: z.coerce.number().default(0),
  taxPercentage: z.coerce.number().optional().nullable(),

  // Arrays Complexos (Opcionais na criação simples, mas validados se presentes)
  sizes: z.array(z.object({
    name: z.string(),
    price: z.coerce.number(),
    order: z.coerce.number().optional(),
    saiposIntegrationCode: z.string().optional()
  })).default([]),
  
  addonGroups: z.array(z.object({
    id: z.string()
  })).default([]),
  
  ingredients: z.array(z.object({
    ingredientId: z.string(),
    quantity: z.coerce.number()
  })).default([]),

  pizzaConfig: z.any().optional().nullable()
};

const CreateProductSchema = z.object({
  ...productBase
});

const UpdateProductSchema = z.object({
  ...productBase,
  // No update, quase tudo é opcional, mas se vier, deve seguir a regra base
  name: z.string().min(1).optional(),
  price: z.coerce.number().min(0).optional(),
});

module.exports = { 
  CreateProductSchema, 
  UpdateProductSchema 
};