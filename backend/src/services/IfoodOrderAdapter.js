const axios = require('axios');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const socketLib = require('../lib/socket');
const IfoodAuthService = require('./IfoodAuthService');
const OrderNumberService = require('./OrderNumberService');
const IntegrationTypeService = require('./IntegrationTypeService');
const IntegrationBaseService = require('./IntegrationBaseService');

const BASE_URL = 'https://merchant-api.ifood.com.br';

class IfoodOrderAdapter extends IntegrationBaseService {
  constructor() {
    super('ifood');
  }

  async getSettings(restaurantId) {
    return await prisma.integrationSettings.findUnique({
      where: { restaurantId }
    });
  }

  async getAccessToken(restaurantId) {
    return await IfoodAuthService.getValidToken();
  }

  getPlatformOrderId(rawData) {
    return rawData.id || rawData.orderId;
  }

  parseOrder(rawData, restaurantId) {
    const items = rawData?.items || [];
    const orderType = IntegrationTypeService.mapOrderType(this.platform, rawData.orderType || rawData.type);
    const deliveryAddress = rawData?.delivery?.deliveryAddress;
    const customer = rawData?.customer;
    const payments = rawData?.payments || [];
    const firstPayment = payments[0] || {};

    const orderItems = items.map(item => ({
      productId: null,
      quantity: item.quantity || 1,
      priceAtTime: item.unitPrice || item.totalPrice || item.price || 0,
      observations: item.observations || null,
      addonsJson: item.subItems?.length > 0 ? JSON.stringify(item.subItems.map(sub => ({
        name: sub.name,
        price: sub.totalPrice || sub.price || 0,
        quantity: sub.quantity || 1
      }))) : null,
      sizeJson: null,
      flavorsJson: null
    }));

    const customerData = customer ? {
      name: customer.name || 'Cliente iFood',
      phone: customer.phone?.number || customer.phone || '',
    } : null;

    const deliveryData = (orderType === 'DELIVERY' || deliveryAddress) ? {
      address: deliveryAddress?.formattedAddress || deliveryAddress?.streetName || '',
      complement: deliveryAddress?.complement || '',
      reference: deliveryAddress?.reference || '',
      neighborhood: deliveryAddress?.neighborhood || '',
      city: deliveryAddress?.city || '',
      state: deliveryAddress?.state || '',
      zipCode: deliveryAddress?.postalCode || '',
      deliveryType: 'delivery',
      deliveryFee: rawData?.total?.deliveryFee || rawData?.deliveryFee || 0,
      notes: rawData?.extraInfo || '',
    } : null;

    const subtotal = rawData?.total?.subTotal || 
      items.reduce((sum, item) => sum + ((item.totalPrice || item.unitPrice || 0) * (item.quantity || 1)), 0);
    const deliveryFee = rawData?.total?.deliveryFee || rawData?.deliveryFee || 0;
    const discount = rawData?.total?.discount || 0;
    const total = rawData?.total?.orderAmount || (subtotal + deliveryFee - discount);

    const hasChangeFor = firstPayment.changeFor && parseFloat(firstPayment.changeFor) > 0;
    if (hasChangeFor && deliveryData) {
      deliveryData.changeFor = parseFloat(firstPayment.changeFor);
    }

    return {
      orderType,
      total,
      discount,
      extraCharge: deliveryFee,
      items: orderItems,
      customer: customerData,
      deliveryData,
      paymentMethod: firstPayment.method || firstPayment.type || 'CASH',
      customerNote: rawData?.extraInfo || null,
    };
  }

  async findOrCreateProduct(restaurantId, item) {
    const name = item.name || `Item iFood (${item.id || 'diversos'})`;
    const price = item.unitPrice || item.totalPrice || item.price || 0;

    let product = await prisma.product.findFirst({
      where: {
        restaurantId,
        name: { equals: name, mode: 'insensitive' }
      }
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          name,
          description: `Produto importado do iFood`,
          price,
          restaurantId,
          isAvailable: true
        }
      });
    }

    return product;
  }

  async confirmOrderOnPlatform(restaurantId, platformOrderId) {
    const token = await this.getAccessToken(restaurantId);
    if (!token) return;

    try {
      await axios.post(
        `${BASE_URL}/order/v1.0/orders/${platformOrderId}/confirm`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      logger.info(`[IFOOD] Pedido ${platformOrderId} confirmado no iFood`);
    } catch (error) {
      logger.error(`[IFOOD] Erro ao confirmar pedido ${platformOrderId}:`, error.message);
    }
  }

  async rejectOrderOnPlatform(restaurantId, platformOrderId, reason = '501') {
    const token = await this.getAccessToken(restaurantId);
    if (!token) return;

    try {
      await axios.post(
        `${BASE_URL}/order/v1.0/orders/${platformOrderId}/requestCancellation`,
        { reason },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      logger.info(`[IFOOD] Pedido ${platformOrderId} rejeitado no iFood`);
    } catch (error) {
      logger.error(`[IFOOD] Erro ao rejeitar pedido ${platformOrderId}:`, error.message);
    }
  }

  async startPreparationOnPlatform(restaurantId, platformOrderId) {
    const token = await this.getAccessToken(restaurantId);
    if (!token) return;

    try {
      await axios.post(
        `${BASE_URL}/order/v1.0/orders/${platformOrderId}/startPreparation`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      logger.info(`[IFOOD] Preparação iniciada para ${platformOrderId}`);
    } catch (error) {
      logger.error(`[IFOOD] Erro ao iniciar preparação:`, error.message);
    }
  }

  async markReadyOnPlatform(restaurantId, platformOrderId, orderType = 'DELIVERY') {
    const token = await this.getAccessToken(restaurantId);
    if (!token) return;

    const endpoint = orderType === 'PICKUP'
      ? `${BASE_URL}/order/v1.0/orders/${platformOrderId}/readyToPickup`
      : `${BASE_URL}/order/v1.0/orders/${platformOrderId}/dispatch`;

    try {
      await axios.post(
        endpoint,
        orderType === 'DELIVERY' ? { deliveredBy: 'MERCHANT' } : {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      logger.info(`[IFOOD] Pedido ${platformOrderId} marcado como pronto`);
    } catch (error) {
      logger.error(`[IFOOD] Erro ao marcar pronto:`, error.message);
    }
  }
}

const ifoodOrderAdapter = new IfoodOrderAdapter();

module.exports = ifoodOrderAdapter;
module.exports.IfoodOrderAdapter = IfoodOrderAdapter;