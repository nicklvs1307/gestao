const { z } = require('zod');

const OpenCashierSchema = z.object({
  initialAmount: z.number().min(0).default(0),
});

const CloseCashierSchema = z.object({
  finalAmount: z.number().min(0),
  notes: z.string().optional().nullable(),
  closingDetails: z.record(z.string(), z.string()).optional().nullable(),
  
  // === Campos Avançados ===
  cashLeftover: z.number().min(0).default(0), // Fundo de troco para amanhã
  moneyCountJson: z.record(z.string(), z.number()).optional().nullable(), // Contagem de cédulas
});

const CashierTransactionSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(['INCOME', 'EXPENSE']), // Reforço ou Sangria
});

module.exports = {
  OpenCashierSchema,
  CloseCashierSchema,
  CashierTransactionSchema
};