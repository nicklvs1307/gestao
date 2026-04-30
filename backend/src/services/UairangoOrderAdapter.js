const axios = require('axios');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const IntegrationBaseService = require('./IntegrationBaseService');
const UairangoAuthService = require('./UairangoAuthService');

// Retry com backoff exponencial
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
    return rawData.orderId || rawData.cod_pedido || rawData.id;
  }

  parseOrder(rawData, restaurantId) {
    const isDelivery = rawData.orderType === 'DELIVERY' || rawData.tipo_entrega === 'Delivery';
    const orderType = isDelivery ? 'DELIVERY' : 'PICKUP';

    const products = rawData.items || rawData.produtos || [];
    const items = products.map(item => {
      const addonsData = [];
      const addons = item.addons || item.adicionais || [];
      
      if (Array.isArray(addons)) {
        for (const addon of addons) {
          addonsData.push({
            name: addon.name || addon.nome || 'Adicional',
            price: parseFloat(addon.price || addon.valor || 0),
            quantity: addon.quantity || addon.quantidade || 1
          });
        }
      }

      return {
        productId: null,
        quantity: parseInt(item.quantity || item.quantidade || 1),
        priceAtTime: parseFloat(item.priceAtTime || item.valor || 0),
        observations: item.observations || item.obs || null,
        addonsJson: addonsData.length > 0 ? JSON.stringify(addonsData) : null,
        sizeJson: item.size ? JSON.stringify({ name: item.size.name || item.size, price: parseFloat(item.size.price || 0) }) : null,
        flavorsJson: null
      };
    });

    const deliveryData = isDelivery ? {
      address: this._formatAddress(rawData.delivery?.address || rawData.endereco),
      complement: rawData.delivery?.complement || rawData.endereco?.complemento || '',
      reference: rawData.delivery?.reference || rawData.endereco?.ponto_referencia || '',
      neighborhood: rawData.delivery?.neighborhood || rawData.endereco?.bairro || '',
      city: rawData.delivery?.city || rawData.endereco?.cidade || '',
      state: rawData.delivery?.state || rawData.endereco?.uf || '',
      zipCode: rawData.delivery?.postalCode || rawData.endereco?.cep || '',
      deliveryType: 'delivery',
      deliveryFee: parseFloat(rawData.delivery?.fee || rawData.taxa_entrega || 0),
      notes: rawData.notes || rawData.observacao || null,
      latitude: rawData.delivery?.latitude || rawData.endereco?.lat ? parseFloat(rawData.delivery?.latitude || rawData.endereco?.lat) : null,
      longitude: rawData.delivery?.longitude || rawData.endereco?.lng ? parseFloat(rawData.delivery?.longitude || rawData.endereco?.lng) : null,
    } : null;

    const customerData = isDelivery ? {
      name: rawData.customer?.name || rawData.usuario?.nome || 'Cliente',
      phone: rawData.customer?.phone || rawData.usuario?.tel1 || rawData.usuario?.tel_localizador || '',
    } : null;

    const total = parseFloat(rawData.total || rawData.valor_total || 0);
    const extraCharge = isDelivery ? parseFloat(rawData.delivery?.fee || rawData.taxa_entrega || 0) : 0;

    const paymentMethod = this.mapPaymentMethod(rawData.payment?.method || rawData.forma_pagamento);

    return {
      orderType,
      total: total - (rawData.delivery?.fee || rawData.taxa_entrega || 0),
      discount: 0,
      extraCharge,
      items,
      customer: customerData,
      deliveryData,
      paymentMethod,
      customerNote: rawData.notes || rawData.observacao || null,
    };
  }

  _formatAddress(addressData) {
    if (!addressData) return '';
    if (typeof addressData === 'string') return addressData;
    return `${addressData.street || addressData.rua || ''}, ${addressData.number || addressData.num || 'S/N'} - ${addressData.neighborhood || addressData.bairro || ''}, ${addressData.city || addressData.cidade || ''}/${addressData.state || addressData.uf || ''}`;
  }

  async confirmOrderOnPlatform(restaurantId, platformOrderId) {
    const token = await this.getAccessToken(restaurantId);
    if (!token) return;

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
    } catch (error) {
      logger.error(`[UAIRANGO] Erro ao confirmar ${platformOrderId}:`, error.message);
    }
  }

  async rejectOrderOnPlatform(restaurantId, platformOrderId, reasonCode = '501') {
    const token = await this.getAccessToken(restaurantId);
    if (!token) return;

    try {
      await withRetry(async () => {
        return await axios.post(
          `${this.BASE_URL}/order/v1.0/orders/${platformOrderId}/cancel`,
          { reasonCode },
          {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 10000
          }
        );
      });
      logger.info(`[UAIRANGO] Pedido ${platformOrderId} cancelado`);
    } catch (error) {
      logger.error(`[UAIRANGO] Erro ao cancelar ${platformOrderId}:`, error.message);
    }
  }

  async markReadyOnPlatform(restaurantId, platformOrderId) {
    const token = await this.getAccessToken(restaurantId);
    if (!token) return;

    try {
      await withRetry(async () => {
        return await axios.post(
          `${this.BASE_URL}/order/v1.0/orders/${platformOrderId}/ready`,
          {},
          {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 10000
          }
        );
      });
      logger.info(`[UAIRANGO] Pedido ${platformOrderId} marcado como pronto`);
    } catch (error) {
      logger.error(`[UAIRANGO] Erro ao notificar pronto ${platformOrderId}:`, error.message);
    }
  }
}

const uairangoOrderAdapter = new UairangoOrderAdapter();
module.exports = uairangoOrderAdapter;
module.exports.UairangoOrderAdapter = UairangoOrderAdapter;