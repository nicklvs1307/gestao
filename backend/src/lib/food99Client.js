const axios = require('axios');
const food99Config = require('../config/food99');
const logger = require('../config/logger');

const DEFAULT_TIMEOUT = 15000;
const UPLOAD_TIMEOUT = 60000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 800;
const RATE_LIMIT_DELAY_MS = 65000;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const RATE_LIMIT_ERRNO = new Set([10005, 6]);

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

  const reqId = `${method.toUpperCase()} ${url} [${logContext || 'request'}]`;
  const reqSummary = {
    method: method.toUpperCase(),
    url,
    env: env || 'production',
    params: params ? JSON.stringify(params).slice(0, 300) : undefined,
    bodyKeys: data && typeof data === 'object' ? Object.keys(data).join(',') : undefined,
    hasBody: data ? true : false,
  };
  logger.info(`[FOOD99 HTTP] >>> ${reqId} | ${JSON.stringify(reqSummary)}`);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await client.request({ method, url, params, data });

      const rawBody = response.data;
      const rawBodyStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
      logger.info(`[FOOD99 HTTP] <<< ${reqId} attempt=${attempt + 1}/${retries + 1} status=${response.status} ct=${response.headers?.['content-type']} body=${rawBodyStr?.slice(0, 600)}`);

      if (response.status >= 200 && response.status < 300) {
        const unwrapped = unwrap(response);

        // Detecta errno no body (99Food retorna HTTP 200 mesmo com erro)
        if (unwrapped && typeof unwrapped === 'object' && 'errno' in unwrapped && unwrapped.errno !== 0) {
          const errno = unwrapped.errno;
          const isRateLimit = RATE_LIMIT_ERRNO.has(errno);
          const isRetryableErrno = isRateLimit || errno === 10001; // 10001 = Data not exist (pode ser temporário)

          if (isRateLimit && attempt < retries) {
            logger.warn(`[FOOD99 HTTP] ${reqId} errno=${errno} (rate limit) — aguardando ${RATE_LIMIT_DELAY_MS / 1000}s antes do retry`);
            await sleep(RATE_LIMIT_DELAY_MS);
            continue;
          }

          if (!isRetryableErrno || attempt === retries) {
            logger.warn(`[FOOD99] ${logContext || 'request'} → errno ${errno}: ${unwrapped.errmsg}`);
            return { ok: false, status: response.status, error: unwrapped.errmsg || `errno ${errno}`, data: unwrapped };
          }
        }

        return { ok: true, status: response.status, data: unwrapped };
      }

      const errMsg = extractError(response, `HTTP ${response.status}`);
      const isRetryable = RETRYABLE_STATUS.has(response.status);

      if (!isRetryable || attempt === retries) {
        logger.warn(`[FOOD99] ${logContext || 'request'} → HTTP ${response.status}: ${errMsg}`);
        return { ok: false, status: response.status, error: errMsg, data: unwrap(response) };
      }

      logger.warn(`[FOOD99 HTTP] ${reqId} attempt ${attempt + 1} falhou (HTTP ${response.status}: ${errMsg}) - retryable, aguardando ${RETRY_DELAY_MS * Math.pow(2, attempt)}ms`);
      lastError = new Error(errMsg);
    } catch (error) {
      lastError = error;
      const isNetwork = !error.response;
      logger.error(`[FOOD99 HTTP] ${reqId} attempt ${attempt + 1} EXCEPTION: ${error.message} | code=${error.code} | hasResponse=${!!error.response}`);
      if (error.response) {
        logger.error(`[FOOD99 HTTP] ${reqId} exception response: status=${error.response.status} body=${JSON.stringify(error.response.data)?.slice(0, 600)}`);
      }
      if (!isNetwork || attempt === retries) {
        logger.error(`[FOOD99] ${logContext || 'request'} → ${error.message}`);
        return { ok: false, status: error.response?.status || 0, error: error.message };
      }
    }

    const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
    await sleep(delay);
  }

  logger.error(`[FOOD99 HTTP] ${reqId} esgotou ${retries + 1} tentativas`);
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
