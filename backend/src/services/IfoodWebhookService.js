const crypto = require('crypto');
const axios = require('axios');
const logger = require('../config/logger');
const IfoodOrderAdapter = require('./IfoodOrderAdapter');
const IfoodAuthService = require('./IfoodAuthService');
const IntegrationOrderService = require('./IntegrationOrderService');
const IntegrationTypeService = require('./IntegrationTypeService');
const prisma = require('../lib/prisma');

class IfoodWebhookService {

  constructor() {
    this.BASE_URL = 'https://merchant-api.ifood.com.br';
    this._processingQueue = [];
    this._isProcessing = false;
    this.adapter = IfoodOrderAdapter;
  }

  /**
   * Valida a assinatura HMAC SHA256 do request do webhook.
   */
  validateSignature(payload, signature) {
    const clientSecret = process.env.IFOOD_CLIENT_SECRET;

    if (!clientSecret) {
      logger.warn('[IFOOD WEBHOOK] CLIENT_SECRET não configurado, assinatura não verificada');
      return true;
    }

    if (!signature) {
      logger.warn('[IFOOD WEBHOOK] Assinatura não fornecida');
      return false;
    }

    try {
      const hmac = crypto.createHmac('sha256', clientSecret);
      const payloadHash = hmac.update(payload).digest('hex');

      const signatureMatch = crypto.timingSafeEqual(
        Buffer.from(payloadHash),
        Buffer.from(signature)
      );

      return signatureMatch;
    } catch (error) {
      logger.error('[IFOOD WEBHOOK] Erro ao validar assinatura:', error.message);
      return false;
    }
  }

  /**
   * Verifica se evento já foi processado (busca no banco).
   */
  async _isEventProcessed(platform, platformOrderId, eventType) {
    const event = await prisma.integrationEvent.findUnique({
      where: {
        platform_platformOrderId_eventType: {
          platform,
          platformOrderId,
          eventType,
        },
      },
    });

    return event?.status === 'PROCESSED';
  }

  /**
   * Registra evento como processado no banco.
   */
  async _markEventProcessed(platform, platformOrderId, eventType, restaurantId, orderId) {
    await IntegrationOrderService.registerEvent(
      platform,
      platformOrderId,
      eventType,
      restaurantId,
      orderId,
      'PROCESSED'
    );
  }

  /**
   * Processa webhook do iFood.
   * Recebe eventos POST e processa de forma assíncrona (resposta rápida).
   */
  async handleWebhook(req, res) {
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['x-ifood-signature'];

    logger.info(`[IFOOD WEBHOOK] Recebido evento(s): ${req.body?.length || 1}`);

    res.status(202).json({ received: true });

    const events = Array.isArray(req.body) ? req.body : [req.body];
    const platform = 'ifood';

    for (const event of events) {
      const { orderId, code, id: eventId } = event;
      const eventType = code;

      const alreadyProcessed = await this._isEventProcessed(platform, orderId, eventType);
      if (alreadyProcessed) {
        logger.info(`[IFOOD WEBHOOK] Evento ${orderId} (${eventType}) já processado, ignorando`);
        continue;
      }

      this._processingQueue.push(event);
      logger.info(`[IFOOD WEBHOOK] Evento ${eventId} (${eventType}) enfileirado para processamento`);
    }

    this._processQueue();
  }

  /**
   * Processa a fila de eventos em background.
   */
  async _processQueue() {
    if (this._isProcessing) {
      return;
    }

    this._isProcessing = true;

    while (this._processingQueue.length > 0) {
      const event = this._processingQueue.shift();

      try {
        await this._processEvent(event);
      } catch (error) {
        logger.error(`[IFOOD WEBHOOK] Erro ao processar evento ${event?.id}:`, error.message);
      }
    }

    this._isProcessing = false;
  }

  /**
   * Processa um evento individual do webhook.
   */
  async _processEvent(event) {
    const { code, orderId, id: eventId, merchantId } = event;

    logger.info(`[IFOOD WEBHOOK] Processando evento ${code} (${eventId}) para pedido ${orderId}`);

    const settings = await prisma.integrationSettings.findMany({
      where: { ifoodIntegrationActive: true }
    });

    if (!merchantId) {
      logger.warn(`[IFOOD WEBHOOK] Merchant ID não fornecido no evento, verificando por todas as lojas ativas...`);
      
      for (const setting of settings) {
        await this._handleEventForRestaurant(setting.restaurantId, event);
      }
      return;
    }

    const setting = settings.find(s => s.ifoodMerchantId === merchantId);

    if (!setting) {
      logger.warn(`[IFOOD WEBHOOK] Loja ${merchantId} não encontrada ou inativa`);
      return;
    }

    await this._handleEventForRestaurant(setting.restaurantId, event);
  }

  /**
   * Processa evento para uma restaurante específico.
   */
  async _handleEventForRestaurant(restaurantId, event) {
    const { code, orderId, id: eventId, merchantId } = event;
    const platform = 'ifood';

    const alreadyProcessed = await this._isEventProcessed(platform, orderId, code);
    if (alreadyProcessed) {
      logger.info(`[IFOOD WEBHOOK] Evento ${orderId} (${code}) já processado, ignorando`);
      return;
    }

    logger.info(`[IFOOD WEBHOOK] Processando evento ${code} (${eventId}) para pedido ${orderId}`);

    switch (code) {
      case 'PLACED':
      case 'PLC':
      case 'CONFIRMED': {
        try {
          const token = await IfoodAuthService.getValidToken();
          if (!token) {
            logger.error(`[IFOOD WEBHOOK] Sem token para buscar pedido ${orderId}`);
            break;
          }
          const orderDetails = await this._getOrderDetails(orderId, token);
          if (!orderDetails) {
            logger.error(`[IFOOD WEBHOOK] Não foi possível obter detalhes do pedido ${orderId}`);
            break;
          }
          const order = await this.adapter.processNewOrder(restaurantId, orderDetails);
          await this._markEventProcessed(platform, orderId, code, restaurantId, order?.id);
          logger.info(`[IFOOD WEBHOOK] Pedido ${orderId} criado/atualizado com sucesso via webhook`);
        } catch (error) {
          logger.error(`[IFOOD WEBHOOK] Erro ao criar pedido via webhook: ${error.message}`);
          await IntegrationOrderService.registerEvent(platform, orderId, code, restaurantId, null, 'FAILED', error.message);
        }
        break;
      }

      case 'CANCELLED':
      case 'CAN':
      case 'CANCELLATION_REQUEST_FAILED':
        await IntegrationOrderService.cancelFromIntegration(platform, restaurantId, orderId);
        await this._markEventProcessed(platform, orderId, code, restaurantId, null);
        break;

      case 'ORDER_PATCHED': {
        const token = await IfoodAuthService.getValidToken();
        if (token) {
          const updatedDetails = await this._getOrderDetails(orderId, token);
          if (updatedDetails) {
            await IntegrationOrderService.updateFromIntegration(platform, restaurantId, orderId, updatedDetails);
          }
        }
        break;
      }

      case 'READY_TO_PICKUP':
        await this._updateLocalOrderStatus(restaurantId, orderId, 'READY');
        await this._markEventProcessed(platform, orderId, code, restaurantId, null);
        break;

      case 'DISPATCHED':
        await this._updateLocalOrderStatus(restaurantId, orderId, 'SHIPPED');
        await this._markEventProcessed(platform, orderId, code, restaurantId, null);
        break;

      case 'CONCLUDED':
        await this._updateLocalOrderStatus(restaurantId, orderId, 'COMPLETED');
        await this._markEventProcessed(platform, orderId, code, restaurantId, null);
        break;

      case 'CANCELLATION_REQUESTED':
        await this._handleCancellationRequest(restaurantId, orderId, event);
        break;

      default:
        logger.info(`[IFOOD WEBHOOK] Evento ${code} não requer processamento`);
    }
  }

  /**
   * Busca detalhes completos de um pedido na API do iFood.
   */
  async _getOrderDetails(orderId, token) {
    try {
      const response = await axios.get(
        `${this.BASE_URL}/order/v1.0/orders/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`[IFOOD WEBHOOK] Erro ao buscar detalhes do pedido ${orderId}:`, 
        error.response?.status, error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Atualiza o status local de um pedido.
   */
  async _updateLocalOrderStatus(restaurantId, ifoodOrderId, newStatus) {
    try {
      const order = await prisma.order.findFirst({
        where: { restaurantId, ifoodOrderId }
      });

      if (!order) {
        logger.warn(`[IFOOD WEBHOOK] Pedido ${ifoodOrderId} não encontrado localmente`);
        return;
      }

      const statusUpdateData = { status: newStatus };

      if (newStatus === 'READY') statusUpdateData.readyAt = new Date();
      if (newStatus === 'COMPLETED') statusUpdateData.completedAt = new Date();

      await prisma.order.update({
        where: { id: order.id },
        data: statusUpdateData
      });

      const socketLib = require('../lib/socket');
      socketLib.emitToRestaurant(restaurantId, 'order_updated', {
        orderId: order.id,
        status: newStatus,
        source: 'IFOOD'
      });

      logger.info(`[IFOOD WEBHOOK] Pedido ${order.id} atualizado para ${newStatus} via webhook`);
    } catch (error) {
      logger.error(`[IFOOD WEBHOOK] Erro ao atualizar status do pedido ${ifoodOrderId}:`, error.message);
    }
  }

  /**
   * Lida com solicitação de cancelamento.
   */
  async _handleCancellationRequest(restaurantId, ifoodOrderId, event) {
    try {
      const order = await prisma.order.findFirst({
        where: { restaurantId, ifoodOrderId }
      });

      if (!order) return;

      const socketLib = require('../lib/socket');
      socketLib.emitToRestaurant(restaurantId, 'ifood_cancellation_requested', {
        orderId: order.id,
        ifoodOrderId,
        reason: event.metadata?.cancelCodeId || 'Motivo não informado',
        source: 'IFOOD'
      });

      logger.info(`[IFOOD WEBHOOK] Solicitação de cancelamento recebida para pedido ${order.id}`);
    } catch (error) {
      logger.error(`[IFOOD WEBHOOK] Erro ao processar solicitação de cancelamento:`, error.message);
    }
  }
}

module.exports = new IfoodWebhookService();