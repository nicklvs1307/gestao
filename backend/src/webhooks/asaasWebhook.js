const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const socketLib = require('../lib/socket');
const OrderService = require('../services/OrderService');

router.post('/', async (req, res) => {
  try {
    // Responder imediatamente (200) para o Asaas não repetir
    res.status(200).send('OK');

    const { event, payment } = req.body;

    logger.info(`[Asaas Webhook] Evento recebido: ${event}`, {
      paymentId: payment?.id,
      status: payment?.status,
      value: payment?.value
    });

    // Processar apenas eventos de pagamento
    if (!event?.startsWith('PAYMENT_')) {
      logger.info(`[Asaas Webhook] Ignorando evento não relacionado a pagamento: ${event}`);
      return;
    }

    if (!payment?.id) {
      logger.warn(`[Asaas Webhook] Evento sem payment.id: ${event}`);
      return;
    }

    // Buscar pagamento pelo asaasPaymentId
    const paymentRecord = await prisma.payment.findFirst({
      where: { asaasPaymentId: payment.id },
      include: { order: true }
    });

    if (!paymentRecord) {
      logger.warn(`[Asaas Webhook] Pagamento não encontrado no banco: ${payment.id}`);
      return;
    }

    // Idempotência - verificar se já processado
    if (paymentRecord.paidAt &&
        (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED')) {
      logger.info(`[Asaas Webhook] Pagamento já processado, ignorando: ${payment.id}`);
      return;
    }

    // Processar evento
    switch (event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED': {
        // Atualizar pagamento
        await prisma.payment.update({
          where: { id: paymentRecord.id },
          data: {
            asaasStatus: 'RECEIVED',
            paidAt: new Date()
          }
        });

        // Auto-aceitar pedido se estiver PENDING ou BUILDING
        if (paymentRecord.order.status === 'BUILDING' ||
            paymentRecord.order.status === 'PENDING') {
          await OrderService.updateOrderStatus(
            paymentRecord.orderId,
            'PREPARING'
          );

          // Notificar restaurante via Socket
          socketLib.emitToRestaurant(
            paymentRecord.order.restaurantId,
            'order_update',
            {
              eventType: 'PAYMENT_CONFIRMED',
              restaurantId: paymentRecord.order.restaurantId,
              payload: {
                orderId: paymentRecord.orderId,
                status: 'PREPARING',
                paymentConfirmed: true
              }
            }
          );

          logger.info(`[Asaas Webhook] Pedido ${paymentRecord.orderId} movido para PREPARING via webhook`);
        }

        // Notificar cliente via Socket (se conectado à sala do pedido)
        socketLib.emitToRestaurant(
          paymentRecord.order.restaurantId,
          'payment_confirmed',
          {
            orderId: paymentRecord.orderId,
            amount: payment.value || paymentRecord.amount
          }
        );

        logger.info(`[Asaas Webhook] Pagamento confirmado: ${payment.id} (R$ ${payment.value || paymentRecord.amount})`);
        break;
      }

      case 'PAYMENT_OVERDUE': {
        await prisma.payment.update({
          where: { id: paymentRecord.id },
          data: { asaasStatus: 'OVERDUE' }
        });
        logger.warn(`[Asaas Webhook] Pagamento vencido: ${payment.id}`);
        break;
      }

      case 'PAYMENT_DELETED':
      case 'PAYMENT_CHECKOUT_VIEWED': {
        logger.info(`[Asaas Webhook] Evento ${event} recebido para pagamento: ${payment.id}`);
        break;
      }

      default: {
        logger.info(`[Asaas Webhook] Evento não tratado: ${event} para pagamento: ${payment.id}`);
      }
    }

  } catch (error) {
    logger.error('[Asaas Webhook] Erro ao processar webhook:', error);
    // Não retornar erro para o Asaas (já respondemos 200)
  }
});

module.exports = router;
