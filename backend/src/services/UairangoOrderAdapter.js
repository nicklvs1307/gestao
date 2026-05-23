const axios = require('axios');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const IntegrationBaseService = require('./IntegrationBaseService');
const UairangoAuthService = require('./UairangoAuthService');

async function withRetry(fn, retries = 3, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      logger.warn(`[UAIRANGO] Tentativa ${i + 1} falhou, tentando novamente em ${delayMs * Math.pow(2, i)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
    }
  }
}

class UairangoOrderAdapter extends IntegrationBaseService {
  constructor() {
    super('uairango');
    this.BASE_URL = 'https://www.uairango.com/api2';
  }

  async getSettings(restaurantId) {
    return await prisma.integrationSettings.findUnique({
      where: { restaurantId }
    });
  }

  async getAccessToken(restaurantId) {
    return await UairangoAuthService.getAccessToken(restaurantId);
  }

  getPlatformOrderId(rawData) {
    return rawData.id || rawData.orderId || null;
  }

  parseOrder(rawData, restaurantId) {
    const orderType = rawData.orderType === 'TAKEOUT' ? 'PICKUP' : 'DELIVERY';
    const isDelivery = orderType === 'DELIVERY';

    const items = (rawData.items || []).map(item => {
      const options = item.options || [];
      const addons = options.map(opt => ({
        name: opt.name || 'Adicional',
        price: parseFloat(opt.unitPrice || 0),
        quantity: parseInt(opt.quantity || 1),
        integrationCode: opt.id || null,
      }));

      const sizeData = options.length > 0
        ? { name: options[0].name, price: parseFloat(options[0].unitPrice || 0), integrationCode: options[0].id || null }
        : null;

      return {
        name: item.name || `Item Uairango`,
        externalId: item.id || null,
        integrationCode: item.externalCode || item.id || null,
        price: parseFloat(item.unitPrice || 0),
        quantity: parseInt(item.quantity || 1),
        observations: item.observations || null,
        addons,
        sizeJson: sizeData ? JSON.stringify(sizeData) : null,
        flavorsJson: null,
      };
    });

    const deliveryData = isDelivery && rawData.delivery?.deliveryAddress ? {
      address: this._formatAddress(rawData.delivery.deliveryAddress),
      complement: rawData.delivery.deliveryAddress.complement || '',
      reference: rawData.delivery.deliveryAddress.reference || '',
      neighborhood: rawData.delivery.deliveryAddress.neighborhood || '',
      city: rawData.delivery.deliveryAddress.city || '',
      state: rawData.delivery.deliveryAddress.state || '',
      zipCode: rawData.delivery.deliveryAddress.postalCode?.toString() || '',
      deliveryType: 'delivery',
      deliveryFee: parseFloat(rawData.total?.deliveryFee || 0),
      latitude: rawData.delivery.deliveryAddress.coordinates?.latitude || null,
      longitude: rawData.delivery.deliveryAddress.coordinates?.longitude || null,
    } : null;

    const customer = rawData.customer ? {
      name: rawData.customer.name || 'Cliente',
      phone: rawData.customer.phone?.number?.toString() || '',
    } : null;

    const paymentMethods = rawData.payments?.methods || [];
    const mainMethod = paymentMethods[0] || {};
    const rawMethod = mainMethod.method || 'CASH';
    const changeFor = null;

    const subtotal = parseFloat(rawData.total?.subTotal || 0);
    const deliveryFee = parseFloat(rawData.total?.deliveryFee || 0);
    const discount = parseFloat(rawData.total?.benefits || 0);
    const total = parseFloat(rawData.total?.orderAmount || (subtotal + deliveryFee - discount));

    return {
      orderType,
      items,
      customer,
      deliveryData,
      payment: {
        rawMethod,
        isPrepaid: (rawData.payments?.prepaid || 0) > 0,
        prepaidAmount: parseFloat(rawData.payments?.prepaid || 0),
        pendingAmount: parseFloat(rawData.payments?.pending || 0),
        changeFor,
      },
      totals: {
        subtotal,
        deliveryFee,
        discount,
        total,
      },
      customerNote: !isDelivery ? rawData.takeout?.observations || null : null,
      displayId: rawData.displayId || null,
      pickupCode: null,
      isTest: rawData.isTest || false,
    };
  }

  _formatAddress(addr) {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    const parts = [
      addr.streetName || addr.street || '',
      addr.streetNumber || addr.number || 'S/N',
    ].filter(Boolean).join(', ');
    const rest = [
      addr.neighborhood || '',
      addr.city || '',
      addr.state || '',
    ].filter(Boolean).join(', ');
    return [parts, rest].filter(Boolean).join(' - ');
  }

  async confirmOrderOnPlatform(restaurantId, platformOrderId) {
    const token = await this.getAccessToken(restaurantId);
    if (!token) { logger.warn(`[UAIRANGO] Sem token para confirmar ${platformOrderId}`); return false; }

    try {
      await withRetry(async () => {
        return await axios.post(
          `${this.BASE_URL}/order/v1.0/orders/${platformOrderId}/confirm`,
          {},
          {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 10000
          }
        );
      });
      logger.info(`[UAIRANGO] Pedido ${platformOrderId} confirmado`);
      return true;
    } catch (error) {
      logger.error(`[UAIRANGO] Erro ao confirmar ${platformOrderId}:`, error.message);
      return false;
    }
  }

  async rejectOrderOnPlatform(restaurantId, platformOrderId, reasonCode = '1') {
    const token = await this.getAccessToken(restaurantId);
    if (!token) { logger.warn(`[UAIRANGO] Sem token para cancelar ${platformOrderId}`); return false; }

    try {
      await withRetry(async () => {
        return await axios.post(
          `${this.BASE_URL}/order/v1.0/orders/${platformOrderId}/requestCancellation`,
          { cancellationCode: parseInt(reasonCode), reason: 'Cancelamento solicitado pelo estabelecimento' },
          {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 10000
          }
        );
      });
      logger.info(`[UAIRANGO] Pedido ${platformOrderId} cancelado`);
      return true;
    } catch (error) {
      logger.error(`[UAIRANGO] Erro ao cancelar ${platformOrderId}:`, error.message);
      return false;
    }
  }

  async dispatchOrderOnPlatform(restaurantId, platformOrderId) {
    const token = await this.getAccessToken(restaurantId);
    if (!token) { logger.warn(`[UAIRANGO] Sem token para despachar ${platformOrderId}`); return false; }

    try {
      await withRetry(async () => {
        return await axios.post(
          `${this.BASE_URL}/order/v1.0/orders/${platformOrderId}/dispatch`,
          {},
          {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 10000
          }
        );
      });
      logger.info(`[UAIRANGO] Pedido ${platformOrderId} despachado para entrega`);
      return true;
    } catch (error) {
      logger.error(`[UAIRANGO] Erro ao despachar ${platformOrderId}:`, error.message);
      return false;
    }
  }

  async markReadyOnPlatform(restaurantId, platformOrderId) {
    const token = await this.getAccessToken(restaurantId);
    if (!token) { logger.warn(`[UAIRANGO] Sem token para notificar pronto ${platformOrderId}`); return false; }

    try {
      await withRetry(async () => {
        return await axios.post(
          `${this.BASE_URL}/order/v1.0/orders/${platformOrderId}/readyToPickup`,
          {},
          {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 10000
          }
        );
      });
      logger.info(`[UAIRANGO] Pedido ${platformOrderId} marcado como pronto`);
      return true;
    } catch (error) {
      logger.error(`[UAIRANGO] Erro ao notificar pronto ${platformOrderId}:`, error.message);
      return false;
    }
  }
}

const uairangoOrderAdapter = new UairangoOrderAdapter();
module.exports = uairangoOrderAdapter;
module.exports.UairangoOrderAdapter = UairangoOrderAdapter;
