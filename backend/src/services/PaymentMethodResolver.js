const prisma = require('../lib/prisma');
const logger = require('../config/logger');

/**
 * PaymentMethodResolver - Resolução ÚNICA e centralizada de formas de pagamento.
 * 
 * Todas as integrações (iFood, Uairango, etc.) e todos os serviços internos
 * devem usar este resolver para garantir que o paymentMethod armazenado no banco
 * seja SEMPRE um type padronizado do PaymentMethod (CASH, PIX, CREDIT_CARD, etc).
 * 
 * Isso garante que o fechamento de caixa agrupe corretamente por forma de pagamento.
 */

// Mapa de QUALQUER formato externo/legado para o type padronizado do banco
const TYPE_MAP = {
  // iFood API
  'CASH': 'CASH',
  'CREDIT': 'CREDIT_CARD',
  'CREDIT_CARD': 'CREDIT_CARD',
  'DEBIT': 'DEBIT_CARD',
  'DEBIT_CARD': 'DEBIT_CARD',
  'PIX': 'PIX',
  'MEAL_VOUCHER': 'VOUCHER',
  'FOOD_VOUCHER': 'VOUCHER',
  'DIGITAL_WALLET': 'OTHER',
  'ONLINE': 'PIX', // iFood online geralmente é PIX
  'COUPON': 'OTHER',

  // Slugs internos legados (IfoodOrderService antigo)
  'dinheiro': 'CASH',
  'cartao-credito': 'CREDIT_CARD',
  'cartao-debito': 'DEBIT_CARD',
  'pix': 'PIX',
  'vale-refeicao': 'VOUCHER',
  'carteira-digital': 'OTHER',
  'outro': 'OTHER',

  // IntegrationTypeService legado
  'money': 'CASH',
  'cash': 'CASH',
  'credit_card': 'CREDIT_CARD',
  'debit_card': 'DEBIT_CARD',
  'meal_voucher': 'VOUCHER',
  'online': 'OTHER',
  'coupon': 'OTHER',
  'other': 'OTHER',

  // Display names legados (que podem ter sido salvos no banco)
  'Dinheiro': 'CASH',
  'Pix': 'PIX',
  'Cartão de Crédito': 'CREDIT_CARD',
  'Cartão de Débito': 'DEBIT_CARD',
  'Vale Refeição': 'VOUCHER',
  'Carteira Digital': 'OTHER',
  'Pagamento Online': 'PIX',
  'Cupom': 'OTHER',
  'Outros': 'OTHER',

  // Uairango
  'Delivery': 'CASH',
  'credito': 'CREDIT_CARD',
  'debito': 'DEBIT_CARD',
  'vale': 'VOUCHER',
  'ticket': 'VOUCHER',
};

// Labels de exibição por type (para frontend/impressão)
const DISPLAY_LABELS = {
  'CASH': 'Dinheiro',
  'PIX': 'Pix',
  'CREDIT_CARD': 'Cartão de Crédito',
  'DEBIT_CARD': 'Cartão de Débito',
  'VOUCHER': 'Vale Refeição',
  'OTHER': 'Outros',
};

class PaymentMethodResolver {
  /**
   * Resolve QUALQUER formato de método de pagamento para o type padronizado.
   * Este é o ÚNICO ponto de resolução do sistema.
   * 
   * @param {string} rawMethod - Método em qualquer formato (iFood, legado, display, etc)
   * @returns {string} Type padronizado: 'CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'VOUCHER', 'OTHER'
   */
  static resolveType(rawMethod) {
    if (!rawMethod) return 'CASH';

    const trimmed = String(rawMethod).trim();

    // 1. Busca direta no mapa
    if (TYPE_MAP[trimmed]) {
      return TYPE_MAP[trimmed];
    }

    // 2. Busca case-insensitive
    const upper = trimmed.toUpperCase();
    if (TYPE_MAP[upper]) {
      return TYPE_MAP[upper];
    }

    // 3. Busca por substring (para strings compostas como "Pago Online - Pix")
    const lower = trimmed.toLowerCase();
    if (lower.includes('pix')) return 'PIX';
    if (lower.includes('credito') || lower.includes('crédito') || lower.includes('credit')) return 'CREDIT_CARD';
    if (lower.includes('debito') || lower.includes('débito') || lower.includes('debit')) return 'DEBIT_CARD';
    if (lower.includes('dinheiro') || lower.includes('cash') || lower.includes('money')) return 'CASH';
    if (lower.includes('vale') || lower.includes('voucher') || lower.includes('ticket')) return 'VOUCHER';

    // 4. Se já é um type válido, retornar como está
    const validTypes = ['CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'VOUCHER', 'OTHER'];
    if (validTypes.includes(upper)) return upper;

    logger.warn(`[PaymentMethodResolver] Método não reconhecido: "${rawMethod}", usando OTHER`);
    return 'OTHER';
  }

  /**
   * Retorna o label de exibição para um type padronizado.
   * 
   * @param {string} type - Type padronizado (CASH, PIX, etc)
   * @returns {string} Label para exibição ("Dinheiro", "Pix", etc)
   */
  static getDisplayLabel(type) {
    return DISPLAY_LABELS[type] || DISPLAY_LABELS[this.resolveType(type)] || type || 'Outros';
  }

  /**
   * Dado um restaurante e um método raw, busca o PaymentMethod correspondente no banco.
   * 
   * @param {string} restaurantId 
   * @param {string} rawMethod - Método em qualquer formato
   * @returns {Promise<{id: string, name: string, type: string} | null>}
   */
  static async findPaymentMethod(restaurantId, rawMethod) {
    const type = this.resolveType(rawMethod);

    const pm = await prisma.paymentMethod.findFirst({
      where: { restaurantId, type, isActive: true }
    });

    return pm || null;
  }

  /**
   * Verifica se um paymentMethod é do tipo "dinheiro" (cash).
   * Substitui todas as comparações espalhadas pelo código.
   * 
   * @param {string} method - Método em qualquer formato
   * @returns {boolean}
   */
  static isCash(method) {
    return this.resolveType(method) === 'CASH';
  }

  /**
   * Retorna a lista de types válidos do sistema.
   * @returns {string[]}
   */
  static getValidTypes() {
    return ['CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'VOUCHER', 'OTHER'];
  }
}

module.exports = PaymentMethodResolver;
