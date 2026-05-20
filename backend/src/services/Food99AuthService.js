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

  /**
   * Obtém auth_token para uma loja específica via GET /v1/auth/authtoken/get.
   * Modelo centralizado: mesmo client_id/client_secret, mas app_shop_id varia por restaurante.
   * Token expira em token_expiration_time (unix timestamp).
   */
  async requestAccessToken(appShopId) {
    const { clientId, clientSecret } = this._getCredentials();

    try {
      const response = await axios.get(`${BASE_URL}/v1/auth/authtoken/get`, {
        params: {
          app_id: clientId,
          app_secret: clientSecret,
          app_shop_id: appShopId,
        },
        timeout: 15000,
      });

      const data = response.data?.data || response.data;

      if (data.errno !== 0 && response.data?.errno !== 0) {
        throw new Error(response.data?.errmsg || 'Erro ao obter auth_token');
      }

      const authToken = data.auth_token;
      const tokenExpirationTime = data.token_expiration_time;

      if (!authToken) {
        throw new Error('auth_token não retornado pela API 99Food');
      }

      const expiresAt = tokenExpirationTime
        ? new Date(tokenExpirationTime * 1000)
        : new Date(Date.now() + 6 * 60 * 60 * 1000);

      logger.info(`[FOOD99 AUTH] Token obtido para shop ${appShopId}. Expira em ${new Date(expiresAt).toISOString()}`);

      return {
        authToken,
        expiresAt,
        tokenExpirationTime,
      };
    } catch (error) {
      logger.error('[FOOD99 AUTH] Erro ao obter token:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errmsg || error.message || 'Falha ao obter auth_token');
    }
  }

  /**
   * Obtém token válido para uma loja específica ou renova se necessário.
   * Cache em memória por app_shop_id.
   */
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

  /**
   * Força renovação de token para uma loja específica.
   */
  async refreshToken(appShopId) {
    const { clientId, clientSecret } = this._getCredentials();

    try {
      const response = await axios.get(`${BASE_URL}/v1/auth/authtoken/refresh`, {
        params: {
          app_id: clientId,
          app_secret: clientSecret,
          app_shop_id: appShopId,
        },
        timeout: 15000,
      });

      const data = response.data?.data || response.data;

      if (data.errno !== 0 && response.data?.errno !== 0) {
        throw new Error(response.data?.errmsg || 'Erro ao renovar token');
      }

      if (this._tokenCache?.[appShopId]) {
        delete this._tokenCache[appShopId];
      }

      return await this.getValidToken(appShopId);
    } catch (error) {
      logger.error(`[FOOD99 AUTH] Erro ao renovar token para shop ${appShopId}:`, error.message);
      throw error;
    }
  }

  /**
   * Verifica conexão sem renewal automático.
   */
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

  /**
   * Desconecta (limpa cache).
   */
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

    try {
      const response = await axios.post(`${BASE_URL}/v1/auth/authorizationpage/getUrl`, {
        app_id: clientId,
        app_shop_id: appShopId,
      }, {
        timeout: 15000,
      });

      const data = response.data?.data || response.data;

      if (response.data?.errno !== 0 && data.errno !== 0) {
        throw new Error(response.data?.errmsg || 'Erro ao obter URL de autorização');
      }

      logger.info(`[FOOD99 AUTH] URL de autorização obtido para shop ${appShopId}`);

      return data;
    } catch (error) {
      logger.error('[FOOD99 AUTH] Erro ao obter URL de autorização:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errmsg || error.message || 'Falha ao obter URL de autorização');
    }
  }

  async listShops(pageNo = 1, pageSize = 30) {
    const { clientId, clientSecret } = this._getCredentials();

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const sign = this._generateSign(clientId, timestamp, clientSecret);

      const response = await axios.post(`${BASE_URL}/v1/shop/shop/list`, {
        app_id: clientId,
        timestamp,
        sign,
        page_no: pageNo,
        page_size: pageSize,
      }, {
        timeout: 15000,
      });

      const data = response.data?.data || response.data;

      if (response.data?.errno !== 0 && data.errno !== 0) {
        throw new Error(response.data?.errmsg || 'Erro ao listar lojas');
      }

      logger.info(`[FOOD99 AUTH] Lista de lojas obtida (página ${pageNo})`);

      return data;
    } catch (error) {
      logger.error('[FOOD99 AUTH] Erro ao listar lojas:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errmsg || error.message || 'Falha ao listar lojas');
    }
  }

  async setConfirmMethod(authToken, method = 2) {
    try {
      const response = await axios.post(`${BASE_URL}/v1/shop/shop/setconfirmmethod`, {
        auth_token: authToken,
        order_confirm_method: method,
      }, {
        timeout: 15000,
      });

      const data = response.data?.data || response.data;

      if (response.data?.errno !== 0 && data.errno !== 0) {
        throw new Error(response.data?.errmsg || 'Erro ao definir método de confirmação');
      }

      logger.info(`[FOOD99 AUTH] Método de confirmação definido: ${method}`);

      return data;
    } catch (error) {
      logger.error('[FOOD99 AUTH] Erro ao definir método de confirmação:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errmsg || error.message || 'Falha ao definir método de confirmação');
    }
  }

  async setShopStatus(authToken, bizStatus = 1, autoSwitch = 1) {
    try {
      const response = await axios.post(`${BASE_URL}/v1/shop/shop/setStatus`, {
        auth_token: authToken,
        biz_status: bizStatus,
        auto_switch: autoSwitch,
      }, {
        timeout: 15000,
      });

      const data = response.data?.data || response.data;

      if (response.data?.errno !== 0 && data.errno !== 0) {
        throw new Error(response.data?.errmsg || 'Erro ao definir status da loja');
      }

      logger.info(`[FOOD99 AUTH] Status da loja definido: biz_status=${bizStatus}, auto_switch=${autoSwitch}`);

      return data;
    } catch (error) {
      logger.error('[FOOD99 AUTH] Erro ao definir status da loja:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errmsg || error.message || 'Falha ao definir status da loja');
    }
  }

  async getShopDetail(authToken) {
    try {
      const response = await axios.get(`${BASE_URL}/v1/shop/shop/detail`, {
        params: {
          auth_token: authToken,
        },
        timeout: 15000,
      });

      const data = response.data?.data || response.data;

      if (response.data?.errno !== 0 && data.errno !== 0) {
        throw new Error(response.data?.errmsg || 'Erro ao obter detalhes da loja');
      }

      logger.info('[FOOD99 AUTH] Detalhes da loja obtidos');

      return data;
    } catch (error) {
      logger.error('[FOOD99 AUTH] Erro ao obter detalhes da loja:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errmsg || error.message || 'Falha ao obter detalhes da loja');
    }
  }

  async setApplyNotifications(authToken, receiveCancelApply = 1, receiveRefundApply = 1) {
    try {
      const response = await axios.post(`${BASE_URL}/v1/shop/apply/set`, {
        auth_token: authToken,
        receive_cancel_apply: receiveCancelApply,
        receive_refund_apply: receiveRefundApply,
      }, {
        timeout: 15000,
      });

      const data = response.data?.data || response.data;

      if (response.data?.errno !== 0 && data.errno !== 0) {
        throw new Error(response.data?.errmsg || 'Erro ao configurar notificações');
      }

      logger.info('[FOOD99 AUTH] Notificações configuradas com sucesso');

      return data;
    } catch (error) {
      logger.error('[FOOD99 AUTH] Erro ao configurar notificações:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errmsg || error.message || 'Falha ao configurar notificações');
    }
  }

  async unbindShop(authToken) {
    try {
      const response = await axios.post(`${BASE_URL}/v1/shop/shop/unbind`, {
        auth_token: authToken,
      }, {
        timeout: 15000,
      });

      const data = response.data?.data || response.data;

      if (response.data?.errno !== 0 && data.errno !== 0) {
        throw new Error(response.data?.errmsg || 'Erro ao desvincular loja');
      }

      logger.info('[FOOD99 AUTH] Loja desvinculada com sucesso');

      return data;
    } catch (error) {
      logger.error('[FOOD99 AUTH] Erro ao desvincular loja:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errmsg || error.message || 'Falha ao desvincular loja');
    }
  }
}

module.exports = new Food99AuthService();
