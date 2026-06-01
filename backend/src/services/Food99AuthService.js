const crypto = require('crypto');
const logger = require('../config/logger');
const food99Config = require('../config/food99');
const { requestWithRetry } = require('../lib/food99Client');

class Food99AuthService {

  _getCredentials() {
    return food99Config.getCredentials();
  }

  _generateSign(appId, timestamp, secret) {
    return crypto.createHash('md5').update(`${appId}${timestamp}${secret}`).digest('hex');
  }

  async requestAccessToken(appShopId) {
    const { clientId, clientSecret } = this._getCredentials();
    if (!clientId || !clientSecret) {
      throw new Error('FOOD99_CLIENT_ID ou FOOD99_CLIENT_SECRET não configurados nas variáveis de ambiente');
    }

    logger.info(`[FOOD99 AUTH] requestAccessToken iniciando para shop=${appShopId}, clientId length=${clientId?.length}, clientSecret length=${clientSecret?.length}`);

    const result = await requestWithRetry({
      method: 'get',
      url: '/v1/auth/authtoken/get',
      params: { app_id: clientId, app_secret: clientSecret, app_shop_id: appShopId },
      logContext: `get-token shop ${appShopId}`,
      retries: 2,
    });

    if (!result.ok) {
      logger.error(`[FOOD99 AUTH] requestAccessToken falhou para shop ${appShopId}: status=${result.status} error=${result.error} data=${JSON.stringify(result.data)?.slice(0, 500)}`);
      throw new Error(result.error || 'Falha ao obter auth_token');
    }

    const data = result.data || {};
    logger.info(`[FOOD99 AUTH] requestAccessToken retorno para shop ${appShopId}: dataKeys=${Object.keys(data).join(',')} hasAuthToken=${!!data.auth_token} hasExpTime=${!!data.token_expiration_time} dataPreview=${JSON.stringify(data).slice(0, 500)}`);

    const authToken = data.auth_token;
    const tokenExpirationTime = data.token_expiration_time;

    if (!authToken) {
      logger.error(`[FOOD99 AUTH] requestAccessToken: 99Food NÃO retornou auth_token. Resposta completa: ${JSON.stringify(data).slice(0, 800)}`);
      throw new Error(`auth_token não retornado pela API 99Food (data keys: ${Object.keys(data).join(',') || 'vazio'})`);
    }

    const expiresAt = tokenExpirationTime
      ? new Date(tokenExpirationTime * 1000)
      : new Date(Date.now() + 6 * 60 * 60 * 1000);

    logger.info(`[FOOD99 AUTH] Token para shop ${appShopId} obtido, expira em ${new Date(expiresAt).toISOString()} (tokenExpirationTime=${tokenExpirationTime})`);

    return { authToken, expiresAt, tokenExpirationTime };
  }

  async getValidToken(appShopId) {
    const { clientId, clientSecret, configured } = this._getCredentials();

    logger.debug(`[FOOD99 AUTH] getValidToken chamado: shop=${appShopId} configured=${configured} clientIdLen=${clientId?.length || 0} secretLen=${clientSecret?.length || 0}`);

    if (!configured) {
      logger.error(`[FOOD99 AUTH] Credenciais do APP não configuradas - FOOD99_CLIENT_ID=${clientId ? 'OK' : 'MISSING'}, FOOD99_CLIENT_SECRET=${clientSecret ? 'OK' : 'MISSING'}`);
      return null;
    }

    if (!appShopId) {
      logger.warn('[FOOD99 AUTH] app_shop_id não configurado no restaurante');
      return null;
    }

    const now = new Date();
    const cacheEntry = this._tokenCache?.[appShopId];

    if (cacheEntry && cacheEntry.expiresAt && cacheEntry.expiresAt > now) {
      const remainingSec = Math.round((cacheEntry.expiresAt - now) / 1000);
      logger.debug(`[FOOD99 AUTH] Cache HIT para shop ${appShopId}, expira em ${remainingSec}s`);
      if ((cacheEntry.expiresAt - now) > 5 * 60 * 1000) {
        return cacheEntry.authToken;
      }
      logger.info(`[FOOD99 AUTH] Token para shop ${appShopId} expirando em ${remainingSec}s, renovando...`);
    } else if (cacheEntry) {
      logger.info(`[FOOD99 AUTH] Cache EXPIRED para shop ${appShopId}, renovando...`);
    } else {
      logger.info(`[FOOD99 AUTH] Cache MISS para shop ${appShopId}, solicitando novo token...`);
    }

    const MIN_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
    if (cacheEntry && cacheEntry.lastRefreshAt) {
      const elapsed = now - cacheEntry.lastRefreshAt;
      if (elapsed < MIN_REFRESH_INTERVAL_MS) {
        logger.debug(`[FOOD99 AUTH] Refresh de token para shop ${appShopId} suprimido (último refresh há ${Math.round(elapsed / 1000)}s)`);
        return cacheEntry.authToken;
      }
    }

    try {
      const result = await this.requestAccessToken(appShopId);

      if (!this._tokenCache) this._tokenCache = {};

      this._tokenCache[appShopId] = {
        authToken: result.authToken,
        expiresAt: result.expiresAt,
        tokenExpirationTime: result.tokenExpirationTime,
        lastRefreshAt: new Date(),
      };

      logger.info(`[FOOD99 AUTH] Token cache atualizado para shop ${appShopId} (tokenLen=${result.authToken?.length})`);
      return this._tokenCache[appShopId].authToken;
    } catch (error) {
      const apiMsg = error.message;
      logger.error(`[FOOD99 AUTH] Erro ao obter token para shop ${appShopId}: ${apiMsg}`);
      logger.error(`[FOOD99 AUTH] Stack: ${error.stack}`);

      if (apiMsg?.toLowerCase().includes('authorization') || apiMsg?.toLowerCase().includes('unauthorized')) {
        logger.error(`[FOOD99 AUTH] Loja ${appShopId} não autorizada na plataforma 99Food: ${apiMsg}`);
      }

      return null;
    }
  }

  async refreshToken(appShopId) {
    const { clientId, clientSecret, configured } = this._getCredentials();
    if (!configured) {
      throw new Error('FOOD99_CLIENT_ID ou FOOD99_CLIENT_SECRET não configurados');
    }

    const result = await requestWithRetry({
      method: 'get',
      url: '/v1/auth/authtoken/refresh',
      params: { app_id: clientId, app_secret: clientSecret, app_shop_id: appShopId },
      logContext: `Erro ao renovar token (shop ${appShopId})`,
      retries: 2,
    });

    if (!result.ok) {
      throw new Error(result.error || 'Falha ao renovar token');
    }

    if (this._tokenCache?.[appShopId]) {
      delete this._tokenCache[appShopId];
    }

    return await this.getValidToken(appShopId);
  }

  async _probeCredentials() {
    const { clientId, clientSecret, configured } = this._getCredentials();
    if (!configured) {
      return { ok: false, reason: 'Credenciais do APP não configuradas no sistema' };
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this._generateSign(clientId, timestamp, clientSecret);

    const result = await requestWithRetry({
      method: 'post',
      url: '/v1/shop/shop/list',
      data: { app_id: clientId, timestamp, sign, page_no: 1, page_size: 1 },
      logContext: 'Probe de credenciais 99Food (shop/list)',
      retries: 1,
    });

    if (!result.ok) {
      return { ok: false, reason: result.error || 'Falha no probe' };
    }

    const data = result.data;
    if (data && typeof data === 'object' && 'errno' in data && data.errno !== 0) {
      return { ok: false, reason: data.errmsg || `errno ${data.errno}` };
    }

    return { ok: true };
  }

  async checkConnectionStatus(appShopId = null) {
    logger.info(`[FOOD99 AUTH] checkConnectionStatus chamado: appShopId=${appShopId}`);
    const probe = await this._probeCredentials();

    if (!probe.ok) {
      logger.error(`[FOOD99 AUTH] checkConnectionStatus: probe FALHOU: ${probe.reason}`);
      return {
        connected: false,
        status: 'not_configured',
        message: probe.reason,
      };
    }

    if (!appShopId) {
      logger.info(`[FOOD99 AUTH] checkConnectionStatus: probe OK, sem appShopId, retornando 'ready'`);
      return {
        connected: true,
        status: 'ready',
        message: 'Credenciais válidas na 99Food (app ativo)',
      };
    }

    const token = await this.getValidToken(appShopId);
    logger.info(`[FOOD99 AUTH] checkConnectionStatus shop ${appShopId}: token obtito=${!!token} (tokenLen=${token?.length || 0})`);
    return {
      connected: !!token,
      status: token ? 'ready' : 'shop_unbound',
      tokenActive: !!token,
      message: token
        ? `Token ativo para shop ${appShopId}`
        : `Sem token válido para shop ${appShopId} (loja pode não estar vinculada)`,
    };
  }

  /**
   * Retorna estado atual para debug.
   */
  getDebugInfo() {
    const creds = this._getCredentials();
    const cache = this._tokenCache || {};
    const cacheEntries = Object.entries(cache).map(([shopId, entry]) => ({
      shopId,
      tokenLength: entry.authToken?.length || 0,
      expiresAt: entry.expiresAt?.toISOString(),
      lastRefreshAt: entry.lastRefreshAt?.toISOString(),
      expired: entry.expiresAt ? entry.expiresAt < new Date() : true,
    }));

    let pollingEnabled = false;
    try {
      const Polling = require('./Food99PollingService');
      pollingEnabled = Polling.isEnabled();
    } catch (e) { /* ignore */ }

    return {
      credentials: {
        clientIdConfigured: !!creds.clientId,
        clientIdLength: creds.clientId?.length || 0,
        clientSecretConfigured: !!creds.clientSecret,
        clientSecretLength: creds.clientSecret?.length || 0,
      },
      baseUrl: food99Config.getBaseUrl(),
      tokenCache: cacheEntries,
      pollingEnabled,
      timestamp: new Date().toISOString(),
    };
  }

  async disconnect() {
    this._tokenCache = null;
    logger.info('[FOOD99 AUTH] Cache limpo');
    return { success: true };
  }

  async getAuthorizationUrl(appShopId) {
    const { clientId, configured } = this._getCredentials();
    if (!configured) {
      throw new Error('FOOD99_CLIENT_ID ou FOOD99_CLIENT_SECRET não configurados');
    }

    const result = await requestWithRetry({
      method: 'post',
      url: '/v1/auth/authorizationpage/getUrl',
      data: { app_id: clientId, app_shop_id: appShopId },
      logContext: `Erro ao obter URL de autorização (shop ${appShopId})`,
      retries: 2,
    });

    if (!result.ok) {
      throw new Error(result.error || 'Falha ao obter URL de autorização');
    }

    const data = result.data;
    logger.info(`[FOOD99 AUTH] Resposta bruta de getAuthorizationUrl para shop ${appShopId}: ${JSON.stringify(data)?.slice(0, 300)}`);

    let url = null;
    if (Array.isArray(data)) {
      url = data.find(v => typeof v === 'string' && v.startsWith('http')) || data[0];
    } else if (typeof data === 'string' && data.startsWith('http')) {
      url = data;
    } else if (data && typeof data === 'object') {
      url = data.url || data.authorization_url || data.authorizationUrl || data.link;
    }

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      throw new Error(`URL de autorização não retornada pela API 99Food (resposta: ${JSON.stringify(data)?.slice(0, 200)})`);
    }

    logger.info(`[FOOD99 AUTH] URL de autorização obtida para shop ${appShopId}`);
    return { url, appShopId };
  }

  async listShops(pageNo = 1, pageSize = 30) {
    const { clientId, clientSecret, configured } = this._getCredentials();
    if (!configured) {
      throw new Error('FOOD99_CLIENT_ID ou FOOD99_CLIENT_SECRET não configurados');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this._generateSign(clientId, timestamp, clientSecret);

    const result = await requestWithRetry({
      method: 'post',
      url: '/v1/shop/shop/list',
      data: { app_id: clientId, timestamp, sign, page_no: pageNo, page_size: pageSize },
      logContext: `Erro ao listar lojas (página ${pageNo})`,
      retries: 2,
    });

    if (!result.ok) {
      throw new Error(result.error || 'Falha ao listar lojas');
    }

    return result.data;
  }

  async setConfirmMethod(authToken, method = 2) {
    const result = await requestWithRetry({
      method: 'post',
      url: '/v1/shop/shop/setconfirmmethod',
      data: { auth_token: authToken, order_confirm_method: method },
      logContext: `Erro ao definir método de confirmação (${method})`,
    });
    if (!result.ok) throw new Error(result.error);
    return result.data;
  }

  async setShopStatus(authToken, bizStatus = 1, autoSwitch = 1) {
    const result = await requestWithRetry({
      method: 'post',
      url: '/v1/shop/shop/setStatus',
      data: { auth_token: authToken, biz_status: bizStatus, auto_switch: autoSwitch },
      logContext: `Erro ao definir status da loja (biz=${bizStatus})`,
    });
    if (!result.ok) throw new Error(result.error);
    return result.data;
  }

  async getShopDetail(authToken) {
    const result = await requestWithRetry({
      method: 'get',
      url: '/v1/shop/shop/detail',
      params: { auth_token: authToken },
      logContext: 'Erro ao obter detalhes da loja',
    });
    if (!result.ok) throw new Error(result.error);
    return result.data;
  }

  async setApplyNotifications(authToken, receiveCancelApply = 1, receiveRefundApply = 1) {
    const result = await requestWithRetry({
      method: 'post',
      url: '/v1/shop/apply/set',
      data: { auth_token: authToken, receive_cancel_apply: receiveCancelApply, receive_refund_apply: receiveRefundApply },
      logContext: 'Erro ao configurar notificações',
    });
    if (!result.ok) throw new Error(result.error);
    return result.data;
  }

  async unbindShop(authToken) {
    const result = await requestWithRetry({
      method: 'post',
      url: '/v1/shop/shop/unbind',
      data: { auth_token: authToken },
      logContext: 'Erro ao desvincular loja',
    });
    if (!result.ok) throw new Error(result.error);
    return result.data;
  }

  async handleCancelApply(authToken, orderId, applyId, agree, reason) {
    const result = await requestWithRetry({
      method: 'post',
      url: '/v1/order/apply/cancel',
      data: {
        auth_token: authToken,
        order_id: orderId,
        apply_id: applyId,
        agree,
        reason_id: agree ? 0 : 1010,
        reason: agree ? '' : (reason || 'Pedido já em preparo'),
      },
      logContext: `Erro ao processar cancel apply (order ${orderId})`,
    });
    if (!result.ok) throw new Error(result.error);
    return result.data;
  }

  async handleRefundApply(authToken, orderId, applyId, agree, reason) {
    const result = await requestWithRetry({
      method: 'post',
      url: '/v1/order/apply/refund',
      data: {
        auth_token: authToken,
        order_id: orderId,
        apply_id: applyId,
        agree,
        custom_reason: agree ? '' : (reason || 'Itens entregues conforme pedido'),
      },
      logContext: `Erro ao processar refund apply (order ${orderId})`,
    });
    if (!result.ok) throw new Error(result.error);
    return result.data;
  }
}

module.exports = new Food99AuthService();
