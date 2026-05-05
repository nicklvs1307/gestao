const axios = require('axios');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const socketLib = require('../lib/socket');
const IfoodAuthService = require('./IfoodAuthService');

const BASE_URL = 'https://merchant-api.ifood.com.br';

/**
 * IfoodOrderService — API interaction only.
 * 
 * Order creation/cancel/update are now handled by:
 * - OrderService.createOrderFromIntegration() (via IfoodOrderAdapter + IntegrationBaseService)
 * - IntegrationOrderService.cancelFromIntegration()
 * - IntegrationOrderService.updateFromIntegration()
 * 
 * This service only handles iFood Merchant API calls (confirm, reject, dispatch, etc.)
 */
class IfoodOrderService {

  _notifySyncError(restaurantId, orderId, message) {
    logger.error(`[IFOOD SYNC ERROR] Order ${orderId}: ${message}`);
    socketLib.emitToRestaurant(restaurantId, 'sync_error', {
      orderId,
      service: 'IFOOD',
      message: message || 'Falha desconhecida na integração'
    });
  }

  /**
   * Helper interno: busca pedido e obtém token válido via IfoodAuthService.
   * Retorna { order, token } ou { success: false, error }.
   */
  async _getOrderAndToken(orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: {
          include: { integrationSettings: true }
        }
      }
    });

    if (!order || !order.ifoodOrderId) {
      return { success: false, error: 'Pedido não encontrado ou não é do iFood' };
    }

    const token = await IfoodAuthService.getValidToken();

    if (!token) {
      return { success: false, error: 'Token iFood expirado ou indisponível. Verifique as credenciais.' };
    }

    return { order, token };
  }

  async confirmOrder(orderId, restaurantId) {
    try {
      const result = await this._getOrderAndToken(orderId);
      if (result.success === false) return result;

      const { order, token } = result;

      await axios.post(
        `${BASE_URL}/order/v1.0/orders/${order.ifoodOrderId}/confirm`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'PREPARING' }
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      logger.error(`[IFOOD] Erro ao confirmar pedido:`, errorMsg);
      this._notifySyncError(restaurantId, orderId, `Erro ao confirmar: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  async rejectOrder(orderId, restaurantId, reason) {
    try {
      const result = await this._getOrderAndToken(orderId);
      if (result.success === false) return result;

      const { order, token } = result;

      await axios.post(
        `${BASE_URL}/order/v1.0/orders/${order.ifoodOrderId}/requestCancellation`,
        { reason: reason || '501' },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELED',
          canceledAt: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      logger.error(`[IFOOD] Erro ao rejeitar pedido:`, errorMsg);
      this._notifySyncError(restaurantId, orderId, `Erro ao rejeitar: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  async startPreparation(orderId, restaurantId) {
    try {
      const result = await this._getOrderAndToken(orderId);
      if (result.success === false) return result;

      const { order, token } = result;

      await axios.post(
        `${BASE_URL}/order/v1.0/orders/${order.ifoodOrderId}/startPreparation`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'PREPARING',
          preparingAt: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      logger.error(`[IFOOD] Erro ao iniciar preparação:`, errorMsg);
      this._notifySyncError(restaurantId, orderId, `Erro ao iniciar preparação: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  async markReady(orderId, restaurantId) {
    try {
      const result = await this._getOrderAndToken(orderId);
      if (result.success === false) return result;

      const { order, token } = result;

      const endpoint = order.orderType === 'PICKUP'
        ? `${BASE_URL}/order/v1.0/orders/${order.ifoodOrderId}/readyToPickup`
        : `${BASE_URL}/order/v1.0/orders/${order.ifoodOrderId}/dispatch`;

      await axios.post(
        endpoint,
        order.orderType === 'DELIVERY' ? { deliveredBy: 'MERCHANT' } : {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'READY',
          readyAt: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      logger.error(`[IFOOD] Erro ao marcar pronto:`, errorMsg);
      this._notifySyncError(restaurantId, orderId, `Erro ao marcar pronto: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }
}

module.exports = new IfoodOrderService();
