/**
 * Métodos de pagamento padrão criados quando um restaurante não tem nenhum configurado.
 */

const DEFAULT_PAYMENT_METHODS = [
  { name: 'Dinheiro', type: 'CASH', allowDelivery: true, allowPos: true, allowTable: true },
  { name: 'Pix', type: 'PIX', allowDelivery: true, allowPos: true, allowTable: true },
  { name: 'Cartão de Crédito', type: 'CREDIT_CARD', allowDelivery: true, allowPos: true, allowTable: true },
  { name: 'Cartão de Débito', type: 'DEBIT_CARD', allowDelivery: true, allowPos: true, allowTable: true },
  { name: 'Outros', type: 'OTHER', allowDelivery: true, allowPos: true, allowTable: true },
];

const DEFAULT_PAYMENT_METHODS_PUBLIC = [
  { name: 'Dinheiro', type: 'CASH', allowDelivery: true, allowPos: true, allowTable: true },
  { name: 'Pix', type: 'PIX', allowDelivery: true, allowPos: true, allowTable: true },
  { name: 'Cartão de Crédito', type: 'CREDIT_CARD', allowDelivery: true, allowPos: true, allowTable: true },
  { name: 'Cartão de Débito', type: 'DEBIT_CARD', allowDelivery: true, allowPos: true, allowTable: true },
];

module.exports = { DEFAULT_PAYMENT_METHODS, DEFAULT_PAYMENT_METHODS_PUBLIC };
