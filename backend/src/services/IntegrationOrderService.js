const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const socketLib = require('../lib/socket');
const OrderNumberService = require('./OrderNumberService');
const IntegrationTypeService = require('./IntegrationTypeService');
const { emitOrderUpdate } = require('./OrderService');

class IntegrationOrderService {
  /**
   * Processa um novo pedido de qualquer plataforma de delivery.
   * Garante idempotência, numeração única e emissão consistente de eventos.
   */
  static async createFromIntegration(platform, restaurantId, platformOrderId, normalizedData) {
    logger.info(`[INTEGRATION] Processando pedido ${platformOrderId} da plataforma ${platform} para restaurante ${restaurantId}`);

    const eventType = 'ORDER_PLACED';

    return await prisma.$transaction(async (tx) => {
      const existingEvent = await tx.integrationEvent.findUnique({
        where: {
          platform_platformOrderId_eventType: {
            platform,
            platformOrderId,
            eventType,
          },
        },
      });

      if (existingEvent?.status === 'PROCESSED' && existingEvent?.orderId) {
        logger.info(`[INTEGRATION] Evento ${platformOrderId} (${platform}) já processado anteriormente`);
        const existingOrder = await tx.order.findUnique({
          where: { id: existingEvent.orderId },
          include: { items: true, deliveryOrder: true },
        });
        return { ...existingOrder, isReplayed: true };
      }

      const existingOrder = await tx.order.findFirst({
        where: {
          restaurantId,
          OR: [
            { ifoodOrderId: platformOrderId },
            { uairangoOrderId: platformOrderId },
          ],
        },
      });

      if (existingOrder) {
        logger.info(`[INTEGRATION] Pedido ${platformOrderId} já existe no sistema (ID: ${existingOrder.id})`);
        
        if (existingEvent) {
          await tx.integrationEvent.update({
            where: { id: existingEvent.id },
            data: { status: 'PROCESSED', orderId: existingOrder.id, processedAt: new Date() },
          });
        }
        
        return { ...existingOrder, isReplayed: true };
      }

      const orderNumber = await OrderNumberService.getNextDailyOrderNumber(restaurantId, tx);

      const paymentMethod = IntegrationTypeService.mapPaymentMethod(platform, normalizedData.paymentMethod);
      const orderType = normalizedData.orderType === 'PICKUP' ? 'PICKUP' : 'DELIVERY';

      const { items, customer, deliveryData } = normalizedData;

      const order = await tx.order.create({
        data: {
          dailyOrderNumber: orderNumber,
          status: 'PENDING',
          total: normalizedData.total || 0,
          discount: normalizedData.discount || 0,
          extraCharge: normalizedData.extraCharge || 0,
          orderType,
          isPrinted: false,
          pendingAt: new Date(),
          restaurantId,
          ifoodOrderId: platform === 'ifood' ? platformOrderId : null,
          uairangoOrderId: platform === 'uairango' ? platformOrderId : null,
          items: {
            create: items,
          },
        },
        include: {
          items: { include: { product: true } },
          restaurant: true,
        },
      });

      if (orderType === 'DELIVERY' && deliveryData) {
        await tx.deliveryOrder.create({
          data: {
            name: customer?.name || 'Cliente',
            phone: customer?.phone || null,
            address: deliveryData.address || null,
            complement: deliveryData.complement || null,
            reference: deliveryData.reference || null,
            neighborhood: deliveryData.neighborhood || null,
            city: deliveryData.city || null,
            state: deliveryData.state || null,
            zipCode: deliveryData.zipCode || null,
            deliveryType: 'delivery',
            paymentMethod,
            changeFor: deliveryData.changeFor || null,
            deliveryFee: deliveryData.deliveryFee || 0,
            notes: deliveryData.notes || null,
            latitude: deliveryData.latitude || null,
            longitude: deliveryData.longitude || null,
            status: 'PENDING',
            orderId: order.id,
          },
        });
      }

      if (normalizedData.customerNote) {
        await tx.orderNote.create({
          data: {
            orderId: order.id,
            content: normalizedData.customerNote,
            createdBy: platform,
          },
        });
      }

      await tx.integrationEvent.upsert({
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
          orderId: order.id,
          status: 'PROCESSED',
          processedAt: new Date(),
        },
        update: {
          orderId: order.id,
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });

      logger.info(`[INTEGRATION] Pedido ${order.id} criado a partir de ${platform} ${platformOrderId} (${orderType})`);

      return order;
    });
  }

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

    await emitOrderUpdate(order.id, 'ORDER_UPDATED');

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

    await emitOrderUpdate(order.id, 'ORDER_CANCELED');

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