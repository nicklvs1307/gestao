const { z } = require('zod');

exports.OpenCashierSchema = z.object({
  initialAmount: z.number().min(0).default(0),
});

exports.CloseCashierSchema = z.object({
  finalAmount: z.number().min(0),
  notes: z.string().optional().nullable(),
  closingDetails: z.record(z.string(), z.string()).optional().nullable(),
  
  // === Campos Avançados ===
  cashLeftover: z.number().min(0).default(0),
  moneyCountJson: z.record(z.string(), z.number()).optional().nullable(),
});

exports.CashierTransactionSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(['INCOME', 'EXPENSE']),
});