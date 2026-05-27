const logger = require('../config/logger');
const api = require('./UairangoApiClient');

class UairangoOrderService {
  async confirmOrder(restaurantId, platformOrderId) {
    try {
      await api.post(restaurantId, `/order/v1.0/orders/${platformOrderId}/confirm`);
      logger.info(`[UAIRANGO ORDER] Pedido ${platformOrderId} confirmado`);
      return true;
    } catch (error) {
      logger.error(`[UAIRANGO ORDER] Erro ao confirmar ${platformOrderId}:`, error.message);
      return false;
    }
  }

  async rejectOrder(restaurantId, platformOrderId, reasonCode = '1') {
    try {
      await api.post(restaurantId, `/order/v1.0/orders/${platformOrderId}/requestCancellation`, {
        cancellationCode: parseInt(reasonCode),
        reason: 'Cancelamento solicitado pelo estabelecimento'
      });
      logger.info(`[UAIRANGO ORDER] Pedido ${platformOrderId} cancelado`);
      return true;
    } catch (error) {
      logger.error(`[UAIRANGO ORDER] Erro ao cancelar ${platformOrderId}:`, error.message);
      return false;
    }
  }

  async dispatchOrder(restaurantId, platformOrderId) {
    try {
      await api.post(restaurantId, `/order/v1.0/orders/${platformOrderId}/dispatch`);
      logger.info(`[UAIRANGO ORDER] Pedido ${platformOrderId} despachado`);
      return true;
    } catch (error) {
      logger.error(`[UAIRANGO ORDER] Erro ao despachar ${platformOrderId}:`, error.message);
      return false;
    }
  }

  async readyToPickup(restaurantId, platformOrderId) {
    try {
      await api.post(restaurantId, `/order/v1.0/orders/${platformOrderId}/readyToPickup`);
      logger.info(`[UAIRANGO ORDER] Pedido ${platformOrderId} marcado como pronto`);
      return true;
    } catch (error) {
      logger.error(`[UAIRANGO ORDER] Erro ao notificar pronto ${platformOrderId}:`, error.message);
      return false;
    }
  }

  async getCancellationReasons(restaurantId, platformOrderId) {
    try {
      const response = await api.get(restaurantId, `/order/v1.0/orders/${platformOrderId}/cancellationReasons`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 204) return [];
      logger.error(`[UAIRANGO ORDER] Erro ao buscar motivos de cancelamento:`, error.message);
      throw new Error('Falha ao buscar motivos de cancelamento');
    }
  }

  async requestCancellation(restaurantId, platformOrderId, cancellationCode, reason) {
    try {
      await api.post(restaurantId, `/order/v1.0/orders/${platformOrderId}/requestCancellation`, {
        cancellationCode,
        reason
      });
      logger.info(`[UAIRANGO ORDER] Cancelamento solicitado para pedido ${platformOrderId}`);
      return { success: true };
    } catch (error) {
      logger.error(`[UAIRANGO ORDER] Erro ao solicitar cancelamento:`, error.message);
      throw new Error(error.response?.data?.error?.message || 'Falha ao solicitar cancelamento');
    }
  }

  async getOrderDetails(restaurantId, platformOrderId) {
    try {
      const response = await api.get(restaurantId, `/order/v1.0/orders/${platformOrderId}`);
      return response.data;
    } catch (error) {
      logger.error(`[UAIRANGO ORDER] Erro ao buscar detalhes ${platformOrderId}:`, error.message);
      return null;
    }
  }

  async startPreparation(restaurantId, platformOrderId) {
    try {
      await api.post(restaurantId, `/order/v1.0/orders/${platformOrderId}/confirm`);
      logger.info(`[UAIRANGO ORDER] Preparação iniciada ${platformOrderId}`);
      return true;
    } catch (error) {
      logger.error(`[UAIRANGO ORDER] Erro ao iniciar preparação ${platformOrderId}:`, error.message);
      return false;
    }
  }
}

module.exports = new UairangoOrderService();
