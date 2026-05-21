const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const socketLib = require('../lib/socket');
const Food99AuthService = require('./Food99AuthService');
const Food99OrderAdapter = require('./Food99OrderAdapter');

class Food99OrderService {

  _notifySyncError(restaurantId, orderId, message) {
    logger.error(`[FOOD99 SYNC ERROR] Order ${orderId}: ${message}`);
    socketLib.emitToRestaurant(restaurantId, 'sync_error', {
      orderId,
      service: 'FOOD99',
      message: message || 'Falha desconhecida na integração',
    });
  }

  async _getOrderAndToken(orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: {
          include: { integrationSettings: true },
        },
      },
    });

    if (!order || !order.food99OrderId) {
      return { success: false, error: 'Pedido não encontrado ou não é da 99Food' };
    }

    const settings = order.restaurant?.integrationSettings;
    if (!settings?.food99AppShopId) {
      return { success: false, error: 'app_shop_id não configurado para esta loja' };
    }

    const token = await Food99AuthService.getValidToken(settings.food99AppShopId);
    if (!token) {
      return { success: false, error: 'Token 99Food expirado ou indisponível' };
    }

    return { order, token, settings };
  }

  async confirmOrder(orderId, restaurantId) {
    try {
      const result = await this._getOrderAndToken(orderId);
      if (result.success === false) return result;

      const { order } = result;

      await Food99OrderAdapter.confirmOrderOnPlatform(restaurantId, order.food99OrderId);

      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'PREPARING' },
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.errmsg || error.message;
      logger.error(`[FOOD99] Erro ao confirmar:`, errorMsg);
      this._notifySyncError(restaurantId, orderId, `Erro ao confirmar: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  async rejectOrder(orderId, restaurantId, reasonId = 1010, reason = 'Pedido recusado') {
    try {
      const result = await this._getOrderAndToken(orderId);
      if (result.success === false) return result;

      const { order } = result;

      await Food99OrderAdapter.rejectOrderOnPlatform(restaurantId, order.food99OrderId, reasonId);

      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELED', canceledAt: new Date() },
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.errmsg || error.message;
      logger.error(`[FOOD99] Erro ao rejeitar:`, errorMsg);
      this._notifySyncError(restaurantId, orderId, `Erro ao rejeitar: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  async markReady(orderId, restaurantId) {
    try {
      const result = await this._getOrderAndToken(orderId);
      if (result.success === false) return result;

      const { order } = result;

      await Food99OrderAdapter.markReadyOnPlatform(restaurantId, order.food99OrderId);

      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'READY', readyAt: new Date() },
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.errmsg || error.message;
      logger.error(`[FOOD99] Erro ao marcar pronto:`, errorMsg);
      this._notifySyncError(restaurantId, orderId, `Erro ao marcar pronto: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  async getOrderDetails(orderId, restaurantId) {
    const result = await this._getOrderAndToken(orderId);
    if (result.success === false) return result;

    const { order, token } = result;

    try {
      const axios = require('axios');
      const BASE_URL = process.env.FOOD99_BASE_URL || 'https://openapi.didi-food.com';
      const response = await axios.get(`${BASE_URL}/v1/order/order/detail`, {
        params: { auth_token: token, order_id: order.food99OrderId },
        timeout: 10000,
      });

      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new Food99OrderService();
