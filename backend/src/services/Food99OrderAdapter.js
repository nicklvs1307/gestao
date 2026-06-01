const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const Food99AuthService = require('./Food99AuthService');
const IntegrationBaseService = require('./IntegrationBaseService');
const { requestWithRetry } = require('../lib/food99Client');
const food99Config = require('../config/food99');

class Food99OrderAdapter extends IntegrationBaseService {
  constructor() {
    super('food99');
  }

  async getSettings(restaurantId) {
    return await prisma.integrationSettings.findUnique({
      where: { restaurantId },
    });
  }

  async getAccessToken(restaurantId) {
    const settings = await this.getSettings(restaurantId);
    if (!settings?.food99AppShopId) return null;
    return await Food99AuthService.getValidToken(settings.food99AppShopId);
  }

  getPlatformOrderId(rawData) {
    return rawData.order_id || rawData.orderId;
  }

  /**
   * Traduz OrderModel da API 99Food para o formato normalizado interno.
   * Preços em centavos (menor denominação) — converter para float dividindo por 100.
   */
  parseOrder(rawData, restaurantId) {
    const price = rawData.price || {};
    const orderItems = rawData.order_items || [];
    const customer = rawData.receive_address || {};
    const shop = rawData.shop || {};

    const items = orderItems.map(item => {
      const subItems = (item.sub_item_list || []).map(sub => ({
        name: sub.name || `Adicional ${sub.app_item_id}`,
        price: (sub.total_price || sub.sku_price || 0) / 100,
        quantity: sub.amount || 1,
        integrationCode: sub.integrationCode || sub.codigo || sub.app_item_id || null,
      }));

      return {
        name: item.name || `Item ${item.app_item_id}`,
        externalId: item.app_item_id,
        integrationCode: item.integrationCode || item.codigo || null,
        price: (item.total_price || item.sku_price || 0) / 100,
        quantity: item.amount || 1,
        observations: item.remark || null,
        addons: subItems,
        sizeJson: null,
        flavorsJson: null,
      };
    });

    const paymentMeta = food99Config.mapPayType(rawData.pay_type);
    const orderType = food99Config.mapDeliveryType(rawData.delivery_type);

    const subtotal = (price.order_price || 0) / 100;
    const deliveryFee = (price.delivery_price || 0) / 100;
    const totalDiscount = ((price.items_discount || 0) + (price.delivery_discount || 0)) / 100;
    const total = (price.real_price || price.real_pay_price || price.order_price || 0) / 100;

    const deliveryData =
      orderType === 'DELIVERY'
        ? {
            address: customer.poi_address || '',
            complement: customer.house_number || '',
            reference: '',
            neighborhood: '',
            city: customer.city || '',
            state: '',
            zipCode: '',
            deliveryType: 'delivery',
            deliveryFee,
            latitude: customer.poi_lat || null,
            longitude: customer.poi_lng || null,
          }
        : null;

    return {
      orderType,
      items,
      customer: {
        name: customer.name || customer.first_name || 'Cliente 99Food',
        phone: customer.phone
          ? `${customer.calling_code || '55'}${customer.phone}`
          : '',
      },
      deliveryData,
      payment: {
        rawMethod: paymentMeta.rawMethod,
        isPrepaid: paymentMeta.isPrepaid,
        prepaidAmount: paymentMeta.isPrepaid ? total : 0,
        pendingAmount: !paymentMeta.isPrepaid ? total : 0,
        changeFor: null,
      },
      totals: {
        subtotal,
        deliveryFee,
        discount: totalDiscount,
        total,
      },
      customerNote: rawData.remark || null,
      displayId: rawData.pickup_code || rawData.display_id || null,
      pickupCode: rawData.pickup_code || rawData.pickupCode || null,
      scheduledDateTime: rawData.delivery_time || rawData.scheduled_time || null,
      customerDocument: rawData.customer_document || rawData.receiver_document || null,
      benefits: rawData.benefits || rawData.coupons || null,
    };
  }

  async getOrderDetails(restaurantId, platformOrderId) {
    const settings = await this.getSettings(restaurantId);
    if (!settings?.food99AppShopId) return null;

    const token = await Food99AuthService.getValidToken(settings.food99AppShopId);
    if (!token) return null;

    const result = await requestWithRetry({
      method: 'get',
      url: '/v1/order/order/detail',
      env: settings.food99Env,
      params: { auth_token: token, order_id: platformOrderId },
      logContext: `Erro ao buscar detalhes do pedido ${platformOrderId}`,
    });

    if (!result.ok) return null;
    return result.data;
  }

  async confirmOrderOnPlatform(restaurantId, platformOrderId) {
    const settings = await this.getSettings(restaurantId);
    if (!settings?.food99AppShopId) return;

    const token = await Food99AuthService.getValidToken(settings.food99AppShopId);
    if (!token) return;

    const result = await requestWithRetry({
      method: 'post',
      url: '/v1/order/order/confirm',
      env: settings.food99Env,
      data: { auth_token: token, order_id: platformOrderId },
      logContext: `Erro ao confirmar pedido ${platformOrderId}`,
    });

    if (result.ok) {
      logger.info(`[FOOD99] Pedido ${platformOrderId} confirmado`);
    } else {
      logger.error(`[FOOD99] Erro ao confirmar ${platformOrderId}: ${result.error}`);
    }
  }

  async rejectOrderOnPlatform(restaurantId, platformOrderId, reasonId = 1010) {
    const settings = await this.getSettings(restaurantId);
    if (!settings?.food99AppShopId) return;

    const token = await Food99AuthService.getValidToken(settings.food99AppShopId);
    if (!token) return;

    const result = await requestWithRetry({
      method: 'post',
      url: '/v1/order/order/cancel',
      env: settings.food99Env,
      data: {
        auth_token: token,
        order_id: platformOrderId,
        reason_id: reasonId,
        reason: 'Pedido recusado pelo restaurante',
      },
      logContext: `Erro ao cancelar pedido ${platformOrderId}`,
    });

    if (result.ok) {
      logger.info(`[FOOD99] Pedido ${platformOrderId} cancelado`);
    } else {
      logger.error(`[FOOD99] Erro ao cancelar ${platformOrderId}: ${result.error}`);
    }
  }

  async markReadyOnPlatform(restaurantId, platformOrderId) {
    const settings = await this.getSettings(restaurantId);
    if (!settings?.food99AppShopId) return;

    const token = await Food99AuthService.getValidToken(settings.food99AppShopId);
    if (!token) return;

    const result = await requestWithRetry({
      method: 'get',
      url: '/v1/order/order/ready',
      env: settings.food99Env,
      params: { auth_token: token, order_id: platformOrderId },
      logContext: `Erro ao marcar pronto ${platformOrderId}`,
    });

    if (result.ok) {
      logger.info(`[FOOD99] Pedido ${platformOrderId} marcado como pronto`);
    } else {
      logger.error(`[FOOD99] Erro ao marcar pronto ${platformOrderId}: ${result.error}`);
    }
  }

  async notifySyncError(restaurantId, orderId, message) {
    const socketLib = require('../lib/socket');
    logger.error(`[FOOD99 SYNC ERROR] Order ${orderId}: ${message}`);
    socketLib.emitToRestaurant(restaurantId, 'sync_error', {
      orderId,
      service: 'FOOD99',
      message: message || 'Falha desconhecida na integração',
    });
  }

  async _getOrderAndToken(orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: {
          include: { integrationSettings: true },
        },
      },
    });

    if (!order || !order.food99OrderId) {
      return { success: false, error: 'Pedido não encontrado ou não é da 99Food' };
    }

    const settings = order.restaurant?.integrationSettings;
    if (!settings?.food99AppShopId) {
      return { success: false, error: 'app_shop_id não configurado para esta loja' };
    }

    const token = await Food99AuthService.getValidToken(settings.food99AppShopId);
    if (!token) {
      return { success: false, error: 'Token 99Food expirado ou indisponível' };
    }

    return { order, token, settings };
  }

  async confirmOrder(orderId, restaurantId) {
    try {
      const result = await this._getOrderAndToken(orderId);
      if (result.success === false) return result;

      const { order } = result;

      await this.confirmOrderOnPlatform(restaurantId, order.food99OrderId);

      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'PREPARING' },
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.errmsg || error.message;
      logger.error(`[FOOD99] Erro ao confirmar: ${errorMsg}`);
      await this.notifySyncError(restaurantId, orderId, `Erro ao confirmar: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  async rejectOrder(orderId, restaurantId, reasonId = 1010, reason = 'Pedido recusado') {
    try {
      const result = await this._getOrderAndToken(orderId);
      if (result.success === false) return result;

      const { order } = result;

      await this.rejectOrderOnPlatform(restaurantId, order.food99OrderId, reasonId);

      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELED', canceledAt: new Date() },
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.errmsg || error.message;
      logger.error(`[FOOD99] Erro ao rejeitar: ${errorMsg}`);
      await this.notifySyncError(restaurantId, orderId, `Erro ao rejeitar: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  async markReady(orderId, restaurantId) {
    try {
      const result = await this._getOrderAndToken(orderId);
      if (result.success === false) return result;

      const { order } = result;

      await this.markReadyOnPlatform(restaurantId, order.food99OrderId);

      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'READY', readyAt: new Date() },
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.errmsg || error.message;
      logger.error(`[FOOD99] Erro ao marcar pronto: ${errorMsg}`);
      await this.notifySyncError(restaurantId, orderId, `Erro ao marcar pronto: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }
}

const food99OrderAdapter = new Food99OrderAdapter();

module.exports = food99OrderAdapter;
