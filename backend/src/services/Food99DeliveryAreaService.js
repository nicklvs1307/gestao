const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const Food99AuthService = require('./Food99AuthService');
const { requestWithRetry } = require('../lib/food99Client');

/**
 * Food99DeliveryAreaService
 *
 * Gerencia áreas de entrega na 99Food.
 * Endpoints:
 *  - POST /v1/shop/deliveryArea/add
 *  - GET  /v1/shop/deliveryArea/list
 *  - POST /v1/shop/deliveryArea/update
 *  - POST /v1/shop/deliveryArea/delete
 *  - POST /v1/shop/deliveryArea/update4pizzacooc (atualização rápida de preço/ETA)
 */
class Food99DeliveryAreaService {

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
   * Adiciona uma área de entrega.
   * @param {string} restaurantId
   * @param {Object} params
   * @param {number} params.areaType 0=circle (radius), 1=polygon
   * @param {number} [params.radius] obrigatório se areaType=0
   * @param {Array<{lat:number,lng:number}>} [params.points] obrigatório se areaType=1
   * @param {number} params.avgDeliveryEta ETA médio em segundos
   * @param {Array} params.enableTimeList Lista de janelas de tempo habilitadas
   * @param {number} params.price Preço em centavos (menor denominação)
   */
  async add(restaurantId, params) {
    const { authToken, settings } = await this._getAuthToken(restaurantId);
    const env = settings.food99Env;

    if (params.areaType === undefined) {
      throw new Error('areaType é obrigatório (0=circle, 1=polygon)');
    }
    if (params.areaType === 0 && !params.radius) {
      throw new Error('radius é obrigatório quando areaType=0 (circle)');
    }
    if (params.areaType === 1 && (!params.points || !Array.isArray(params.points) || params.points.length < 3)) {
      throw new Error('points (mínimo 3) é obrigatório quando areaType=1 (polygon)');
    }
    if (params.avgDeliveryEta === undefined) {
      throw new Error('avgDeliveryEta é obrigatório (segundos)');
    }
    if (!Array.isArray(params.enableTimeList)) {
      throw new Error('enableTimeList é obrigatório');
    }
    if (params.price === undefined) {
      throw new Error('price é obrigatório (em centavos)');
    }

    const payload = {
      auth_token: authToken,
      area_type: params.areaType,
      avg_delivery_eta: params.avgDeliveryEta,
      enable_time_list: params.enableTimeList,
      price: params.price,
    };

    if (params.areaType === 0) {
      payload.radius = params.radius;
    } else {
      payload.points = params.points.map(p => ({
        lat: String(p.lat),
        lng: String(p.lng),
        coordinate_type: p.coordinate_type || 'wgs84',
      }));
    }

    const result = await requestWithRetry({
      method: 'post',
      url: '/v1/shop/deliveryArea/add',
      env,
      data: payload,
      logContext: `Erro ao adicionar delivery area (restaurant ${restaurantId})`,
    });

    if (!result.ok) {
      throw new Error(result.error || 'Falha ao adicionar delivery area');
    }

    const data = result.data || {};
    logger.info(`[FOOD99 DELIVERY AREA] Área adicionada: ${JSON.stringify(data.area_id_list || [])}`);
    return {
      success: true,
      areaIds: data.area_id_list || [],
    };
  }

  async list(restaurantId) {
    const { authToken, settings } = await this._getAuthToken(restaurantId);
    const env = settings.food99Env;

    const result = await requestWithRetry({
      method: 'get',
      url: '/v1/shop/deliveryArea/list',
      env,
      params: { auth_token: authToken },
      logContext: `Erro ao listar delivery areas (restaurant ${restaurantId})`,
    });

    if (!result.ok) {
      throw new Error(result.error || 'Falha ao listar delivery areas');
    }

    return { success: true, data: result.data };
  }

  async update(restaurantId, areaIds, params) {
    if (!Array.isArray(areaIds) || areaIds.length === 0) {
      throw new Error('areaIds (array não vazio) é obrigatório');
    }
    const { authToken, settings } = await this._getAuthToken(restaurantId);
    const env = settings.food99Env;

    if (params.areaType === undefined) {
      throw new Error('areaType é obrigatório (0=circle, 1=polygon)');
    }

    const payload = {
      auth_token: authToken,
      area_id_list: areaIds,
      areaType: params.areaType,
      avg_delivery_eta: params.avgDeliveryEta,
      enable_time_list: params.enableTimeList || [],
      price: params.price,
    };

    if (params.areaType === 0) {
      payload.radius = params.radius;
    } else {
      payload.points = (params.points || []).map(p => ({
        lat: String(p.lat),
        lng: String(p.lng),
        coordinate_type: p.coordinate_type || 'wgs84',
      }));
    }

    const result = await requestWithRetry({
      method: 'post',
      url: '/v1/shop/deliveryArea/update',
      env,
      data: payload,
      logContext: `Erro ao atualizar delivery areas ${areaIds.join(',')}`,
    });

    if (!result.ok) {
      throw new Error(result.error || 'Falha ao atualizar delivery areas');
    }

    return { success: true };
  }

  async delete(restaurantId, areaIds) {
    if (!Array.isArray(areaIds) || areaIds.length === 0) {
      throw new Error('areaIds (array não vazio) é obrigatório');
    }
    const { authToken, settings } = await this._getAuthToken(restaurantId);
    const env = settings.food99Env;

    const result = await requestWithRetry({
      method: 'post',
      url: '/v1/shop/deliveryArea/delete',
      env,
      data: { auth_token: authToken, area_id_list: areaIds },
      logContext: `Erro ao deletar delivery areas ${areaIds.join(',')}`,
    });

    if (!result.ok) {
      throw new Error(result.error || 'Falha ao deletar delivery areas');
    }

    return { success: true };
  }

  /**
   * Atualização rápida (estilo pizzaria) — apenas preço e ETA médio.
   * Aplica em TODAS as áreas de entrega da loja.
   */
  async updatePriceAndEta(restaurantId, price, avgDeliveryEta) {
    if (price === undefined || avgDeliveryEta === undefined) {
      throw new Error('price e avgDeliveryEta são obrigatórios');
    }
    const { authToken, settings } = await this._getAuthToken(restaurantId);
    const env = settings.food99Env;

    const result = await requestWithRetry({
      method: 'post',
      url: '/v1/shop/deliveryArea/update4pizzacooc',
      env,
      data: {
        auth_token: authToken,
        avg_delivery_eta: avgDeliveryEta,
        price,
      },
      logContext: `Erro ao atualizar preço/ETA delivery (restaurant ${restaurantId})`,
    });

    if (!result.ok) {
      throw new Error(result.error || 'Falha ao atualizar preço/ETA');
    }

    return { success: true };
  }

  /**
   * Helper: converte DeliveryArea local (RADIUS/POLYGON) para formato 99Food.
   */
  buildFromLocal(area) {
    if (area.type === 'RADIUS') {
      const radius = area.radius || 5000;
      return {
        areaType: 0,
        radius: Math.round(radius / 1000), // converte m → km
        avgDeliveryEta: 1800, // default 30min
        enableTimeList: [{ begin: '00:00', end: '23:59' }],
        price: Math.round((area.fee || 0) * 100),
      };
    }

    // POLYGON
    const points = Array.isArray(area.geometry) ? area.geometry : [];
    return {
      areaType: 1,
      points: points.map(p => ({ lat: p.lat || p.latitude, lng: p.lng || p.longitude })),
      avgDeliveryEta: 1800,
      enableTimeList: [{ begin: '00:00', end: '23:59' }],
      price: Math.round((area.fee || 0) * 100),
    };
  }
}

module.exports = new Food99DeliveryAreaService();
