const { z } = require('zod');

const IngredientSchema = z.object({
  name: z.string().min(1, "Nome do insumo é obrigatório"),
  unit: z.string().default("un"),
  groupId: z.string().optional().nullable(),
  stock: z.number().default(0),
  minStock: z.number().default(0),
  averageCost: z.number().optional().default(0),
  controlStock: z.boolean().default(true),
  controlCmv: z.boolean().default(true),
  isProduced: z.boolean().default(false),
});

const StockEntryItemSchema = z.object({
  ingredientId: z.string(),
  quantity: z.number().positive(),
  unitCost: z.number().min(0),
  batch: z.string().optional().nullable(),
  expirationDate: z.string().transform(str => str ? new Date(str) : null).optional().nullable(),
});

const CreateStockEntrySchema = z.object({
  supplierId: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  receivedAt: z.string().transform(str => str ? new Date(str) : new Date()).optional(),
  items: z.array(StockEntryItemSchema).min(1, "Pelo menos um item é necessário"),
});

const ProductionSchema = z.object({
  ingredientId: z.string(),
  quantity: z.number().positive(),
});

const RecipeItemSchema = z.object({
  componentIngredientId: z.string(),
  quantity: z.number().positive(),
});

const SaveRecipeSchema = z.object({
  items: z.array(RecipeItemSchema).min(1),
});

module.exports = {
  IngredientSchema,
  CreateStockEntrySchema,
  ProductionSchema,
  SaveRecipeSchema
};