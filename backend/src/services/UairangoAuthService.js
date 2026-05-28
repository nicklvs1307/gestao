const axios = require('axios');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');

class UairangoAuthService {
  constructor() {
    this.BASE_URL = 'https://merchant-api.uairango.com';
    this.tokenCache = new Map();
  }

  async getAccessToken(restaurantId) {
    const cached = this.tokenCache.get(restaurantId);
    if (cached && cached.expiresAt > new Date()) {
      return cached.token;
    }

    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId }
    });

    if (!settings?.uairangoActive) {
      logger.warn(`[UAIRANGO AUTH] Integração não ativa para restaurante ${restaurantId}`);
      return null;
    }

    const clientId = process.env.UAIRANGO_CLIENT_ID;
    const clientSecret = process.env.UAIRANGO_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      logger.error(`[UAIRANGO AUTH] Credenciais do APP não configuradas - UAIRANGO_CLIENT_ID=${clientId ? 'OK' : 'MISSING'}, UAIRANGO_CLIENT_SECRET=${clientSecret ? 'OK' : 'MISSING'}`);
      return null;
    }

    try {
      const env = settings.uairangoEnv || 'production';
      const params = new URLSearchParams();
      params.append('grantType', 'client_credentials');
      params.append('clientId', clientId);
      params.append('clientSecret', clientSecret);

      const response = await axios.post(`${this.BASE_URL}/authentication/v1.0/oauth/token`, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-env': env,
        }
      });

      if (response.data && response.data.accessToken) {
        const token = response.data.accessToken;
        const expiresIn = response.data.expiresIn || 21600;
        const expiresAt = new Date(Date.now() + (expiresIn * 1000));

        await prisma.integrationSettings.update({
          where: { restaurantId },
          data: {
            uairangoAccessToken: token,
            uairangoTokenExpiresAt: expiresAt,
            uairangoRefreshToken: response.data.refreshToken || null
          }
        });

        this.tokenCache.set(restaurantId, { token, expiresAt });

        logger.info(`[UAIRANGO AUTH] Token obtido para restaurante ${restaurantId} (expira em ${expiresIn}s)`);
        return token;
      }

      return null;
    } catch (error) {
      const statusCode = error.response?.status;
      const apiData = error.response?.data;
      const apiMsg = apiData?.error?.message || apiData?.message || '';

      if (statusCode === 401) {
        logger.error(`[UAIRANGO AUTH] Credenciais do APP inválidas (401) para restaurante ${restaurantId}: ${apiMsg}`);
      } else if (statusCode === 403) {
        logger.error(`[UAIRANGO AUTH] Conta bloqueada ou sem acesso (403) para restaurante ${restaurantId}: ${apiMsg}`);
      } else if (statusCode === 428) {
        logger.error(`[UAIRANGO AUTH] Termo de uso não aceito (428) para restaurante ${restaurantId}: ${apiMsg}`);
      } else {
        logger.error(`[UAIRANGO AUTH] Erro ${statusCode || 'desconhecido'} ao obter token para restaurante ${restaurantId}: ${apiMsg || error.message}`);
      }

      if (settings?.uairangoAccessToken && settings.uairangoTokenExpiresAt > new Date()) {
        logger.info(`[UAIRANGO AUTH] Usando token em cache do banco para restaurante ${restaurantId}`);
        return settings.uairangoAccessToken;
      }

      return null;
    }
  }

  async refreshToken(restaurantId) {
    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId }
    });

    if (!settings?.uairangoRefreshToken) {
      logger.warn(`[UAIRANGO AUTH] Refresh token não encontrado para restaurante ${restaurantId}, obtendo novo token`);
      return await this.getAccessToken(restaurantId);
    }

    const clientId = process.env.UAIRANGO_CLIENT_ID;
    const clientSecret = process.env.UAIRANGO_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      logger.error(`[UAIRANGO AUTH] Credenciais do APP não configuradas para refresh - UAIRANGO_CLIENT_ID=${clientId ? 'OK' : 'MISSING'}`);
      return await this.getAccessToken(restaurantId);
    }

    try {
      const env = settings.uairangoEnv || 'production';
      const params = new URLSearchParams();
      params.append('grantType', 'refresh_token');
      params.append('clientId', clientId);
      params.append('clientSecret', clientSecret);
      params.append('refreshToken', settings.uairangoRefreshToken);

      const response = await axios.post(`${this.BASE_URL}/authentication/v1.0/oauth/token`, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-env': env,
        }
      });

      if (response.data && response.data.accessToken) {
        const token = response.data.accessToken;
        const expiresIn = response.data.expiresIn || 21600;
        const expiresAt = new Date(Date.now() + (expiresIn * 1000));

        await prisma.integrationSettings.update({
          where: { restaurantId },
          data: {
            uairangoAccessToken: token,
            uairangoTokenExpiresAt: expiresAt,
            uairangoRefreshToken: response.data.refreshToken || settings.uairangoRefreshToken
          }
        });

        this.tokenCache.set(restaurantId, { token, expiresAt });
        logger.info(`[UAIRANGO AUTH] Token renovado para restaurante ${restaurantId}`);
        return token;
      }
    } catch (error) {
      const statusCode = error.response?.status;
      const apiMsg = error.response?.data?.error?.message || error.message;
      logger.error(`[UAIRANGO AUTH] Erro ao renovar token (${statusCode}) para restaurante ${restaurantId}: ${apiMsg}`);
      return await this.getAccessToken(restaurantId);
    }
  }

  clearCache(restaurantId) {
    this.tokenCache.delete(restaurantId);
  }
}

const uairangoAuthService = new UairangoAuthService();
module.exports = uairangoAuthService;
module.exports.UairangoAuthService = UairangoAuthService;
