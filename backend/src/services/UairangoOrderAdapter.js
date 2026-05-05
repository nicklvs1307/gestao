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

  /**
   * Traduz o formato bruto da API do Uairango para o formato normalizado
   * que o OrderService.createOrderFromIntegration() espera.
   * 
   * APENAS tradução de formato. Zero lógica financeira.
   */
  parseOrder(rawData, restaurantId) {
    const isDelivery = rawData.orderType === 'DELIVERY' || rawData.tipo_entrega === 'Delivery';
    const orderType = isDelivery ? 'DELIVERY' : 'PICKUP';

    // ─── ITENS ────────────────────────────────────────────────────
    const products = rawData.items || rawData.produtos || [];
    const items = products.map(item => {
      const addons = item.addons || item.adicionais || [];
      const addonsData = Array.isArray(addons) ? addons.map(addon => ({
        name: addon.name || addon.nome || 'Adicional',
        price: parseFloat(addon.price || addon.valor || 0),
        quantity: parseInt(addon.quantity || addon.quantidade || 1),
      })) : [];

      return {
        name: item.name || item.nome || `Item Uairango`,
        externalId: item.id || item.cod_produto || null,
        price: parseFloat(item.priceAtTime || item.valor || 0),
        quantity: parseInt(item.quantity || item.quantidade || 1),
        observations: item.observations || item.obs || null,
        addons: addonsData,
        sizeJson: item.size ? JSON.stringify({ name: item.size.name || item.size, price: parseFloat(item.size.price || 0) }) : null,
        flavorsJson: null,
      };
    });

    // ─── DELIVERY DATA ────────────────────────────────────────────
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
      latitude: rawData.delivery?.latitude || rawData.endereco?.lat ? parseFloat(rawData.delivery?.latitude || rawData.endereco?.lat) : null,
      longitude: rawData.delivery?.longitude || rawData.endereco?.lng ? parseFloat(rawData.delivery?.longitude || rawData.endereco?.lng) : null,
    } : null;

    // ─── CUSTOMER ─────────────────────────────────────────────────
    const customer = isDelivery ? {
      name: rawData.customer?.name || rawData.usuario?.nome || 'Cliente',
      phone: rawData.customer?.phone || rawData.usuario?.tel1 || rawData.usuario?.tel_localizador || '',
    } : null;

    // ─── PAGAMENTO ────────────────────────────────────────────────
    const rawMethod = rawData.payment?.method || rawData.forma_pagamento || 'CASH';
    const changeFor = rawData.payment?.changeFor || rawData.troco || null;

    // ─── TOTAIS ───────────────────────────────────────────────────
    const total = parseFloat(rawData.total || rawData.valor_total || 0);
    const deliveryFee = isDelivery ? parseFloat(rawData.delivery?.fee || rawData.taxa_entrega || 0) : 0;

    return {
      orderType,
      items,
      customer,
      deliveryData,
      payment: {
        rawMethod,
        isPrepaid: false, // Uairango geralmente não tem pagamento online
        prepaidAmount: 0,
        pendingAmount: 0,
        changeFor: changeFor ? parseFloat(changeFor) : null,
      },
      totals: {
        subtotal: total - deliveryFee,
        deliveryFee,
        discount: 0,
        total,
      },
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
