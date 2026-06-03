const logger = require('../config/logger');

class OrderPlatformService {
  constructor() {
    this.platforms = new Map();
  }

  async register(platformName, handlers) {
    this.platforms.set(platformName, handlers);
    logger.info(`[Platform] Registrado: ${platformName}`);
  }

  async unregister(platformName) {
    this.platforms.delete(platformName);
  }

  _getPlatform(order) {
    if (order.ifoodOrderId) return { name: 'ifood', orderId: order.ifoodOrderId };
    if (order.uairangoOrderId) return { name: 'uairango', orderId: order.uairangoOrderId };
    if (order.deliveryMuchOrderId) return { name: 'deliveryMuch', orderId: order.deliveryMuchOrderId };
    return null;
  }

  async syncStatus(order, newStatus, oldStatus, metadata = {}) {
    const platform = this._getPlatform(order);
    if (!platform) return;

    const handlers = this.platforms.get(platform.name);
    if (!handlers) {
      logger.debug(`[Platform] Nenhum handler para ${platform.name}`);
      return;
    }

    try {
      switch (newStatus) {
        case 'PREPARING':
          await handlers.onPreparing?.(order.id, order.restaurantId);
          break;
        case 'READY':
          await handlers.onReady?.(order.id, order.restaurantId);
          break;
        case 'SHIPPED':
          await handlers.onShipped?.(order.id, order.restaurantId);
          break;
        case 'CANCELED':
          await handlers.onCanceled?.(order.id, order.restaurantId, metadata.reason);
          break;
      }
    } catch (error) {
      logger.error(`[Platform] Erro sync ${platform.name}:`, error);
    }
  }
}

const orderPlatformService = new OrderPlatformService();

orderPlatformService.register('ifood', {
  onPreparing: async (orderId, restaurantId) => {
    const IfoodOrderService = require('./IfoodOrderService');
    const logger = require('../config/logger');

    logger.info(`[IFOOD SYNC] Iniciando fluxo de preparo para pedido ${orderId}`);

    const confirmResult = await IfoodOrderService.confirmOrder(orderId);
    logger.info(`[IFOOD SYNC] Confirm result para ${orderId}:`, JSON.stringify(confirmResult));

    if (confirmResult?.success || confirmResult?.alreadyConfirmed) {
      const prepResult = await IfoodOrderService.startPreparation(orderId);
      logger.info(`[IFOOD SYNC] StartPreparation result para ${orderId}:`, JSON.stringify(prepResult));
      return prepResult;
    }

    return confirmResult;
  },
  onReady: async (orderId, restaurantId) => {
    const IfoodOrderService = require('./IfoodOrderService');
    const logger = require('../config/logger');

    logger.info(`[IFOOD SYNC] Marcando pedido ${orderId} como pronto para entrega`);

    const result = await IfoodOrderService.markReady(orderId);
    logger.info(`[IFOOD SYNC] MarkReady result para ${orderId}:`, JSON.stringify(result));
    return result;
  },
  onShipped: async (orderId, restaurantId) => {
    const IfoodOrderService = require('./IfoodOrderService');
    const logger = require('../config/logger');

    logger.info(`[IFOOD SYNC] Pedido ${orderId} marcado como saiu para entrega`);

    return await IfoodOrderService.markReady(orderId);
  },
  onCanceled: async (orderId, restaurantId, reason) => {
    const IfoodOrderService = require('./IfoodOrderService');
    const logger = require('../config/logger');

    logger.info(`[IFOOD SYNC] Cancelando pedido ${orderId}. Motivo: ${reason || '501'}`);

    return await IfoodOrderService.rejectOrder(orderId, reason || '501');
  }
});

orderPlatformService.register('uairango', {
  onPreparing: async (orderId, restaurantId) => {
    const UairangoOrderService = require('./UairangoOrderService');
    const prisma = require('../lib/prisma');
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    return await UairangoOrderService.confirmOrder(restaurantId, order.uairangoOrderId);
  },
  onReady: async (orderId, restaurantId) => {
    const UairangoOrderService = require('./UairangoOrderService');
    const prisma = require('../lib/prisma');
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    return await UairangoOrderService.readyToPickup(restaurantId, order.uairangoOrderId);
  },
  onShipped: async (orderId, restaurantId) => {
    const UairangoOrderService = require('./UairangoOrderService');
    const prisma = require('../lib/prisma');
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    return await UairangoOrderService.dispatchOrder(restaurantId, order.uairangoOrderId);
  },
  onCanceled: async (orderId, restaurantId) => {
    const UairangoOrderService = require('./UairangoOrderService');
    const prisma = require('../lib/prisma');
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    return await UairangoOrderService.rejectOrder(restaurantId, order.uairangoOrderId);
  }
});

module.exports = orderPlatformService;
