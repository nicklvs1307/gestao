const axios = require('axios');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const IfoodAuthService = require('./IfoodAuthService');
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

  /**
   * Traduz o formato bruto da API do iFood para o formato normalizado
   * que o OrderService.createOrderFromIntegration() espera.
   * 
   * APENAS tradução de formato. Zero lógica financeira.
   */
  parseOrder(rawData, restaurantId) {
    const orderType = rawData.orderType || rawData.type;
    const deliveryAddress = rawData?.delivery?.deliveryAddress;
    const customer = rawData?.customer;

    // ─── ITENS ────────────────────────────────────────────────────
    const rawItems = rawData?.items || [];
    const items = rawItems.map(item => ({
      name: item.name || `Item iFood (${item.id || item.productId || 'diversos'})`,
      externalId: item.id || item.productId,
      price: item.unitPrice || item.totalPrice || item.price || 0,
      quantity: item.quantity || 1,
      observations: item.observations || null,
      addons: (item.subItems || []).map(sub => ({
        name: sub.name,
        price: sub.totalPrice || sub.price || 0,
        quantity: sub.quantity || 1,
      })),
      sizeJson: null,
      flavorsJson: null,
    }));

    // ─── PAGAMENTO ────────────────────────────────────────────────
    // API v2 do iFood: payments é um OBJETO { prepaid, pending, methods }
    const payments = rawData?.payments || {};
    const prepaid = parseFloat(payments.prepaid) || 0;
    const pending = parseFloat(payments.pending) || 0;
    const paymentMethods = payments.methods || [];

    // Se payments veio como array (formato antigo), tratar como fallback
    const isLegacyFormat = Array.isArray(payments);
    const firstMethod = isLegacyFormat 
      ? (payments[0] || {}) 
      : (paymentMethods[0] || {});

    const rawMethod = firstMethod.method || firstMethod.type || 'CASH';
    const isPrepaid = prepaid > 0 || paymentMethods.some(m => m.type === 'ONLINE');

    // ─── DELIVERY DATA ────────────────────────────────────────────
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
      latitude: deliveryAddress?.coordinates?.latitude || null,
      longitude: deliveryAddress?.coordinates?.longitude || null,
    } : null;

    // ─── TOTAIS ───────────────────────────────────────────────────
    const subtotal = rawData?.total?.subTotal || 
      rawItems.reduce((sum, item) => sum + ((item.totalPrice || item.unitPrice || 0) * (item.quantity || 1)), 0);
    const deliveryFee = rawData?.total?.deliveryFee || rawData?.deliveryFee || 0;
    const discount = rawData?.total?.discount || 0;
    const total = rawData?.total?.orderAmount || (subtotal + deliveryFee - discount);

    // ─── RETORNO NORMALIZADO ──────────────────────────────────────
    return {
      orderType: orderType === 'PICKUP' ? 'PICKUP' : 'DELIVERY',
      items,
      customer: {
        name: customer?.name || 'Cliente iFood',
        phone: customer?.phone?.number || customer?.phone || '',
      },
      deliveryData,
      payment: {
        rawMethod,
        isPrepaid,
        prepaidAmount: prepaid,
        pendingAmount: pending,
        changeFor: firstMethod.changeFor ? parseFloat(firstMethod.changeFor) : null,
      },
      totals: {
        subtotal,
        deliveryFee,
        discount,
        total,
      },
      customerNote: rawData?.extraInfo || null,
    };
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
