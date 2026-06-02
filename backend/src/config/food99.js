const logger = require('./logger');

const PRODUCTION_BASE_URL = 'https://openapi.didi-food.com';
const HOMOLOGATION_BASE_URL = process.env.FOOD99_HOMOLOG_BASE_URL || PRODUCTION_BASE_URL;

const PAY_TYPE_MAP = {
  1: { rawMethod: 'ONLINE_PAID', isPrepaid: true },
  2: { rawMethod: 'CASH', isPrepaid: false },
  3: { rawMethod: 'MEAL_VOUCHER', isPrepaid: false },
  4: { rawMethod: 'PIX', isPrepaid: true },
  // Nota: 5+ não estão documentados no swagger atual.
  // Adicione aqui quando a 99Food introduzir novos pay_types.
};

// Mapeamento explícito de errno codes conhecidos (99Food)
// 0 = sucesso, demais = erro
const ERRNO_MAP = {
  0: { code: 'OK', severity: 'info' },
  1: { code: 'PARAM_ERROR', severity: 'warn' },
  2: { code: 'AUTH_FAILED', severity: 'error' },
  3: { code: 'PERMISSION_DENIED', severity: 'error' },
  5: { code: 'INVALID_REQUEST', severity: 'warn' },
  6: { code: 'RATE_LIMIT', severity: 'warn' },
  7: { code: 'RESOURCE_NOT_FOUND', severity: 'warn' },
  100: { code: 'SERVER_ERROR', severity: 'error' },
  101: { code: 'SERVICE_UNAVAILABLE', severity: 'error' },
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
  // Fallback seguro: CASH (não pré-pago) para evitar marcar como pago o que não foi
  logger.warn(`[FOOD99] pay_type não mapeado: ${payType}, usando CASH (fallback seguro)`);
  return { rawMethod: 'CASH', isPrepaid: false };
}

function mapErrno(errno) {
  const n = Number(errno);
  return ERRNO_MAP[n] || { code: `UNKNOWN_${n}`, severity: 'error' };
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
  ERRNO_MAP,
  getBaseUrl,
  getCredentials,
  mapPayType,
  mapDeliveryType,
  mapMenuTaskStatus,
  mapErrno,
};
