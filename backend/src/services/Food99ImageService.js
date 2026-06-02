const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const Food99AuthService = require('./Food99AuthService');
const { requestWithRetry, UPLOAD_TIMEOUT } = require('../lib/food99Client');

/**
 * Food99ImageService
 *
 * Gerencia upload de imagens para o storage da 99Food.
 * Endpoints:
 *  - POST /v3/image/image/uploadImage (multipart OU image_url)
 *  - POST /v3/image/image/getImageUploadInfoPageList
 */
class Food99ImageService {

  async _getAuthToken(restaurantId) {
    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId },
    });

    if (!settings?.food99AppShopId) {
      throw new Error('Configuração 99Food não encontrada para este restaurante');
    }

    const authToken = await Food99AuthService.getValidToken(settings.food99AppShopId);
    if (!authToken) {
      throw new Error('Não foi possível obter token válido para 99Food');
    }

    return { authToken, settings };
  }

  /**
   * Faz upload de imagem a partir de uma URL (a 99Food baixa e processa).
   * @param {string} restaurantId
   * @param {string} imageUrl URL pública da imagem
   * @param {string} [ext] descrição/etiqueta para identificar a imagem
   */
  async uploadFromUrl(restaurantId, imageUrl, ext = null) {
    if (!imageUrl) {
      throw new Error('imageUrl é obrigatório');
    }
    const { authToken, settings } = await this._getAuthToken(restaurantId);
    const env = settings.food99Env;

    const body = { auth_token: authToken, image_url: imageUrl };
    if (ext) body.ext = ext;

    const result = await requestWithRetry({
      method: 'post',
      url: '/v3/image/image/uploadImage',
      env,
      data: body,
      timeout: UPLOAD_TIMEOUT,
      logContext: `Erro ao enviar imagem (${imageUrl})`,
    });

    if (!result.ok) {
      throw new Error(result.error || 'Falha ao enviar imagem');
    }

    const data = result.data || {};
    logger.info(`[FOOD99 IMAGE] Imagem enviada: giftUrl=${data.giftUrl || 'N/A'} photoIdPath=${data.photoIdPath || 'N/A'}`);

    return {
      success: true,
      giftUrl: data.giftUrl || null,
      photoIdPath: data.photoIdPath || null,
      width: data.width || null,
      height: data.height || null,
    };
  }

  /**
   * Lista imagens já enviadas.
   * @param {string} restaurantId
   * @param {Object} [params]
   * @param {number} [params.currentPage=1]
   * @param {number} [params.pageSize=20]
   * @param {string} [params.giftUrl] filtrar por giftUrl específico
   * @param {string} [params.ext] filtrar por descrição
   */
  async list(restaurantId, params = {}) {
    const { authToken, settings } = await this._getAuthToken(restaurantId);
    const env = settings.food99Env;

    const payload = { auth_token: authToken };
    if (params.currentPage) payload.current_page = params.currentPage;
    if (params.pageSize) payload.page_size = String(params.pageSize);
    if (params.giftUrl) payload.gift_url = params.giftUrl;
    if (params.ext) payload.ext = params.ext;

    const result = await requestWithRetry({
      method: 'post',
      url: '/v3/image/image/getImageUploadInfoPageList',
      env,
      data: payload,
      logContext: 'Erro ao listar imagens',
    });

    if (!result.ok) {
      throw new Error(result.error || 'Falha ao listar imagens');
    }

    return { success: true, data: result.data };
  }
}

module.exports = new Food99ImageService();
