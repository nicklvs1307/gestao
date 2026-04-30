const axios = require('axios');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');

class UairangoAuthService {
  constructor() {
    this.BASE_URL = 'https://www.uairango.com/api2';
    this.tokenCache = new Map(); // Cache em memória: restaurantId -> { token, expiresAt }
  }

  /**
   * Obtém um token válido para o restaurante usando OAuth 2.0 (client_credentials)
   * Implementa cache e refresh automático
   */
  async getAccessToken(restaurantId) {
    // Verifica cache em memória
    const cached = this.tokenCache.get(restaurantId);
    if (cached && cached.expiresAt > new Date()) {
      return cached.token;
    }

    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId }
    });

    if (!settings?.uairangoActive || !settings?.uairangoClientId || !settings?.uairangoClientSecret) {
      logger.warn(`[UAIRANGO AUTH] Credenciais não configuradas para restaurante ${restaurantId}`);
      return null;
    }

    try {
      const response = await axios.post(`${this.BASE_URL}/authentication/v1.0/oauth/token`, null, {
        params: {
          grantType: 'client_credentials',
          clientId: settings.uairangoClientId,
          clientSecret: settings.uairangoClientSecret
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      if (response.data && response.data.accessToken) {
        const token = response.data.accessToken;
        const expiresIn = response.data.expiresIn || 21600; // 6 horas padrão
        const expiresAt = new Date(Date.now() + (expiresIn * 1000));

        // Salva no banco para persistência entre reinícios
        await prisma.integrationSettings.update({
          where: { restaurantId },
          data: {
            uairangoAccessToken: token,
            uairangoTokenExpiresAt: expiresAt,
            uairangoRefreshToken: response.data.refreshToken || null
          }
        });

        // Atualiza cache
        this.tokenCache.set(restaurantId, { token, expiresAt });

        logger.info(`[UAIRANGO AUTH] Token OAuth obtido para restaurante ${restaurantId}`);
        return token;
      }

      return null;
    } catch (error) {
      logger.error(`[UAIRANGO AUTH] Erro ao obter token para ${restaurantId}:`, error.message);
      
      // Tenta usar token salvo no banco se ainda for válido
      if (settings.uairangoAccessToken && settings.uairangoTokenExpiresAt > new Date()) {
        logger.info(`[UAIRANGO AUTH] Usando token em cache do banco para ${restaurantId}`);
        return settings.uairangoAccessToken;
      }

      return null;
    }
  }

  /**
   * Renova o token usando refresh token
   */
  async refreshToken(restaurantId) {
    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId }
    });

    if (!settings?.uairangoRefreshToken) {
      logger.warn(`[UAIRANGO AUTH] Refresh token não encontrado para ${restaurantId}`);
      return await this.getAccessToken(restaurantId); // Tenta obtener novo
    }

    try {
      const response = await axios.post(`${this.BASE_URL}/authentication/v1.0/oauth/token`, null, {
        params: {
          grantType: 'refresh_token',
          clientId: settings.uairangoClientId,
          clientSecret: settings.uairangoClientSecret,
          refreshToken: settings.uairangoRefreshToken
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
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
      logger.error(`[UAIRANGO AUTH] Erro ao renovar token para ${restaurantId}:`, error.message);
      // Se falhar o refresh, tenta obter novo token
      return await this.getAccessToken(restaurantId);
    }
  }

  /**
   * Limpa cache de tokens (útil para logout/desativação)
   */
  clearCache(restaurantId) {
    this.tokenCache.delete(restaurantId);
  }
}

const uairangoAuthService = new UairangoAuthService();
module.exports = uairangoAuthService;
module.exports.UairangoAuthService = UairangoAuthService;
