const { z } = require('zod');

const CreateTableSchema = z.object({
  number: z.number().int().positive("Número da mesa deve ser positivo"),
  status: z.enum(['free', 'occupied', 'awaiting_payment']).default('free'),
});

const TableCheckoutSchema = z.object({
  orderIds: z.array(z.string()).optional(),
  payments: z.array(z.object({
    amount: z.number().positive(),
    method: z.string()
  })).min(1, "Pelo menos um pagamento é necessário")
});

const PartialPaymentSchema = z.object({
  orderId: z.string().optional(),
  itemIds: z.array(z.string()).optional(),
  payments: z.array(z.object({
    amount: z.number().positive(),
    method: z.string()
  })).min(1)
});

module.exports = {
  CreateTableSchema,
  TableCheckoutSchema,
  PartialPaymentSchema
};