const axios = require('axios');
const crypto = require('crypto');
const logger = require('../config/logger');

const BASE_URL = process.env.FOOD99_BASE_URL || 'https://openapi.didi-food.com';

class Food99AuthService {

  _getCredentials() {
    const clientId = process.env.FOOD99_CLIENT_ID;
    const clientSecret = process.env.FOOD99_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('FOOD99_CLIENT_ID ou FOOD99_CLIENT_SECRET não configurados nas variáveis de ambiente');
    }

    return { clientId, clientSecret };
  }

  _extractData(response) {
    return response.data?.data || response.data;
  }

  _checkError(response, data, defaultMsg) {
    const errno = response.data?.errno ?? data?.errno;
    if (errno !== 0) {
      throw new Error(response.data?.errmsg || data?.errmsg || defaultMsg);
    }
  }

  _logAndThrow(error, context, defaultMsg) {
    logger.error(`[FOOD99 AUTH] ${context}:`, error.response?.data || error.message);
    throw new Error(error.response?.data?.errmsg || error.message || defaultMsg);
  }

  async _request(config) {
    const { method = 'get', url, params, data: body, timeout = 15000, logContext, logSuccess, defaultErrorMsg } = config;

    try {
      const response = await axios({ method, url, params, data: body, timeout });
      const data = this._extractData(response);
      this._checkError(response, data, defaultErrorMsg);
      if (logSuccess) logger.info(`[FOOD99 AUTH] ${logSuccess}`);
      return data;
    } catch (error) {
      this._logAndThrow(error, logContext, defaultErrorMsg);
    }
  }

  async requestAccessToken(appShopId) {
    const { clientId, clientSecret } = this._getCredentials();

    const data = await this._request({
      method: 'get',
      url: `${BASE_URL}/v1/auth/authtoken/get`,
      params: { app_id: clientId, app_secret: clientSecret, app_shop_id: appShopId },
      logContext: 'Erro ao obter token',
      logSuccess: `Token obtido para shop ${appShopId}`,
      defaultErrorMsg: 'Falha ao obter auth_token',
    });

    const authToken = data.auth_token;
    const tokenExpirationTime = data.token_expiration_time;

    if (!authToken) {
      throw new Error('auth_token não retornado pela API 99Food');
    }

    const expiresAt = tokenExpirationTime
      ? new Date(tokenExpirationTime * 1000)
      : new Date(Date.now() + 6 * 60 * 60 * 1000);

    logger.info(`[FOOD99 AUTH] Token para shop ${appShopId} expira em ${new Date(expiresAt).toISOString()}`);

    return { authToken, expiresAt, tokenExpirationTime };
  }

  async getValidToken(appShopId) {
    const { clientId, clientSecret } = this._getCredentials();

    if (!clientId || !clientSecret) {
      logger.warn('[FOOD99 AUTH] Credenciais não configuradas');
      return null;
    }

    if (!appShopId) {
      logger.warn('[FOOD99 AUTH] app_shop_id não fornecido');
      return null;
    }

    const now = new Date();
    const cacheEntry = this._tokenCache?.[appShopId];

    if (cacheEntry && cacheEntry.expiresAt && cacheEntry.expiresAt > now) {
      if ((cacheEntry.expiresAt - now) > 5 * 60 * 1000) {
        return cacheEntry.authToken;
      }
      logger.info(`[FOOD99 AUTH] Token para shop ${appShopId} expirando em breve, renovando...`);
    }

    try {
      const result = await this.requestAccessToken(appShopId);

      if (!this._tokenCache) this._tokenCache = {};

      this._tokenCache[appShopId] = {
        authToken: result.authToken,
        expiresAt: result.expiresAt,
        tokenExpirationTime: result.tokenExpirationTime,
      };

      return this._tokenCache[appShopId].authToken;
    } catch (error) {
      logger.error(`[FOOD99 AUTH] Erro ao obter token para shop ${appShopId}:`, error.message);
      return null;
    }
  }

  async refreshToken(appShopId) {
    const { clientId, clientSecret } = this._getCredentials();

    await this._request({
      method: 'get',
      url: `${BASE_URL}/v1/auth/authtoken/refresh`,
      params: { app_id: clientId, app_secret: clientSecret, app_shop_id: appShopId },
      logContext: `Erro ao renovar token para shop ${appShopId}`,
      logSuccess: `Token renovado para shop ${appShopId}`,
      defaultErrorMsg: 'Falha ao renovar token',
    });

    if (this._tokenCache?.[appShopId]) {
      delete this._tokenCache[appShopId];
    }

    return await this.getValidToken(appShopId);
  }

  async checkConnectionStatus() {
    const { clientId, clientSecret } = this._getCredentials();

    if (!clientId || !clientSecret) {
      return {
        connected: false,
        status: 'not_configured',
        message: 'Credenciais não configuradas no sistema',
      };
    }

    return {
      connected: true,
      status: 'ready',
      message: 'Credenciais configuradas e prontas para uso',
    };
  }

  async disconnect() {
    this._tokenCache = null;
    logger.info('[FOOD99 AUTH] Cache limpo');
    return { success: true };
  }

  _generateSign(appId, timestamp, secret) {
    return crypto.createHash('md5').update(`${appId}${timestamp}${secret}`).digest('hex');
  }

  async getAuthorizationUrl(appShopId) {
    const { clientId } = this._getCredentials();

    return this._request({
      method: 'post',
      url: `${BASE_URL}/v1/auth/authorizationpage/getUrl`,
      data: { app_id: clientId, app_shop_id: appShopId },
      logContext: 'Erro ao obter URL de autorização',
      logSuccess: `URL de autorização obtido para shop ${appShopId}`,
      defaultErrorMsg: 'Falha ao obter URL de autorização',
    });
  }

  async listShops(pageNo = 1, pageSize = 30) {
    const { clientId, clientSecret } = this._getCredentials();
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this._generateSign(clientId, timestamp, clientSecret);

    return this._request({
      method: 'post',
      url: `${BASE_URL}/v1/shop/shop/list`,
      data: { app_id: clientId, timestamp, sign, page_no: pageNo, page_size: pageSize },
      logContext: 'Erro ao listar lojas',
      logSuccess: `Lista de lojas obtida (página ${pageNo})`,
      defaultErrorMsg: 'Falha ao listar lojas',
    });
  }

  async setConfirmMethod(authToken, method = 2) {
    return this._request({
      method: 'post',
      url: `${BASE_URL}/v1/shop/shop/setconfirmmethod`,
      data: { auth_token: authToken, order_confirm_method: method },
      logContext: 'Erro ao definir método de confirmação',
      logSuccess: `Método de confirmação definido: ${method}`,
      defaultErrorMsg: 'Falha ao definir método de confirmação',
    });
  }

  async setShopStatus(authToken, bizStatus = 1, autoSwitch = 1) {
    return this._request({
      method: 'post',
      url: `${BASE_URL}/v1/shop/shop/setStatus`,
      data: { auth_token: authToken, biz_status: bizStatus, auto_switch: autoSwitch },
      logContext: 'Erro ao definir status da loja',
      logSuccess: `Status da loja definido: biz_status=${bizStatus}, auto_switch=${autoSwitch}`,
      defaultErrorMsg: 'Falha ao definir status da loja',
    });
  }

  async getShopDetail(authToken) {
    return this._request({
      method: 'get',
      url: `${BASE_URL}/v1/shop/shop/detail`,
      params: { auth_token: authToken },
      logContext: 'Erro ao obter detalhes da loja',
      logSuccess: 'Detalhes da loja obtidos',
      defaultErrorMsg: 'Falha ao obter detalhes da loja',
    });
  }

  async setApplyNotifications(authToken, receiveCancelApply = 1, receiveRefundApply = 1) {
    return this._request({
      method: 'post',
      url: `${BASE_URL}/v1/shop/apply/set`,
      data: { auth_token: authToken, receive_cancel_apply: receiveCancelApply, receive_refund_apply: receiveRefundApply },
      logContext: 'Erro ao configurar notificações',
      logSuccess: 'Notificações configuradas com sucesso',
      defaultErrorMsg: 'Falha ao configurar notificações',
    });
  }

  async unbindShop(authToken) {
    return this._request({
      method: 'post',
      url: `${BASE_URL}/v1/shop/shop/unbind`,
      data: { auth_token: authToken },
      logContext: 'Erro ao desvincular loja',
      logSuccess: 'Loja desvinculada com sucesso',
      defaultErrorMsg: 'Falha ao desvincular loja',
    });
  }

  async handleCancelApply(authToken, orderId, applyId, agree, reason) {
    return this._request({
      method: 'post',
      url: `${BASE_URL}/v1/order/apply/cancel`,
      data: {
        auth_token: authToken,
        order_id: orderId,
        apply_id: applyId,
        agree,
        reason_id: agree ? 0 : 1010,
        reason: agree ? '' : (reason || 'Pedido já em preparo'),
      },
      logContext: 'Erro ao processar cancel apply',
      logSuccess: `Solicitação de cancelamento ${agree ? 'aceita' : 'recusada'} para pedido ${orderId}`,
      defaultErrorMsg: 'Falha ao processar solicitação de cancelamento',
    });
  }

  async handleRefundApply(authToken, orderId, applyId, agree, reason) {
    return this._request({
      method: 'post',
      url: `${BASE_URL}/v1/order/apply/refund`,
      data: {
        auth_token: authToken,
        order_id: orderId,
        apply_id: applyId,
        agree,
        custom_reason: agree ? '' : (reason || 'Itens entregues conforme pedido'),
      },
      logContext: 'Erro ao processar refund apply',
      logSuccess: `Solicitação de reembolso ${agree ? 'aceita' : 'recusada'} para pedido ${orderId}`,
      defaultErrorMsg: 'Falha ao processar solicitação de reembolso',
    });
  }
}

module.exports = new Food99AuthService();
