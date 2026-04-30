const logger = require('../config/logger');

const PAYMENT_METHOD_MAP = {
  // iFood → sistema interno
  'CASH': 'money',
  'Dinheiro': 'money',
  'PIX': 'pix',
  'Pix': 'pix',
  'CREDIT': 'credit_card',
  'CREDIT_CARD': 'credit_card',
  'Cartão de Crédito': 'credit_card',
  'DEBIT': 'debit_card',
  'DEBIT_CARD': 'debit_card',
  'Cartão de Débito': 'debit_card',
  'MEAL_VOUCHER': 'meal_voucher',
  'Vale Refeição': 'meal_voucher',
  'FOOD_VOUCHER': 'meal_voucher',
  'DIGITAL_WALLET': 'online',
  'Carteira Digital': 'online',
  'ONLINE': 'online',
  'Pagamento Online': 'online',
  'COUPON': 'coupon',
  'Cupom': 'coupon',
};

const ORDER_TYPE_MAP = {
  // iFood
  'DELIVERY': 'DELIVERY',
  'PICKUP': 'PICKUP',
  'INDOOR': 'TABLE',
  // Uai Rangô
  'Delivery': 'DELIVERY',
  'Retirada': 'PICKUP',
  'Balcão': 'PICKUP',
  // genérico
  'TAKEOUT': 'PICKUP',
  ' takeaway': 'PICKUP',
};

const PLATFORM_STATUS_MAP = {
  ifood: {
    'PLACED': 'PENDING',
    'PLC': 'PENDING',
    'CONFIRMED': 'PREPARING',
    'PREPARING': 'PREPARING',
    'READY': 'READY',
    'READY_TO_PICKUP': 'READY',
    'DISPATCHED': 'SHIPPED',
    'CONCLUDED': 'COMPLETED',
    'CANCELED': 'CANCELED',
    'CANCELLATION_REQUESTED': 'CANCELED',
  },
  uairango: {
    'novo': 'PENDING',
    'confirmado': 'PREPARING',
    'preparando': 'PREPARING',
    'pronto': 'READY',
    'saiu': 'SHIPPED',
    'entregue': 'DELIVERED',
    'finalizado': 'COMPLETED',
    'cancelado': 'CANCELED',
  },
};

class IntegrationTypeService {
  static mapPaymentMethod(platform, rawMethod) {
    if (!rawMethod) return 'money';
    
    const normalized = String(rawMethod).toString().trim();
    
    const mapped = PAYMENT_METHOD_MAP[normalized];
    if (mapped) {
      logger.debug(`[INTEGRATION] Payment mapped: ${platform} "${rawMethod}" → "${mapped}"`);
      return mapped;
    }
    
    const lower = normalized.toLowerCase();
    if (lower.includes('pix')) return 'pix';
    if (lower.includes('crédito') || lower.includes('credit')) return 'credit_card';
    if (lower.includes('débito') || lower.includes('debit')) return 'debit_card';
    if (lower.includes('vale') || lower.includes('voucher')) return 'meal_voucher';
    if (lower.includes('digital') || lower.includes('carteira')) return 'online';
    
    logger.warn(`[INTEGRATION] Payment method não reconhecido: "${rawMethod}" (${platform}), usando "money"`);
    return 'money';
  }

  static mapOrderType(platform, rawType) {
    if (!rawType) return 'DELIVERY';
    
    const normalized = String(rawType).toString().trim();
    
    const mapped = ORDER_TYPE_MAP[normalized];
    if (mapped) {
      logger.debug(`[INTEGRATION] OrderType mapped: ${platform} "${rawType}" → "${mapped}"`);
      return mapped;
    }
    
    return 'DELIVERY';
  }

  static mapStatus(platform, rawStatus) {
    if (!rawStatus) return 'PENDING';
    
    const platformMap = PLATFORM_STATUS_MAP[platform];
    if (!platformMap) {
      logger.warn(`[INTEGRATION] Plataforma não encontrada: ${platform}`);
      return 'PENDING';
    }
    
    const mapped = platformMap[rawStatus];
    if (mapped) {
      logger.debug(`[INTEGRATION] Status mapped: ${platform} "${rawStatus}" → "${mapped}"`);
      return mapped;
    }
    
    return 'PENDING';
  }

  static validatePaymentMethod(method) {
    const valid = ['money', 'pix', 'credit_card', 'debit_card', 'meal_voucher', 'coupon', 'online'];
    return valid.includes(method) ? method : 'money';
  }

  static getPlatformList() {
    return Object.keys(PLATFORM_STATUS_MAP);
  }
}

module.exports = IntegrationTypeService;