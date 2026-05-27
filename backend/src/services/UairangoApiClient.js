const axios = require('axios');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const UairangoAuthService = require('./UairangoAuthService');

const BASE_URL = 'https://www.uairango.com/api2';

async function withRetry(fn, retries = 3, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      logger.warn(`[UAIRANGO API] Tentativa ${i + 1} falhou, tentando novamente em ${delayMs * Math.pow(2, i)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
    }
  }
}

async function getEnvHeader(restaurantId) {
  const settings = await prisma.integrationSettings.findUnique({
    where: { restaurantId },
    select: { uairangoEnv: true }
  });
  return settings?.uairangoEnv || 'production';
}

async function request(method, restaurantId, path, options = {}) {
  const token = await UairangoAuthService.getAccessToken(restaurantId);
  if (!token) throw new Error('Token de acesso não disponível');

  const env = await getEnvHeader(restaurantId);
  const url = `${BASE_URL}${path}`;

  const config = {
    method,
    url,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-env': env,
      ...options.headers,
    },
    timeout: options.timeout || 15000,
  };

  if (options.params) config.params = options.params;
  if (options.data) config.data = options.data;

  return await withRetry(() => axios(config), options.retries, options.delayMs);
}

async function get(restaurantId, path, options = {}) {
  return request('GET', restaurantId, path, options);
}

async function post(restaurantId, path, data = {}, options = {}) {
  return request('POST', restaurantId, path, { ...options, data });
}

async function put(restaurantId, path, data = {}, options = {}) {
  return request('PUT', restaurantId, path, { ...options, data });
}

async function patch(restaurantId, path, data = {}, options = {}) {
  return request('PATCH', restaurantId, path, { ...options, data });
}

async function del(restaurantId, path, options = {}) {
  return request('DELETE', restaurantId, path, options);
}

module.exports = {
  BASE_URL,
  get,
  post,
  put,
  patch,
  del,
  withRetry,
};
