const logger = require('./logger');

const PRODUCTION_BASE_URL = 'https://openapi.didi-food.com';
const HOMOLOGATION_BASE_URL = process.env.FOOD99_HOMOLOG_BASE_URL || PRODUCTION_BASE_URL;

const PAY_TYPE_MAP = {
  1: { rawMethod: 'ONLINE_PAID', isPrepaid: true },
  2: { rawMethod: 'CASH', isPrepaid: false },
  3: { rawMethod: 'MEAL_VOUCHER', isPrepaid: false },
  4: { rawMethod: 'PIX', isPrepaid: true },
};

const DELIVERY_TYPE_MAP = {
  1: 'DELIVERY',
  2: 'PICKUP',
};

const MENU_TASK_STATUS_MAP = {
  0: 'waiting',
  1: 'completed',
  2: 'failed',
  3: 'waitRetry',
  4: 'running',
};

function getBaseUrl(env) {
  if (env === 'homologation') return HOMOLOGATION_BASE_URL;
  return PRODUCTION_BASE_URL;
}

function getCredentials() {
  const clientId = process.env.FOOD99_CLIENT_ID;
  const clientSecret = process.env.FOOD99_CLIENT_SECRET;
  return { clientId, clientSecret, configured: !!(clientId && clientSecret) };
}

function mapPayType(payType) {
  const found = PAY_TYPE_MAP[payType];
  if (found) return found;
  logger.warn(`[FOOD99] pay_type não mapeado: ${payType}, usando ONLINE_PAID`);
  return { rawMethod: 'ONLINE_PAID', isPrepaid: true };
}

function mapDeliveryType(deliveryType) {
  return DELIVERY_TYPE_MAP[deliveryType] || (deliveryType === 2 ? 'PICKUP' : 'DELIVERY');
}

function mapMenuTaskStatus(numericStatus) {
  const n = Number(numericStatus);
  return MENU_TASK_STATUS_MAP[n] || 'unknown';
}

module.exports = {
  PRODUCTION_BASE_URL,
  HOMOLOGATION_BASE_URL,
  PAY_TYPE_MAP,
  DELIVERY_TYPE_MAP,
  MENU_TASK_STATUS_MAP,
  getBaseUrl,
  getCredentials,
  mapPayType,
  mapDeliveryType,
  mapMenuTaskStatus,
};
