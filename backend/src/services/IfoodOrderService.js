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

  async confirmOrder(orderId) {
    let order = null;
    try {
      const result = await this._getOrderAndToken(orderId);
      if (result.success === false) return result;

      ({ order } = result);
      const { token } = result;

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
      this._notifySyncError(order?.restaurantId, orderId, `Erro ao confirmar: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  async rejectOrder(orderId, reason, force = false) {
    let order = null;
    try {
      const result = await this._getOrderAndToken(orderId);
      if (result.success === false) return result;

      ({ order } = result);

      // IDEMPOTÊNCIA: Se o pedido já está CANCELED localmente E não é um cancelamento forçado,
      // significa que foi cancelado anteriormente. Não precisamos chamar a API novamente.
      if (order.status === 'CANCELED' && !force) {
        logger.info(`[IFOOD] Pedido ${orderId} já está CANCELED localmente. Pulando chamada de API (idempotente).`);
        return { success: true, alreadyCanceled: true };
      }

      // Se o pedido já está em um status avançado, o iFood pode rejeitar.
      // Mas ainda assim tentamos — o iFood decide se aceita ou não.
      const { token } = result;

      // Marcar como solicitação pendente ANTES de chamar a API
      // O webhook/polling vai confirmar (CANCELLED) ou rejeitar (CANCELLATION_REQUEST_FAILED)
      await prisma.order.update({
        where: { id: orderId },
        data: {
          cancellationRequested: true,
          cancellationReason: reason || '501',
          cancellationSource: 'MERCHANT'
        }
      });

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

      logger.info(`[IFOOD] Cancelamento solicitado para pedido ${orderId} (reason: ${reason || '501'}). Aguardando confirmação via webhook/polling.`);

      // Retorna sucesso — o status CANCELED será definido pelo evento CANCELLED
      // que chega via webhook ou polling do iFood
      return { success: true, pendingConfirmation: true };
    } catch (error) {
      // IDEMPOTÊNCIA: Se receber 400 mas o pedido já está CANCELED localmente,
      // retornamos sucesso para evitar ruído no sync.
      if (error.response?.status === 400 && order?.status === 'CANCELED' && !force) {
        logger.info(`[IFOOD] Pedido ${orderId} já cancelado localmente. 400 do iFood ignorado (idempotente).`);
        return { success: true, alreadyCanceled: true };
      }

      // Limpar o flag de cancellationRequested já que a solicitação falhou
      await this._clearCancellationFlag(orderId);

      // Se está forçando e recebe 400, o iFood rejeitou explicitamente
      if (error.response?.status === 400 && force) {
        const ifoodMessage = error.response?.data?.message || error.response?.data?.description;
        const errorMsg = ifoodMessage
          ? `O iFood recusou o cancelamento: ${ifoodMessage}`
          : 'O iFood não permitiu o cancelamento. O pedido pode já estar em preparo ou entregue.';
        logger.error(`[IFOOD] Cancelamento forçado rejeitado pelo iFood: ${errorMsg}`, error.response?.data);
        this._notifySyncError(order?.restaurantId, orderId, errorMsg);
        return { success: false, error: errorMsg };
      }

      if (error.response?.status === 400) {
        if (reason && reason !== '501') {
          const ifoodMessage = error.response?.data?.message || error.response?.data?.description;
          const errorMsg = ifoodMessage
            ? `iFood recusou o cancelamento: ${ifoodMessage}`
            : 'iFood recusou o cancelamento. O pedido continua ativo.';
          logger.error(`[IFOOD] Cancelamento rejeitado pelo iFood: ${errorMsg}`, error.response?.data);
          this._notifySyncError(order?.restaurantId, orderId, errorMsg);
          return { success: false, error: errorMsg };
        }
        const errorMsg = 'Pedido já aceito no iFood — não é mais possível recusar. Cancele pelo motivo correto.';
        logger.error(`[IFOOD] Erro ao rejeitar pedido (400 - já aceito): ${errorMsg}`);
        this._notifySyncError(order?.restaurantId, orderId, errorMsg);
        return { success: false, error: errorMsg, alreadyAccepted: true };
      }
      const errorMsg = error.response?.data?.message || error.response?.data?.description || error.message;
      logger.error(`[IFOOD] Erro ao rejeitar pedido:`, errorMsg);
      this._notifySyncError(order?.restaurantId, orderId, `Erro ao rejeitar: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Limpa o flag de cancellationRequested quando a solicitação falha.
   */
  async _clearCancellationFlag(orderId) {
    try {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          cancellationRequested: false,
          cancellationReason: null,
          cancellationSource: null
        }
      });
    } catch (e) {
      logger.error(`[IFOOD] Erro ao limpar flag de cancelamento: ${e.message}`);
    }
  }

  async startPreparation(orderId) {
    let order = null;
    try {
      const result = await this._getOrderAndToken(orderId);
      if (result.success === false) return result;

      ({ order } = result);
      const { token } = result;

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
      this._notifySyncError(order?.restaurantId, orderId, `Erro ao iniciar preparação: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  async markReady(orderId) {
    let order = null;
    try {
      const result = await this._getOrderAndToken(orderId);
      if (result.success === false) return result;

      ({ order } = result);
      const { token } = result;

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
      this._notifySyncError(order?.restaurantId, orderId, `Erro ao marcar pronto: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  async getCancellationReasons(orderId) {
    try {
      const result = await this._getOrderAndToken(orderId);
      if (result.success === false) return result;

      const { order, token } = result;

      const response = await axios.get(
        `${BASE_URL}/order/v1.0/orders/${order.ifoodOrderId}/cancellationReasons`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return { success: true, reasons: response.data };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      logger.error(`[IFOOD] Erro ao buscar motivos de cancelamento:`, errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Aceitar cancelamento solicitado pelo cliente
   */
  async acceptCancellation(orderId, restaurantId) {
    let order = null;
    try {
      const result = await this._getOrderAndToken(orderId);
      if (result.success === false) return result;

      ({ order } = result);
      const { token } = result;

      await axios.post(
        `${BASE_URL}/order/v1.0/orders/${order.ifoodOrderId}/acceptCancellation`,
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
          status: 'CANCELED',
          canceledAt: new Date(),
          cancellationRequested: false,
          cancellationReason: 'Aceito pelo restaurante'
        }
      });

      socketLib.emitToRestaurant(order.restaurantId, 'order_updated', {
        orderId,
        status: 'CANCELED',
        source: 'IFOOD'
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      logger.error(`[IFOOD] Erro ao aceitar cancelamento:`, errorMsg);
      this._notifySyncError(order?.restaurantId, orderId, `Erro ao aceitar cancelamento: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  async refuseCancellation(orderId) {
    let order = null;
    try {
      const result = await this._getOrderAndToken(orderId);
      if (result.success === false) return result;

      ({ order } = result);
      const { token } = result;

      await axios.post(
        `${BASE_URL}/order/v1.0/orders/${order.ifoodOrderId}/refuseCancellation`,
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
          cancellationRequested: false,
          cancellationReason: 'Recusado pelo restaurante'
        }
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      logger.error(`[IFOOD] Erro ao recusar cancelamento:`, errorMsg);
      this._notifySyncError(order?.restaurantId, orderId, `Erro ao recusar cancelamento: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  async validatePickupCode(orderId, code) {
    try {
      const result = await this._getOrderAndToken(orderId);
      if (result.success === false) return result;

      const { order, token } = result;

      const response = await axios.post(
        `${BASE_URL}/order/v1.0/orders/${order.ifoodOrderId}/validatePickupCode`,
        { code },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.data.valid === true || response.data.validated === true) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date()
          }
        });

        socketLib.emitToRestaurant(order.restaurantId, 'order_updated', {
          orderId,
          status: 'COMPLETED',
          source: 'IFOOD'
        });

        return { success: true, valid: true };
      }

      return { success: true, valid: false, error: 'Código inválido' };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      logger.error(`[IFOOD] Erro ao validar código de retirada:`, errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  async acceptDispute(disputeId, reason = 'CUSTOMER_SATISFACTION') {
    try {
      const token = await IfoodAuthService.getValidToken();
      if (!token) {
        return { success: false, error: 'Token iFood expirado ou indisponível.' };
      }

      await axios.post(
        `${BASE_URL}/order/v1.0/disputes/${disputeId}/accept`,
        { reason },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      logger.error(`[IFOOD] Erro ao aceitar disputa:`, errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  async rejectDispute(disputeId, reason) {
    try {
      const token = await IfoodAuthService.getValidToken();
      if (!token) {
        return { success: false, error: 'Token iFood expirado ou indisponível.' };
      }

      await axios.post(
        `${BASE_URL}/order/v1.0/disputes/${disputeId}/reject`,
        { reason },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      logger.error(`[IFOOD] Erro ao recusar disputa:`, errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  async offerAlternativeDispute(disputeId, alternativeType, value = null) {
    try {
      const token = await IfoodAuthService.getValidToken();
      if (!token) {
        return { success: false, error: 'Token iFood expirado ou indisponível.' };
      }

      const body = {
        alternativeType,
        ...(value && { value })
      };

      await axios.post(
        `${BASE_URL}/order/v1.0/disputes/${disputeId}/alternative`,
        body,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      logger.error(`[IFOOD] Erro ao oferecer alternativa na disputa:`, errorMsg);
      return { success: false, error: errorMsg };
    }
  }
}

module.exports = new IfoodOrderService();
