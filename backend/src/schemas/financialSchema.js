const { z } = require('zod');

const TransactionType = z.enum(['INCOME', 'EXPENSE']);
const TransactionStatus = z.enum(['PENDING', 'PAID', 'CANCELED']);

const CreateTransactionSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.number().positive("Valor deve ser positivo"),
  type: TransactionType,
  dueDate: z.string().transform(str => new Date(str)),
  status: TransactionStatus.default('PENDING'),
  paymentMethod: z.string().optional().nullable(),
  paymentDate: z.string().transform(str => str ? new Date(str) : null).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  bankAccountId: z.string().optional().nullable(),
  recipientUserId: z.string().optional().nullable(),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).optional().nullable(),
  recurrenceEndDate: z.string().transform(str => str ? new Date(str) : null).optional().nullable(),
});

const TransferSchema = z.object({
  fromAccountId: z.string(),
  toAccountId: z.string(),
  amount: z.number().positive(),
  date: z.string().transform(str => new Date(str)).optional(),
  description: z.string().optional(),
});

const SupplierSchema = z.object({
  name: z.string().min(1),
  cnpj: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
});

module.exports = {
  CreateTransactionSchema,
  TransferSchema,
  SupplierSchema
};