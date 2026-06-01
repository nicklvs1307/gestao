const axios = require('axios');
const food99Config = require('../config/food99');
const logger = require('../config/logger');

const DEFAULT_TIMEOUT = 15000;
const UPLOAD_TIMEOUT = 60000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 800;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getClient(env) {
  return axios.create({
    baseURL: food99Config.getBaseUrl(env),
    timeout: DEFAULT_TIMEOUT,
    validateStatus: () => true,
    headers: { 'Content-Type': 'application/json' },
  });
}

function getClientWithTimeout(env, timeoutMs) {
  return axios.create({
    baseURL: food99Config.getBaseUrl(env),
    timeout: timeoutMs,
    validateStatus: () => true,
    headers: { 'Content-Type': 'application/json' },
  });
}

function unwrap(response) {
  const body = response.data;
  if (body && typeof body === 'object' && 'errno' in body) {
    if (body.errno === 0) return body.data !== undefined ? body.data : body;
    return body;
  }
  return body;
}

function extractError(response, fallback) {
  if (response.data && typeof response.data === 'object') {
    return response.data.errmsg || response.data.message || response.data.error || fallback;
  }
  return fallback;
}

async function requestWithRetry({ method, url, env, params, data, timeout = DEFAULT_TIMEOUT, logContext, retries = MAX_RETRIES }) {
  const client = getClientWithTimeout(env, timeout);
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await client.request({ method, url, params, data });

      if (response.status >= 200 && response.status < 300) {
        return { ok: true, status: response.status, data: unwrap(response) };
      }

      const errMsg = extractError(response, `HTTP ${response.status}`);
      const isRetryable = RETRYABLE_STATUS.has(response.status);

      if (!isRetryable || attempt === retries) {
        logger.warn(`[FOOD99] ${logContext || 'request'} → HTTP ${response.status}: ${errMsg}`);
        return { ok: false, status: response.status, error: errMsg, data: unwrap(response) };
      }

      lastError = new Error(errMsg);
    } catch (error) {
      lastError = error;
      const isNetwork = !error.response;
      if (!isNetwork || attempt === retries) {
        logger.error(`[FOOD99] ${logContext || 'request'} → ${error.message}`);
        return { ok: false, status: error.response?.status || 0, error: error.message };
      }
    }

    const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
    await sleep(delay);
  }

  return { ok: false, status: 0, error: lastError?.message || 'unknown error' };
}

module.exports = {
  DEFAULT_TIMEOUT,
  UPLOAD_TIMEOUT,
  getClient,
  getClientWithTimeout,
  requestWithRetry,
  unwrap,
  extractError,
};
