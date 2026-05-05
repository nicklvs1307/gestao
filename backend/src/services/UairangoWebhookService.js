const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const axios = require('axios');
const UairangoAuthService = require('./UairangoAuthService');
const UairangoOrderAdapter = require('./UairangoOrderAdapter');
const IntegrationOrderService = require('./IntegrationOrderService');
const IntegrationTypeService = require('./IntegrationTypeService');

class UairangoWebhookService {
  /**
   * Processa webhook recebido do Uai Rangô
   * O webhook envia os mesmos eventos da Events API
   * Retorna 200 OK imediatamente (obrigatório)
   */
  async handleWebhook(webhookData) {
    try {
      logger.info(`[UAIRANGO WEBHOOK] Recebido:`, JSON.stringify(webhookData).substring(0, 200));

      // O webhook pode enviar um evento ou array de eventos
      const events = Array.isArray(webhookData) ? webhookData : [webhookData];

      for (const event of events) {
        await this._processEvent(event);
      }

      return { success: true };
    } catch (error) {
      logger.error(`[UAIRANGO WEBHOOK] Erro:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Processa um evento individual
   */
  async _processEvent(event) {
    try {
      const { id: eventId, code, orderId: platformOrderId, merchantId } = event;

      if (!platformOrderId || !code) {
        logger.warn(`[UAIRANGO WEBHOOK] Evento inválido:`, event);
        return;
      }

      // Busca restaurantId pelo merchantId (uairangoEstablishmentId)
      const settings = await prisma.integrationSettings.findFirst({
        where: { uairangoEstablishmentId: merchantId }
      });

      if (!settings) {
        logger.warn(`[UAIRANGO WEBHOOK] MerchantId não encontrado: ${merchantId}`);
        return;
      }

      const restaurantId = settings.restaurantId;

      // Se for evento de pedido novo (PLC)
      if (code === 'PLC' || code === 'PLACED') {
        const fullOrderData = await this._fetchOrderDetails(restaurantId, platformOrderId);
        if (fullOrderData) {
          // Usa o adapter centralizado → OrderService.createOrderFromIntegration()
          await UairangoOrderAdapter.processNewOrder(restaurantId, fullOrderData);
        }
      } else if (code === 'CAN' || code === 'CANCELLED') {
        await IntegrationOrderService.cancelFromIntegration('uairango', restaurantId, platformOrderId);
      } else {
        // Outros eventos: mapear e atualizar status
        const newStatus = IntegrationTypeService.mapStatus('uairango', code);
        await IntegrationOrderService.updateFromIntegration(
          'uairango',
          restaurantId,
          platformOrderId,
          { status: newStatus }
        );
      }

      logger.info(`[UAIRANGO WEBHOOK] Evento ${eventId} (${code}) processado com sucesso`);
    } catch (error) {
      logger.error(`[UAIRANGO WEBHOOK] Erro ao processar evento:`, error.message);
    }
  }

  /**
   * Busca detalhes do pedido via API
   */
  async _fetchOrderDetails(restaurantId, orderId) {
    const token = await UairangoAuthService.getAccessToken(restaurantId);
    if (!token) return null;

    try {
      const response = await axios.get(
        `${this.BASE_URL}/order/v1.0/orders/${orderId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        }
      );
      return response.data;
    } catch (error) {
      logger.error(`[UAIRANGO WEBHOOK] Erro ao buscar detalhes ${orderId}:`, error.message);
      return null;
    }
  }
}

const uairangoWebhookService = new UairangoWebhookService();
module.exports = uairangoWebhookService;
module.exports.UairangoWebhookService = UairangoWebhookService;
