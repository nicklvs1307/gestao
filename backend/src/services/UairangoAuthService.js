const axios = require('axios');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');

class UairangoAuthService {
  constructor() {
    this.BASE_URL = 'https://www.uairango.com/api2';
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

    // Verificar se o restaurante está autorizado
    if (!settings?.uairangoActive) {
      logger.warn(`[UAIRANGO AUTH] Uairango não está ativo para restaurante ${restaurantId}`);
      return null;
    }

    try {
      const env = settings.uairangoEnv || 'production';
      const params = new URLSearchParams();
      // Usar credenciais de nível de aplicação (não por-restaurante)
      params.append('grantType', 'client_credentials');
      params.append('clientId', process.env.UAIRANGO_CLIENT_ID);
      params.append('clientSecret', process.env.UAIRANGO_CLIENT_SECRET);

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

        logger.info(`[UAIRANGO AUTH] Token OAuth obtido para restaurante ${restaurantId}`);
        return token;
      }

      return null;
    } catch (error) {
      logger.error(`[UAIRANGO AUTH] Erro ao obter token para ${restaurantId}:`, error.message);

      // Fallback para token em cache do banco
      if (settings?.uairangoAccessToken && settings.uairangoTokenExpiresAt > new Date()) {
        logger.info(`[UAIRANGO AUTH] Usando token em cache do banco para ${restaurantId}`);
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
      logger.warn(`[UAIRANGO AUTH] Refresh token não encontrado para ${restaurantId}`);
      return await this.getAccessToken(restaurantId);
    }

    try {
      const env = settings.uairangoEnv || 'production';
      const params = new URLSearchParams();
      params.append('grantType', 'refresh_token');
      // Usar credenciais de nível de aplicação (não por-restaurante)
      params.append('clientId', process.env.UAIRANGO_CLIENT_ID);
      params.append('clientSecret', process.env.UAIRANGO_CLIENT_SECRET);
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
      logger.error(`[UAIRANGO AUTH] Erro ao renovar token para ${restaurantId}:`, error.message);
      return await this.getAccessToken(restaurantId);
    }
  }

  /**
   * Inicia o fluxo de autorização OAuth 2.0 (User Code Flow)
   * Conforme documentação: /authentication/v1.0/oauth/userCode
   */
  async initiateUserAuthorization(restaurantId) {
    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId }
    });

    if (!settings?.uairangoActive) {
      throw new Error('Uairango não está ativo para este restaurante');
    }

    try {
      const env = settings.uairangoEnv || 'production';
      const params = new URLSearchParams();
      params.append('clientId', process.env.UAIRANGO_CLIENT_ID);

      const response = await axios.post(`${this.BASE_URL}/authentication/v1.0/oauth/userCode`, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-env': env,
        }
      });

      if (response.data) {
        // Armazenar userCode e verifier temporariamente para uso posterior na troca de token
        // Em um sistema de produção, isso deveria ser armazenado de forma mais segura (ex: Redis com TTL)
        await prisma.integrationSettings.update({
          where: { restaurantId },
          data: {
            uairangoAuthCodeVerifier: response.data.authorizationCodeVerifier,
            uairangoUserCode: response.data.userCode, // Código que o usuário digita no portal UaiRango
            uairangoAuthStatus: 'PENDING'
          }
        });

        return {
          success: true,
          userCode: response.data.userCode,
          verificationUrl: response.data.verificationUrl,
          verificationUrlComplete: response.data.verificationUrlComplete,
          expiresIn: response.data.expiresIn
        };
      }

      throw new Error('Resposta inválida da API de autorização');
    } catch (error) {
      logger.error(`[UAIRANGO AUTH] Erro ao iniciar autorização para ${restaurantId}:`, error.message);
      throw error;
    }
  }

  /**
   * Completa o fluxo de autorização trocando o código de autorização por token
   * Isso seria chamado após o usuário completar a autorização na página da Uairango
   */
  async completeUserAuthorization(restaurantId) {
    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId }
    });

    if (!settings?.uairangoAuthCodeVerifier) {
      throw new Error('Nenhum código de autorização pendente encontrado');
    }

    try {
      const env = settings.uairangoEnv || 'production';
      const params = new URLSearchParams();
      params.append('grantType', 'authorization_code');
      params.append('clientId', process.env.UAIRANGO_CLIENT_ID);
      params.append('clientSecret', process.env.UAIRANGO_CLIENT_SECRET);
      params.append('code', settings.uairangoUserCode); // userCode retornado na autorização (ex: UAF2-2YFK)
      params.append('code_verifier', settings.uairangoAuthCodeVerifier); // PKCE verifier

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
            uairangoRefreshToken: response.data.refreshToken || null,
            uairangoAuthStatus: 'AUTHORIZED',
            uairangoAuthorizedAt: new Date(),
            // Limpar campos temporários de OAuth
            uairangoAuthCodeVerifier: null,
            uairangoUserCode: null
          }
        });

        this.tokenCache.set(restaurantId, { token, expiresAt });

        logger.info(`[UAIRANGO AUTH] Autorização concluída para restaurante ${restaurantId}`);
        return {
          success: true,
          accessToken: token,
          expiresIn,
          refreshToken: response.data.refreshToken || null
        };
      }

      throw new Error('Falha ao obter token de acesso');
    } catch (error) {
      logger.error(`[UAIRANGO AUTH] Erro ao completar autorização para ${restaurantId}:`, error.message);
      
      // Marcar como falha na autorização
      await prisma.integrationSettings.update({
        where: { restaurantId },
        data: {
          uairangoAuthStatus: 'FAILED',
          uairangoAuthCodeVerifier: null,
          uairangoUserCode: null
        }
      });
      
      throw error;
    }
  }

  clearCache(restaurantId) {
    this.tokenCache.delete(restaurantId);
  }
}

const uairangoAuthService = new UairangoAuthService();
module.exports = uairangoAuthService;
module.exports.UairangoAuthService = UairangoAuthService;
