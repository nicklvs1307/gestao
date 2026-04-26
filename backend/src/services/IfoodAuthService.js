const axios = require('axios');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');

const BASE_URL = 'https://merchant-api.ifood.com.br';

class IfoodAuthService {

  /**
   * Retorna clientId e clientSecret centralizados (Docker secrets / .env).
   * Lança erro se não estiverem configurados.
   */
  _getCredentials() {
    const clientId = process.env.IFOOD_CLIENT_ID;
    const clientSecret = process.env.IFOOD_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('IFOOD_CLIENT_ID ou IFOOD_CLIENT_SECRET não configurados nas variáveis de ambiente');
    }

    return { clientId, clientSecret };
  }

  async requestUserCode(restaurantId) {
    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId }
    });

    const { clientId } = this._getCredentials();

    try {
      const response = await axios.post(
        `${BASE_URL}/authentication/v1.0/oauth/userCode`,
        null,
        {
          params: { clientId },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { userCode, authorizationCodeVerifier, verificationUrlComplete, expiresIn } = response.data;

      await prisma.integrationSettings.update({
        where: { restaurantId },
        data: {
          ifoodAuthCodeVerifier: authorizationCodeVerifier,
          ifoodAccessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000)
        }
      });

      logger.info(`[IFOOD AUTH] Código de vinculação gerado para ${restaurantId}: ${userCode}`);

      return {
        userCode,
        authorizationCodeVerifier,
        verificationUrlComplete,
        expiresIn
      };
    } catch (error) {
      logger.error('[IFOOD AUTH] Erro ao solicitar código de vinculação:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Falha ao solicitar código de vinculação');
    }
  }

  async completeLink(restaurantId, authorizationCode) {
    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId }
    });

    if (!settings?.ifoodAuthCodeVerifier) {
      throw new Error('Código verificador não encontrado. Inicie o processo de vinculação novamente.');
    }

    const { clientId, clientSecret } = this._getCredentials();
    const authorizationCodeVerifier = settings.ifoodAuthCodeVerifier;

    try {
      const response = await axios.post(
        `${BASE_URL}/authentication/v1.0/oauth/token`,
        null,
        {
          params: {
            grantType: 'authorization_code',
            clientId,
            clientSecret,
            authorizationCode,
            authorizationCodeVerifier
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { accessToken, refreshToken, expiresIn, type } = response.data;

      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      await prisma.integrationSettings.update({
        where: { restaurantId },
        data: {
          ifoodAccessToken: accessToken,
          ifoodRefreshToken: refreshToken,
          ifoodAccessTokenExpiresAt: expiresAt,
          ifoodIntegrationActive: true,
          ifoodAuthCodeVerifier: null  // Limpar verifier após uso
        }
      });

      logger.info(`[IFOOD AUTH] Tokens armazenados para ${restaurantId}. Expira em: ${expiresAt}`);

      return {
        type,
        expiresAt,
        expiresIn
      };
    } catch (error) {
      logger.error('[IFOOD AUTH] Erro ao trocar código por token:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Falha ao completar vinculação. Verifique o código e tente novamente.');
    }
  }

  async refreshAccessToken(restaurantId) {
    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId }
    });

    if (!settings?.ifoodIntegrationActive) {
      return null;
    }

    if (!settings?.ifoodRefreshToken) {
      logger.warn(`[IFOOD AUTH] Refresh token não encontrado para ${restaurantId}`);
      return null;
    }

    const { clientId, clientSecret } = this._getCredentials();
    const refreshToken = settings.ifoodRefreshToken;

    try {
      const response = await axios.post(
        `${BASE_URL}/authentication/v1.0/oauth/token`,
        null,
        {
          params: {
            grantType: 'refresh_token',
            clientId,
            clientSecret,
            refreshToken
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data;

      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      await prisma.integrationSettings.update({
        where: { restaurantId },
        data: {
          ifoodAccessToken: accessToken,
          ifoodRefreshToken: newRefreshToken || refreshToken,
          ifoodAccessTokenExpiresAt: expiresAt
        }
      });

      logger.info(`[IFOOD AUTH] Token renovado para ${restaurantId}. Novo acesso: ${expiresAt}`);

      return {
        accessToken,
        refreshToken: newRefreshToken || refreshToken,
        expiresAt
      };
    } catch (error) {
      logger.error('[IFOOD AUTH] Erro ao renovar token:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        logger.warn(`[IFOOD AUTH] Refresh token expirado ou inválido para ${restaurantId}. Desativando integração.`);
        
        await prisma.integrationSettings.update({
          where: { restaurantId },
          data: {
            ifoodIntegrationActive: false,
            ifoodAccessToken: null,
            ifoodRefreshToken: null,
            ifoodAccessTokenExpiresAt: null
          }
        });
      }
      
      return null;
    }
  }

  async getValidToken(restaurantId) {
    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId }
    });

    if (!settings?.ifoodIntegrationActive) {
      return null;
    }

    if (!process.env.IFOOD_CLIENT_ID || !process.env.IFOOD_CLIENT_SECRET) {
      return null;
    }

    const expiresAt = settings.ifoodAccessTokenExpiresAt;
    const accessToken = settings.ifoodAccessToken;

    if (!accessToken) {
      return null;
    }

    if (expiresAt && new Date(expiresAt) <= new Date(Date.now() + 5 * 60 * 1000)) {
      logger.info(`[IFOOD AUTH] Token expirando em breve para ${restaurantId}. Renovando...`);
      
      const refreshed = await this.refreshAccessToken(restaurantId);
      
      if (!refreshed) {
        return null;
      }
      
      return refreshed.accessToken;
    }

    return accessToken;
  }

  async disconnect(restaurantId) {
    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId }
    });

    if (!settings) {
      return { success: true };
    }

    await prisma.integrationSettings.update({
      where: { restaurantId },
      data: {
        ifoodAccessToken: null,
        ifoodRefreshToken: null,
        ifoodAccessTokenExpiresAt: null,
        ifoodAuthCodeVerifier: null,
        ifoodIntegrationActive: false
      }
    });

    logger.info(`[IFOOD AUTH] Integração desconectada para ${restaurantId}`);

    return { success: true };
  }

  async checkConnectionStatus(restaurantId) {
    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId }
    });

    if (!settings?.ifoodIntegrationActive) {
      return {
        connected: false,
        status: 'disconnected',
        message: 'Integração não está ativa'
      };
    }

    if (!settings.ifoodAccessToken || !settings.ifoodRefreshToken) {
      return {
        connected: false,
        status: 'invalid',
        message: 'Tokens não configurados'
      };
    }

    const expiresAt = settings.ifoodAccessTokenExpiresAt;
    
    if (!expiresAt) {
      return {
        connected: true,
        status: 'no_expiry',
        message: 'Token configurado (sem informação de expiração)'
      };
    }

    const now = new Date();
    const expires = new Date(expiresAt);
    const minutesUntilExpiry = Math.floor((expires - now) / 1000 / 60);

    if (minutesUntilExpiry <= 0) {
      return {
        connected: false,
        status: 'expired',
        message: 'Token expirado',
        expiresAt
      };
    }

    return {
      connected: true,
      status: 'connected',
      message: `Token válido (expira em ${minutesUntilExpiry} min)`,
      expiresAt
    };
  }
}

module.exports = new IfoodAuthService();