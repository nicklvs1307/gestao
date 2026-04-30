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

  async syncStatus(order, newStatus, oldStatus) {
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
        case 'CANCELED':
          await handlers.onCanceled?.(order.id, order.restaurantId);
          break;
      }
    } catch (error) {
      logger.error(`[Platform] Erro sync ${platform.name}:`, error);
    }
  }
}

const orderPlatformService = new OrderPlatformService();
const IfoodOrderService = require('./IfoodOrderService');

orderPlatformService.register('ifood', {
  onPreparing: async (orderId, restaurantId) => {
    return await IfoodOrderService.confirmOrder(orderId, restaurantId);
  },
  onReady: async (orderId, restaurantId) => {
    return await IfoodOrderService.markReady(orderId, restaurantId);
  },
  onCanceled: async (orderId, restaurantId) => {
    return await IfoodOrderService.rejectOrder(orderId, restaurantId, '501');
  }
});

const UairangoOrderAdapter = require('./UairangoOrderAdapter');

orderPlatformService.register('uairango', {
  onPreparing: async (orderId, restaurantId) => {
    return await UairangoOrderAdapter.confirmOrderOnPlatform(restaurantId, orderId);
  },
  onReady: async (orderId, restaurantId) => {
    return await UairangoOrderAdapter.markReadyOnPlatform(restaurantId, orderId);
  },
  onCanceled: async (orderId, restaurantId) => {
    return await UairangoOrderAdapter.rejectOrderOnPlatform(restaurantId, orderId);
  }
});

module.exports = orderPlatformService;