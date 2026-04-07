/**
 * Utilitário centralizado para operações monetárias seguras no Frontend.
 * 
 * PROBLEMA: JavaScript usa floating-point (IEEE 754), o que causa erros de precisão:
 *   0.1 + 0.2 = 0.30000000000000004
 * 
 * SOLUÇÃO: Todas as operações monetárias passam por este módulo que
 * garante arredondamento para 2 casas decimais após CADA operação.
 */

const DECIMALS = 2;
const MULTIPLIER = Math.pow(10, DECIMALS);

/**
 * Arredonda um valor monetário para 2 casas decimais de forma segura.
 * Esta é a função fundamental - TODA operação monetária deve passar por aqui.
 */
export function round(value: number): number {
  if (typeof value !== 'number' || isNaN(value)) return 0;
  return Math.round(value * MULTIPLIER) / MULTIPLIER;
}

/**
 * Soma segura de valores monetários.
 * 
 * @example
 * money.add(0.1, 0.2) // => 0.3 (não 0.30000000000000004)
 */
export function add(...values: number[]): number {
  const sum = values.reduce((acc, val) => acc + (Number(val) || 0), 0);
  return round(sum);
}

/**
 * Subtração segura de valores monetários.
 */
export function subtract(a: number, b: number): number {
  return round((Number(a) || 0) - (Number(b) || 0));
}

/**
 * Multiplicação segura de valores monetários.
 * 
 * @example
 * money.multiply(15.90, 3) // => 47.70 (preço × quantidade)
 */
export function multiply(value: number, multiplier: number): number {
  return round((Number(value) || 0) * (Number(multiplier) || 0));
}

/**
 * Calcula porcentagem de forma segura.
 * 
 * @example
 * money.percentage(200, 15) // => 30.00 (15% de 200)
 */
export function percentage(value: number, percent: number): number {
  return round((Number(value) || 0) * (Number(percent) || 0) / 100);
}

/**
 * Calcula o total de um pedido de forma segura.
 */
export function calcOrderTotal(params: {
  subtotal: number;
  deliveryFee?: number;
  discount?: number;
  extraCharge?: number;
}): number {
  return round(
    (Number(params.subtotal) || 0) +
    (Number(params.deliveryFee) || 0) +
    (Number(params.extraCharge) || 0) -
    (Number(params.discount) || 0)
  );
}

/**
 * Calcula o saldo de caixa de forma segura.
 */
export function calcCashierBalance(params: {
  initialAmount: number;
  income?: number;
  expense?: number;
  reforco?: number;
  sangria?: number;
}): number {
  return round(
    (Number(params.initialAmount) || 0) +
    (Number(params.income) || 0) +
    (Number(params.reforco) || 0) -
    (Number(params.expense) || 0) -
    (Number(params.sangria) || 0)
  );
}

/**
 * Calcula a diferença entre valor esperado e informado.
 * Positivo = sobra, Negativo = falta
 */
export function calcDifference(expected: number, informed: number): number {
  return round((Number(informed) || 0) - (Number(expected) || 0));
}

/**
 * Valida se um desconto é válido (não negativo e não maior que o subtotal).
 */
export function validateDiscount(discount: number, subtotal: number): { valid: boolean; reason?: string } {
  const d = Number(discount) || 0;
  const s = Number(subtotal) || 0;
  
  if (d < 0) return { valid: false, reason: 'Desconto não pode ser negativo' };
  if (d > s) return { valid: false, reason: 'Desconto não pode ser maior que o subtotal' };
  return { valid: true };
}

/**
 * Converte string de moeda para número seguro.
 * Lida com "10,50" (BR) e "10.50" (US).
 */
export function parseCurrency(value: string | number): number {
  if (typeof value === 'number') return round(value);
  if (!value || typeof value !== 'string') return 0;
  
  let cleaned = value.trim();
  
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : round(parsed);
}

/**
 * Formata valor monetário para exibição (padrão brasileiro).
 */
export function formatBRL(value: number): string {
  const num = Number(value) || 0;
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Soma um array de valores monetários de forma segura.
 */
export function sumArray(values: number[]): number {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + (Number(val) || 0), 0);
  return round(sum);
}

/**
 * Calcula preço de produto com tamanho, adicionais e quantidade.
 * TODAS as operações usam arredondamento seguro.
 */
export function calcProductPrice(params: {
  basePrice: number;
  addonPrice?: number;
  quantity?: number;
}): number {
  const unitPrice = add(Number(params.basePrice) || 0, Number(params.addonPrice) || 0);
  return multiply(unitPrice, Number(params.quantity) || 1);
}
