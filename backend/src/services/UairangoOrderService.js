const axios = require('axios');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const socketLib = require('../lib/socket');

/**
 * UairangoOrderService — API interaction only.
 * 
 * Order creation is now handled by:
 * - OrderService.createOrderFromIntegration() (via UairangoOrderAdapter + IntegrationBaseService)
 * 
 * Cancel/update are handled by:
 * - IntegrationOrderService.cancelFromIntegration()
 * - IntegrationOrderService.updateFromIntegration()
 * 
 * This service only handles Uairango platform API calls (confirm, reject, markReady).
 */
class UairangoOrderService {
  BASE_URL = 'https://www.uairango.com/api2';

  /**
   * Obtém o token de acesso válido para o restaurante.
   */
  async getAccessToken(restaurantId) {
    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId }
    });

    if (!settings?.uairangoActive || !settings?.uairangoToken) {
      return null;
    }

    try {
      const response = await axios.post(`${this.BASE_URL}/login`, {
        token: settings.uairangoToken
      });

      if (response.data && response.data.success && response.data.token) {
        return response.data.token;
      }
      return null;
    } catch (error) {
      logger.error(`[UAIRANGO] Erro ao obter token para restaurante ${restaurantId}:`, error.message);
      return null;
    }
  }

  /**
   * Confirma o pedido no Uai Rangô (API).
   */
  async confirmOrderOnUairango(restaurantId, uairangoOrderId) {
    const token = await this.getAccessToken(restaurantId);
    if (!token) return;

    try {
      await axios.post(
        `${this.BASE_URL}/auth/pedido/confirma/${uairangoOrderId}`,
        {},
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      logger.info(`[UAIRANGO] Pedido ${uairangoOrderId} confirmado no Uai Rangô`);
    } catch (error) {
      logger.error(`[UAIRANGO] Erro ao confirmar pedido ${uairangoOrderId} no Uai Rangô:`, error.message);
    }
  }

  /**
   * Confirma um pedido no sistema e no Uai Rangô.
   */
  async confirmOrder(orderId, restaurantId) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId }
    });

    if (!order || !order.uairangoOrderId) {
      throw new Error('Pedido não encontrado ou não é do Uai Rangô');
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CONFIRMED',
        preparingAt: new Date()
      }
    });

    const token = await this.getAccessToken(restaurantId);
    if (token) {
      try {
        await axios.post(
          `${this.BASE_URL}/auth/pedido/confirma/${order.uairangoOrderId}`,
          {},
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      } catch (error) {
        logger.error(`[UAIRANGO] Erro ao confirmar no Uai Rangô:`, error.message);
      }
    }

    socketLib.emitToRestaurant(restaurantId, 'order_updated', { orderId });

    return { success: true };
  }

  /**
   * Rejeita/cancela um pedido no sistema e no Uai Rangô.
   */
  async rejectOrder(orderId, restaurantId, reason) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId }
    });

    if (!order || !order.uairangoOrderId) {
      throw new Error('Pedido não encontrado ou não é do Uai Rangô');
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELED',
        canceledAt: new Date()
      }
    });

    const token = await this.getAccessToken(restaurantId);
    if (token) {
      try {
        await axios.post(
          `${this.BASE_URL}/auth/pedido/cancela/${order.uairangoOrderId}`,
          {},
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      } catch (error) {
        logger.error(`[UAIRANGO] Erro ao cancelar no Uai Rangô:`, error.message);
      }
    }

    socketLib.emitToRestaurant(restaurantId, 'order_updated', { orderId });

    return { success: true };
  }

  /**
   * Marca o pedido como pronto/dispatch no sistema e no Uai Rangô.
   */
  async markReady(orderId, restaurantId) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId }
    });

    if (!order || !order.uairangoOrderId) {
      throw new Error('Pedido não encontrado ou não é do Uai Rangô');
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'READY',
        readyAt: new Date()
      }
    });

    const token = await this.getAccessToken(restaurantId);
    if (token) {
      try {
        await axios.post(
          `${this.BASE_URL}/auth/pedido/notifica/${order.uairangoOrderId}`,
          {},
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      } catch (error) {
        logger.error(`[UAIRANGO] Erro ao notificar no Uai Rangô:`, error.message);
      }
    }

    socketLib.emitToRestaurant(restaurantId, 'order_updated', { orderId });

    return { success: true };
  }

  /**
   * Notifica erro de sincronização via socket.
   */
  _notifySyncError(restaurantId, orderId, message) {
    logger.error(`[UAIRANGO SYNC ERROR] Order ${orderId}: ${message}`);
    socketLib.emitToRestaurant(restaurantId, 'sync_error', {
      orderId,
      service: 'UAIRANGO',
      message: message || 'Falha desconhecida na integração'
    });
  }
}

module.exports = new UairangoOrderService();
