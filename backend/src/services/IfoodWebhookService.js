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
    this._processedEventIds = [];
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
    // Eventos sem orderId (ex: KEEPALIVE) não são trackeados
    if (!platformOrderId) {
      return false;
    }

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

    // Validar assinatura HMAC se CLIENT_SECRET estiver configurado
    if (!this.validateSignature(rawBody, signature)) {
      logger.warn('[IFOOD WEBHOOK] Assinatura inválida, rejeitando request');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    logger.info(`[IFOOD WEBHOOK] Recebido evento(s): ${req.body?.length || 1}`);

    res.status(202).json({ received: true });

    const events = Array.isArray(req.body) ? req.body : [req.body];
    const platform = 'ifood';

    for (const event of events) {
      const { orderId, code, id: eventId } = event;
      const eventType = code;

      const alreadyProcessed = orderId ? await this._isEventProcessed(platform, orderId, eventType) : false;
      if (alreadyProcessed) {
        logger.info(`[IFOOD WEBHOOK] Evento ${orderId || eventId} (${eventType}) já processado, ignorando`);
        continue;
      }

      this._processingQueue.push(event);
      this._processedEventIds.push(event.id);
      logger.info(`[IFOOD WEBHOOK] Evento ${eventId} (${eventType}) enfileirado para processamento`);
    }

    this._processQueue();

    if (this._processedEventIds.length > 0) {
      // Enviar em batches de no máximo 2000 para evitar memory leak
      const idsToAck = this._processedEventIds.splice(0, 2000);
      this._sendDelayedAcknowledgment(idsToAck);
    }
  }

  async _sendDelayedAcknowledgment(eventIds) {
    setTimeout(async () => {
      const token = await IfoodAuthService.getValidToken();
      if (token) {
        await this.sendAcknowledgment(token, eventIds);
      }
    }, 2000);
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
        logger.error(`[IFOOD WEBHOOK] Stack trace:`, error.stack);
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
        try {
          logger.info(`[IFOOD WEBHOOK] Evento CAN recebido para pedido iFood ${orderId}, buscando pedido local...`);
          const result = await IntegrationOrderService.cancelFromIntegration(platform, restaurantId, orderId);
          if (result) {
            logger.info(`[IFOOD WEBHOOK] Pedido ${result.id} cancelado com sucesso via evento CAN`);
          } else {
            logger.warn(`[IFOOD WEBHOOK] Pedido não encontrado ou já cancelado para evento CAN ${orderId}`);
          }
        } catch (error) {
          logger.error(`[IFOOD WEBHOOK] Erro ao processar cancelamento CAN: ${error.message}`, error.stack);
        }
        await this._markEventProcessed(platform, orderId, code, restaurantId, null);
        break;

      case 'CANCELLATION_REQUEST_FAILED':
        // Cancelamento foi REJEITADO pelo sistema - pedido continua ativo
        await this._clearCancellationRequest(restaurantId, orderId);
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
        await this._markEventProcessed(platform, orderId, code, restaurantId, null);
        break;

      case 'HANDSHAKE_DISPUTE':
        await this._handleDisputeRequest(restaurantId, orderId, event);
        await this._markEventProcessed(platform, orderId, code, restaurantId, null);
        break;

      case 'HANDSHAKE_SETTLEMENT':
        await this._handleDisputeSettlement(restaurantId, orderId, event);
        await this._markEventProcessed(platform, orderId, code, restaurantId, null);
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
   * Salva campos no banco + emite socket.
   */
  async _handleCancellationRequest(restaurantId, ifoodOrderId, event) {
    try {
      const order = await prisma.order.findFirst({
        where: { restaurantId, ifoodOrderId }
      });

      if (!order) return;

      const deadline = new Date(Date.now() + 5 * 60 * 1000);

      await prisma.order.update({
        where: { id: order.id },
        data: {
          cancellationRequested: true,
          cancellationReason: event.metadata?.cancelCodeId || event.metadata?.reason || 'Motivo não informado',
          cancellationDeadline: deadline,
          cancellationSource: 'CUSTOMER'
        }
      });

      const socketLib = require('../lib/socket');
      socketLib.emitToRestaurant(restaurantId, 'ifood_cancellation_requested', {
        orderId: order.id,
        ifoodOrderId,
        reason: event.metadata?.cancelCodeId || event.metadata?.reason || 'Motivo não informado',
        deadline: deadline.toISOString(),
        source: 'IFOOD'
      });

      logger.info(`[IFOOD WEBHOOK] Solicitação de cancelamento recebida para pedido ${order.id}`);
    } catch (error) {
      logger.error(`[IFOOD WEBHOOK] Erro ao processar solicitação de cancelamento:`, error.message);
    }
  }

  /**
   * Lida com disputa pós-entrega (Handshake).
   * Salva campos no banco + emite socket.
   */
  async _handleDisputeRequest(restaurantId, ifoodOrderId, event) {
    try {
      const order = await prisma.order.findFirst({
        where: { restaurantId, ifoodOrderId }
      });

      if (!order) return;

      const disputeId = event.metadata?.dispute?.id || event.metadata?.disputeId || event.id;
      const expiresAt = event.metadata?.dispute?.expiresAt
        ? new Date(event.metadata.dispute.expiresAt)
        : new Date(Date.now() + 5 * 60 * 1000);

      await prisma.order.update({
        where: { id: order.id },
        data: {
          disputeId,
          disputeExpiresAt: expiresAt,
          disputeReason: event.metadata?.dispute?.reason || event.metadata?.reason || 'Disputa pós-entrega',
          disputeEvidence: event.metadata?.dispute?.evidence || event.metadata?.evidence || null
        }
      });

      const socketLib = require('../lib/socket');
      socketLib.emitToRestaurant(restaurantId, 'ifood_dispute_opened', {
        orderId: order.id,
        ifoodOrderId,
        disputeId,
        reason: event.metadata?.dispute?.reason || event.metadata?.reason,
        expiresAt: expiresAt.toISOString(),
        evidence: event.metadata?.dispute?.evidence || event.metadata?.evidence,
        source: 'IFOOD'
      });

      logger.info(`[IFOOD WEBHOOK] Disputa aberta para pedido ${order.id}`);
    } catch (error) {
      logger.error(`[IFOOD WEBHOOK] Erro ao processar disputa:`, error.message);
    }
  }

  /**
   * Lida com resolução de disputa (Handshake Settled).
   * Limpa campos do banco + emite socket.
   */
  async _handleDisputeSettlement(restaurantId, ifoodOrderId, event) {
    try {
      const order = await prisma.order.findFirst({
        where: { restaurantId, ifoodOrderId }
      });

      if (!order) return;

      const settlement = event.metadata?.dispute?.status || event.metadata?.settlement || event.metadata?.result;

      await prisma.order.update({
        where: { id: order.id },
        data: {
          disputeId: null,
          disputeExpiresAt: null,
          disputeReason: null,
          disputeEvidence: null,
          ...(settlement === 'MERCHANT_ACCEPTED' || settlement === 'ACCEPTED' ? {
            status: 'CANCELED',
            canceledAt: new Date()
          } : {})
        }
      });

      const socketLib = require('../lib/socket');
      socketLib.emitToRestaurant(restaurantId, 'ifood_dispute_settled', {
        orderId: order.id,
        ifoodOrderId,
        settlement,
        source: 'IFOOD'
      });

      logger.info(`[IFOOD WEBHOOK] Disputa resolvida para pedido ${order.id}: ${settlement}`);
    } catch (error) {
      logger.error(`[IFOOD WEBHOOK] Erro ao processar resolução de disputa:`, error.message);
    }
  }

  /**
   * Limpa flag de cancelamento quando o iFood rejeita a tentativa.
   * O pedido continua ativo normalmente.
   */
  async _clearCancellationRequest(restaurantId, ifoodOrderId) {
    try {
      const order = await prisma.order.findFirst({
        where: { restaurantId, ifoodOrderId }
      });

      if (!order) return;

      await prisma.order.update({
        where: { id: order.id },
        data: {
          cancellationRequested: false,
          cancellationReason: order.cancellationSource === 'MERCHANT'
            ? 'Cancelamento solicitado pelo restaurante foi rejeitado pelo iFood'
            : 'Cancelamento rejeitado pelo sistema',
          cancellationDeadline: null,
          cancellationSource: null
        }
      });

      const socketLib = require('../lib/socket');
      socketLib.emitToRestaurant(restaurantId, 'ifood_cancellation_failed', {
        orderId: order.id,
        ifoodOrderId,
        message: 'O cancelamento foi rejeitado. O pedido continua ativo.',
        source: 'IFOOD'
      });

      logger.info(`[IFOOD WEBHOOK] Cancelamento rejeitado para pedido ${order.id}`);
    } catch (error) {
      logger.error(`[IFOOD WEBHOOK] Erro ao limpar solicitação de cancelamento:`, error.message);
    }
  }

  async sendAcknowledgment(token, eventIds) {
    try {
      await axios.post(
        `${this.BASE_URL}/events/v1.0/events/acknowledgment`,
        eventIds.map(id => ({ id })),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      logger.info(`[IFOOD WEBHOOK] ${eventIds.length} evento(s) confirmado(s) via API`);
    } catch (error) {
      logger.error(`[IFOOD WEBHOOK] Erro ao enviar acknowledgment:`,
        error.response?.status, error.response?.data || error.message);
    }
  }
}

module.exports = new IfoodWebhookService();