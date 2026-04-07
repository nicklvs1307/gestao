/**
 * Utilitário centralizado para operações monetárias seguras.
 * 
 * PROBLEMA: JavaScript usa floating-point (IEEE 754), o que causa erros de precisão:
 *   0.1 + 0.2 = 0.30000000000000004
 * 
 * SOLUÇÃO: Todas as operações monetárias passam por este módulo que
 * garante arredondamento para 2 casas decimais após CADA operação.
 * 
 * USO: Substituir todas as operações diretas (+, -, *) envolvendo dinheiro
 * por estas funções.
 */

const DECIMALS = 2;
const MULTIPLIER = Math.pow(10, DECIMALS);

/**
 * Arredonda um valor monetário para 2 casas decimais de forma segura.
 * Esta é a função fundamental - TODA operação monetária deve passar por aqui.
 * 
 * @param {number} value - Valor a arredondar
 * @returns {number} Valor arredondado para 2 casas decimais
 */
function round(value) {
  if (typeof value !== 'number' || isNaN(value)) return 0;
  return Math.round(value * MULTIPLIER) / MULTIPLIER;
}

/**
 * Soma segura de valores monetários.
 * 
 * @param {...number} values - Valores a somar
 * @returns {number} Soma arredondada
 * 
 * @example
 * money.add(10.50, 20.30, 5.20) // => 36.00
 * money.add(0.1, 0.2) // => 0.3 (não 0.30000000000000004)
 */
function add(...values) {
  const sum = values.reduce((acc, val) => acc + (Number(val) || 0), 0);
  return round(sum);
}

/**
 * Subtração segura de valores monetários.
 * 
 * @param {number} a - Minuendo
 * @param {number} b - Subtraendo
 * @returns {number} Diferença arredondada
 * 
 * @example
 * money.subtract(10.50, 3.20) // => 7.30
 */
function subtract(a, b) {
  return round((Number(a) || 0) - (Number(b) || 0));
}

/**
 * Multiplicação segura de valores monetários.
 * 
 * @param {number} value - Valor base
 * @param {number} multiplier - Multiplicador (quantidade, porcentagem/100, etc.)
 * @returns {number} Produto arredondado
 * 
 * @example
 * money.multiply(15.90, 3) // => 47.70 (preço × quantidade)
 * money.multiply(100, 0.15) // => 15.00 (valor × porcentagem)
 */
function multiply(value, multiplier) {
  return round((Number(value) || 0) * (Number(multiplier) || 0));
}

/**
 * Calcula porcentagem de forma segura.
 * 
 * @param {number} value - Valor base
 * @param {number} percentage - Porcentagem (0-100)
 * @returns {number} Valor da porcentagem arredondado
 * 
 * @example
 * money.percentage(200, 15) // => 30.00 (15% de 200)
 */
function percentage(value, percent) {
  return round((Number(value) || 0) * (Number(percent) || 0) / 100);
}

/**
 * Calcula o total de um pedido de forma segura.
 * 
 * @param {Object} params
 * @param {number} params.subtotal - Soma dos itens
 * @param {number} [params.deliveryFee=0] - Taxa de entrega
 * @param {number} [params.discount=0] - Desconto
 * @param {number} [params.extraCharge=0] - Acréscimo
 * @returns {number} Total geral arredondado
 */
function calcOrderTotal({ subtotal, deliveryFee = 0, discount = 0, extraCharge = 0 }) {
  return round(
    (Number(subtotal) || 0) +
    (Number(deliveryFee) || 0) +
    (Number(extraCharge) || 0) -
    (Number(discount) || 0)
  );
}

/**
 * Calcula o saldo de caixa de forma segura.
 * 
 * @param {Object} params
 * @param {number} params.initialAmount - Fundo de caixa inicial
 * @param {number} [params.income=0] - Total de entradas
 * @param {number} [params.expense=0] - Total de saídas
 * @param {number} [params.reforco=0] - Reforços
 * @param {number} [params.sangria=0] - Sangrias
 * @returns {number} Saldo esperado arredondado
 */
function calcCashierBalance({ initialAmount, income = 0, expense = 0, reforco = 0, sangria = 0 }) {
  return round(
    (Number(initialAmount) || 0) +
    (Number(income) || 0) +
    (Number(reforco) || 0) -
    (Number(expense) || 0) -
    (Number(sangria) || 0)
  );
}

/**
 * Calcula a diferença entre valor esperado e informado.
 * 
 * @param {number} expected - Valor esperado pelo sistema
 * @param {number} informed - Valor informado pelo operador
 * @returns {number} Diferença arredondada (positivo = sobra, negativo = falta)
 */
function calcDifference(expected, informed) {
  return round((Number(informed) || 0) - (Number(expected) || 0));
}

/**
 * Valida se um desconto é válido (não negativo e não maior que o subtotal).
 * 
 * @param {number} discount - Valor do desconto
 * @param {number} subtotal - Subtotal do pedido
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateDiscount(discount, subtotal) {
  const d = Number(discount) || 0;
  const s = Number(subtotal) || 0;
  
  if (d < 0) return { valid: false, reason: 'Desconto não pode ser negativo' };
  if (d > s) return { valid: false, reason: 'Desconto não pode ser maior que o subtotal' };
  return { valid: true };
}

/**
 * Valida se o total de um pedido é positivo.
 * 
 * @param {number} total - Total do pedido
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateTotal(total) {
  const t = Number(total) || 0;
  if (t < 0) return { valid: false, reason: 'Total não pode ser negativo' };
  return { valid: true };
}

/**
 * Converte string de moeda (ex: "10,50" ou "10.50") para número seguro.
 * Lida com ambos os formatos brasileiro e americano.
 * 
 * @param {string|number} value - Valor em string ou número
 * @returns {number} Valor numérico arredondado
 */
function parseCurrency(value) {
  if (typeof value === 'number') return round(value);
  if (!value || typeof value !== 'string') return 0;
  
  let cleaned = value.trim();
  
  // Se contém vírgula E ponto, assume formato brasileiro: "1.234,56"
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  // Se contém apenas vírgula, assume formato brasileiro: "10,50"
  else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : round(parsed);
}

/**
 * Formata valor monetário para exibição (padrão brasileiro).
 * 
 * @param {number} value - Valor numérico
 * @returns {string} Formatado como "R$ 1.234,56"
 */
function formatBRL(value) {
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
 * 
 * @param {number[]} values - Array de valores
 * @returns {number} Soma arredondada
 */
function sumArray(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + (Number(val) || 0), 0);
  return round(sum);
}

/**
 * Calcula o custo de item baseado em ingredientes.
 * 
 * @param {Array} ingredients - Array de { quantity, ingredient: { averageCost } }
 * @param {number} quantity - Quantidade do item
 * @returns {number} Custo total arredondado
 */
function calcIngredientCost(ingredients, quantity = 1) {
  if (!Array.isArray(ingredients)) return 0;
  
  const cost = ingredients.reduce((acc, item) => {
    const ingredientCost = item.ingredient?.averageCost || item.averageCost || 0;
    return acc + ((Number(item.quantity) || 0) * (Number(ingredientCost) || 0));
  }, 0);
  
  return round(cost * (Number(quantity) || 1));
}

module.exports = {
  round,
  add,
  subtract,
  multiply,
  percentage,
  calcOrderTotal,
  calcCashierBalance,
  calcDifference,
  validateDiscount,
  validateTotal,
  parseCurrency,
  formatBRL,
  sumArray,
  calcIngredientCost,
};
