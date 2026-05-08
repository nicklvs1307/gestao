const axios = require('axios');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const Food99AuthService = require('./Food99AuthService');
const IntegrationBaseService = require('./IntegrationBaseService');

const BASE_URL = process.env.FOOD99_BASE_URL || 'https://openapi.didi-food.com';

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
    const promotions = rawData.promotions || [];

    const items = orderItems.map(item => {
      const subItems = (item.sub_item_list || []).map(sub => ({
        name: sub.name || `Adicional ${sub.app_item_id}`,
        price: (sub.total_price || sub.sku_price || 0) / 100,
        quantity: sub.amount || 1,
      }));

      return {
        name: item.name || `Item ${item.app_item_id}`,
        externalId: item.app_item_id,
        price: (item.total_price || item.sku_price || 0) / 100,
        quantity: item.amount || 1,
        observations: item.remark || null,
        addons: subItems,
        sizeJson: null,
        flavorsJson: null,
      };
    });

    const payType = rawData.pay_type;
    const deliveryType = rawData.delivery_type;
    const orderType = deliveryType === 2 ? 'PICKUP' : 'DELIVERY';

    const isPrepaid = payType === 1 || payType === 4;
    const rawMethod = payType === 2 ? 'CASH' : payType === 1 ? 'ONLINE_PAID' : 'ONLINE_PAID';

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
        rawMethod,
        isPrepaid,
        prepaidAmount: isPrepaid ? total : 0,
        pendingAmount: !isPrepaid ? total : 0,
        changeFor: null,
      },
      totals: {
        subtotal,
        deliveryFee,
        discount: totalDiscount,
        total,
      },
      customerNote: rawData.remark || null,
    };
  }

  async confirmOrderOnPlatform(restaurantId, platformOrderId) {
    const token = await this.getAccessToken(restaurantId);
    if (!token) return;

    try {
      await axios.post(
        `${BASE_URL}/v1/order/order/confirm`,
        { auth_token: token, order_id: platformOrderId },
        { timeout: 10000 },
      );
      logger.info(`[FOOD99] Pedido ${platformOrderId} confirmado`);
    } catch (error) {
      logger.error(`[FOOD99] Erro ao confirmar ${platformOrderId}:`, error.message);
    }
  }

  async rejectOrderOnPlatform(restaurantId, platformOrderId, reasonId = 1010) {
    const token = await this.getAccessToken(restaurantId);
    if (!token) return;

    try {
      await axios.post(
        `${BASE_URL}/v1/order/order/cancel`,
        {
          auth_token: token,
          order_id: platformOrderId,
          reason_id: reasonId,
          reason: 'Pedido recusado pelo restaurante',
        },
        { timeout: 10000 },
      );
      logger.info(`[FOOD99] Pedido ${platformOrderId} cancelado`);
    } catch (error) {
      logger.error(`[FOOD99] Erro ao cancelar ${platformOrderId}:`, error.message);
    }
  }

  async markReadyOnPlatform(restaurantId, platformOrderId) {
    const token = await this.getAccessToken(restaurantId);
    if (!token) return;

    try {
      await axios.get(`${BASE_URL}/v1/order/order/ready`, {
        params: { auth_token: token, order_id: platformOrderId },
        timeout: 10000,
      });
      logger.info(`[FOOD99] Pedido ${platformOrderId} marcado como pronto`);
    } catch (error) {
      logger.error(`[FOOD99] Erro ao marcar pronto ${platformOrderId}:`, error.message);
    }
  }

  async markDeliveredOnPlatform(restaurantId, platformOrderId) {
    const token = await this.getAccessToken(restaurantId);
    if (!token) return;

    try {
      await axios.get(`${BASE_URL}/v1/order/order/delivered`, {
        params: { auth_token: token, order_id: platformOrderId },
        timeout: 10000,
      });
      logger.info(`[FOOD99] Pedido ${platformOrderId} marcado como entregue`);
    } catch (error) {
      logger.error(`[FOOD99] Erro ao marcar entregue ${platformOrderId}:`, error.message);
    }
  }
}

const food99OrderAdapter = new Food99OrderAdapter();

module.exports = food99OrderAdapter;
module.exports.Food99OrderAdapter = Food99OrderAdapter;
