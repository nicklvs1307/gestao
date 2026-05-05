const logger = require('../config/logger');
const prisma = require('../lib/prisma');
// NOTE: OrderService is lazy-required inside methods to avoid circular dependency
// (OrderService imports IntegrationOrderService at top level)

/**
 * IntegrationOrderService — auxiliary operations for integration orders.
 * 
 * Order CREATION is now handled by OrderService.createOrderFromIntegration()
 * (called via IntegrationBaseService.processNewOrder()).
 * 
 * This service handles: update, cancel, event tracking, and cleanup.
 */
class IntegrationOrderService {

  /**
   * Atualiza um pedido existente a partir de dados da plataforma.
   */
  static async updateFromIntegration(platform, restaurantId, platformOrderId, updateData) {
    logger.info(`[INTEGRATION] Atualizando pedido ${platformOrderId} da plataforma ${platform}`);

    const order = await prisma.order.findFirst({
      where: {
        restaurantId,
        OR: [
          { ifoodOrderId: platformOrderId },
          { uairangoOrderId: platformOrderId },
        ],
      },
    });

    if (!order) {
      logger.warn(`[INTEGRATION] Pedido ${platformOrderId} não encontrado para atualização`);
      return null;
    }

    const updatePayload = {};

    if (updateData.total !== undefined) {
      updatePayload.total = updateData.total;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: updatePayload,
      include: { items: true, deliveryOrder: true },
    });

    await require('./OrderService').emitOrderUpdate(order.id, 'ORDER_UPDATED');

    return updatedOrder;
  }

  /**
   * Cancela um pedido existente a partir de dados da plataforma.
   */
  static async cancelFromIntegration(platform, restaurantId, platformOrderId) {
    logger.info(`[INTEGRATION] Cancelando pedido ${platformOrderId} da plataforma ${platform}`);

    const order = await prisma.order.findFirst({
      where: {
        restaurantId,
        OR: [
          { ifoodOrderId: platformOrderId },
          { uairangoOrderId: platformOrderId },
        ],
      },
    });

    if (!order) {
      logger.warn(`[INTEGRATION] Pedido ${platformOrderId} não encontrado para cancelamento`);
      return null;
    }

    if (order.status === 'CANCELED' || order.status === 'COMPLETED') {
      logger.info(`[INTEGRATION] Pedido ${order.id} já ${order.status.toLowerCase()}`);
      return order;
    }

    const canceledOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });

    await require('./OrderService').emitOrderUpdate(order.id, 'ORDER_CANCELED');

    return canceledOrder;
  }

  /**
   * Registra evento de integração no banco.
   */
  static async registerEvent(platform, platformOrderId, eventType, restaurantId, orderId = null, status = 'PENDING', errorMessage = null) {
    return await prisma.integrationEvent.upsert({
      where: {
        platform_platformOrderId_eventType: {
          platform,
          platformOrderId,
          eventType,
        },
      },
      create: {
        id: `${platform}_${platformOrderId}_${eventType}_${Date.now()}`,
        platform,
        platformOrderId,
        eventType,
        restaurantId,
        orderId,
        status,
        errorMessage,
        processedAt: status === 'PROCESSED' ? new Date() : null,
      },
      update: {
        orderId,
        status,
        errorMessage,
        processedAt: status === 'PROCESSED' ? new Date() : null,
      },
    });
  }

  /**
   * Limpa eventos processados com mais de 48 horas.
   */
  static async cleanOldEvents() {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const result = await prisma.integrationEvent.deleteMany({
      where: {
        status: 'PROCESSED',
        processedAt: { lt: cutoff },
      },
    });

    logger.info(`[INTEGRATION] Limpos ${result.count} eventos antigos`);
    return result;
  }
}

module.exports = IntegrationOrderService;
