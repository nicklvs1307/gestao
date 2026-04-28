const axios = require('axios');
const logger = require('../config/logger');

const BASE_URL = 'https://merchant-api.ifood.com.br';

class IfoodAuthService {

  _getCredentials() {
    const clientId = process.env.IFOOD_CLIENT_ID;
    const clientSecret = process.env.IFOOD_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('IFOOD_CLIENT_ID ou IFOOD_CLIENT_SECRET não configurados nas variáveis de ambiente');
    }

    return { clientId, clientSecret };
  }

  /**
   * Obtém token de acesso usando grant type client_credentials.
   * Modelo centralizado: mesmo token para todas as lojas.
   * Token expira em 6 horas (21600s).
   */
  async requestAccessToken() {
    const { clientId, clientSecret } = this._getCredentials();

    try {
      const response = await axios.post(
        `${BASE_URL}/authentication/v1.0/oauth/token`,
        null,
        {
          params: {
            grantType: 'client_credentials',
            clientId,
            clientSecret
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 15000
        }
      );

      const { accessToken, expiresIn } = response.data;

      if (!accessToken) {
        throw new Error('Token de acesso não retornado pela API iFood');
      }

      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      logger.info(`[IFOOD AUTH] Token obtido. Expira em ${expiresIn}s (${new Date(expiresAt).toISOString()})`);

      return {
        accessToken,
        expiresAt,
        expiresIn
      };
    } catch (error) {
      logger.error('[IFOOD AUTH] Erro ao obter token:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Falha ao obter token de acesso');
    }
  }

  /**
   * Obtém token válido ou renova se necessário.
   * Gerencia token em memória para todas as requisições.
   */
  async getValidToken() {
    const { clientId, clientSecret } = this._getCredentials();

    if (!clientId || !clientSecret) {
      logger.warn('[IFOOD AUTH] Credenciais não configuradas');
      return null;
    }

    const now = new Date();

    if (this._cachedToken && this._tokenExpiresAt && this._tokenExpiresAt > now) {
      if ((this._tokenExpiresAt - now) > 5 * 60 * 1000) {
        return this._cachedToken;
      }
      logger.info('[IFOOD AUTH] Token expirando em breve, renovando...');
    }

    try {
      const result = await this.requestAccessToken();
      this._cachedToken = result.accessToken;
      this._tokenExpiresAt = result.expiresAt;
      this._tokenExpiresIn = result.expiresIn;

      return this._cachedToken;
    } catch (error) {
      logger.error('[IFOOD AUTH] Erro ao obter token válido:', error.message);
      return null;
    }
  }

  /**
   * Verifica se o token está configurado e válido (sem renewal automático).
   */
  async checkConnectionStatus() {
    const { clientId, clientSecret } = this._getCredentials();

    if (!clientId || !clientSecret) {
      return {
        connected: false,
        status: 'not_configured',
        message: 'Credenciais não configuradas no sistema'
      };
    }

    if (!this._cachedToken) {
      return {
        connected: false,
        status: 'no_token',
        message: 'Token ainda não requerido'
      };
    }

    const now = new Date();
    const expires = this._tokenExpiresAt;

    if (!expires) {
      return {
        connected: true,
        status: 'active',
        message: 'Token ativo (sem informação de expiração)'
      };
    }

    const minutesUntilExpiry = Math.floor((expires - now) / 1000 / 60);

    if (minutesUntilExpiry <= 0) {
      return {
        connected: false,
        status: 'expired',
        message: 'Token expirado',
        expiresAt: expires
      };
    }

    return {
      connected: true,
      status: 'active',
      message: `Token válido (expira em ${minutesUntilExpiry} min)`,
      expiresAt: expires
    };
  }

  /**
   * Desconecta a integração (limpa cache).
   */
  async disconnect() {
    this._cachedToken = null;
    this._tokenExpiresAt = null;
    this._tokenExpiresIn = null;

    logger.info('[IFOOD AUTH] Integração desconectada (cache limpo)');

    return { success: true };
  }

  /**
   * Inicia o job de renovação automática de token.
   * Deve ser chamado na inicialização do app.
   */
  initTokenRefreshJob(schedulerFn) {
    if (this._refreshJobInterval) {
      logger.info('[IFOOD AUTH] Job de renovação já está ativo');
      return;
    }

    logger.info('[IFOOD AUTH] Iniciando job de renovação automática (a cada 5 minutos)');

    this._refreshJobInterval = setInterval(async () => {
      try {
        const token = await this.getValidToken();
        if (token) {
          logger.debug('[IFOOD AUTH] Token renovado com sucesso');
        }
      } catch (error) {
        logger.error('[IFOOD AUTH] Erro na renovação:', error.message);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Para o job de renovação.
   */
  stopTokenRefreshJob() {
    if (this._refreshJobInterval) {
      clearInterval(this._refreshJobInterval);
      this._refreshJobInterval = null;
      logger.info('[IFOOD AUTH] Job de renovação parado');
    }
  }
}

module.exports = new IfoodAuthService();