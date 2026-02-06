const { z } = require('zod');

const CreateTableSchema = z.object({
  number: z.coerce.number().int().positive('Número da mesa deve ser positivo'),
});

const TableCheckoutSchema = z.object({
  paymentMethod: z.string().min(1, 'Forma de pagamento é obrigatória'), 
  splitCount: z.number().int().min(1).optional().default(1),
  
  // Opcional: Se for pagar só uma parte do valor total agora (não suportado totalmente ainda no service, mas bom prever)
  paidAmount: z.number().positive().optional()
});

const PartialPaymentSchema = z.object({
  itemIds: z.array(z.string()).min(1, 'Selecione ao menos um item para pagar'),
  paymentMethod: z.string().min(1, 'Forma de pagamento é obrigatória')
});

module.exports = {
  CreateTableSchema,
  TableCheckoutSchema,
  PartialPaymentSchema
};
