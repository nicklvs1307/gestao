const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const socketLib = require('../lib/socket');
const IntegrationTypeService = require('./IntegrationTypeService');
const IntegrationOrderService = require('./IntegrationOrderService');

class IntegrationBaseService {
  constructor(platformName) {
    this.platform = platformName;
  }

  async getSettings(restaurantId) {
    throw new Error('Método getSettings deve ser implementado pela subclasse');
  }

  async getAccessToken(restaurantId) {
    throw new Error('Método getAccessToken deve ser implementado pela subclasse');
  }

  getPlatformName() {
    return this.platform;
  }

  parseOrder(rawData, restaurantId) {
    throw new Error('Método parseOrder deve ser implementado pela subclasse');
  }

  mapPaymentMethod(rawMethod) {
    return IntegrationTypeService.mapPaymentMethod(this.platform, rawMethod);
  }

  mapOrderType(rawType) {
    return IntegrationTypeService.mapOrderType(this.platform, rawType);
  }

  async processNewOrder(restaurantId, rawData) {
    try {
      const normalized = this.parseOrder(rawData, restaurantId);
      
      const platformOrderId = this.getPlatformOrderId(rawData);
      
      const order = await IntegrationOrderService.createFromIntegration(
        this.platform,
        restaurantId,
        platformOrderId,
        normalized
      );

      if (order && !order.isReplayed) {
        await this.confirmOrderOnPlatform(restaurantId, platformOrderId);
        
        socketLib.emitToRestaurant(restaurantId, 'order_update', {
          eventType: 'ORDER_CREATED',
          platform: this.platform,
          orderId: order.id,
          platformOrderId,
        });
      }

      return order;
    } catch (error) {
      logger.error(`[${this.platform.toUpperCase()}] Erro ao processar pedido:`, error.message);
      throw error;
    }
  }

  async processStatusUpdate(restaurantId, platformOrderId, newStatus) {
    const normalizedStatus = IntegrationTypeService.mapStatus(this.platform, newStatus);
    
    return await IntegrationOrderService.updateFromIntegration(
      this.platform,
      restaurantId,
      platformOrderId,
      { status: normalizedStatus }
    );
  }

  async processCancellation(restaurantId, platformOrderId, reason = null) {
    return await IntegrationOrderService.cancelFromIntegration(
      this.platform,
      restaurantId,
      platformOrderId
    );
  }

  async confirmOrderOnPlatform(restaurantId, platformOrderId) {
    logger.info(`[${this.platform.toUpperCase()}] Confirmando pedido ${platformOrderId} na plataforma`);
  }

  getPlatformOrderId(rawData) {
    throw new Error('Método getPlatformOrderId deve ser implementado pela subclasse');
  }

  getRestaurantIdFromEvent(event) {
    return event.restaurantId;
  }

  async notifySyncError(restaurantId, orderId, message) {
    logger.error(`[${this.platform.toUpperCase()} SYNC ERROR] Order ${orderId}: ${message}`);
    socketLib.emitToRestaurant(restaurantId, 'sync_error', {
      orderId,
      platform: this.platform,
      message: message || 'Falha desconhecida na integração',
    });
  }

  isActive(restaurantId) {
    const settings = prisma.integrationSettings.findUnique({
      where: { restaurantId },
    });
    
    if (!settings) return false;
    
    switch (this.platform) {
      case 'ifood':
        return settings.ifoodIntegrationActive;
      case 'uairango':
        return settings.uairangoActive;
      default:
        return true;
    }
  }
}

module.exports = IntegrationBaseService;