const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const IntegrationBaseService = require('./IntegrationBaseService');
const UairangoAuthService = require('./UairangoAuthService');
const api = require('./UairangoApiClient');

class UairangoOrderAdapter extends IntegrationBaseService {
  constructor() {
    super('uairango');
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

      // Separar opções por tipo: PIZZA tem sabores (TOPPING) e massa (CRUST)
      const toppingOptions = options.filter(o => o.type === 'TOPPING');
      const crustOptions = options.filter(o => o.type === 'CRUST');
      const regularOptions = options.filter(o => o.type !== 'TOPPING' && o.type !== 'CRUST');

      const hasPizzaStructure = toppingOptions.length > 0;

      let flavorsData = [];
      let sizeData = null;
      let addons = [];

      if (hasPizzaStructure) {
        flavorsData = toppingOptions.map(opt => ({
          name: opt.name || 'Sabor',
          price: parseFloat(opt.unitPrice || 0),
          quantity: parseInt(opt.quantity || 1),
          integrationCode: opt.id || null,
        }));

        sizeData = crustOptions.length > 0
          ? { name: crustOptions[0].name, price: parseFloat(crustOptions[0].unitPrice || 0), integrationCode: crustOptions[0].id || null }
          : null;

        addons = regularOptions.map(opt => ({
          name: opt.name || 'Adicional',
          price: parseFloat(opt.unitPrice || 0),
          quantity: parseInt(opt.quantity || 1),
          integrationCode: opt.id || null,
        }));
      } else {
        addons = options.map(opt => ({
          name: opt.name || 'Adicional',
          price: parseFloat(opt.unitPrice || 0),
          quantity: parseInt(opt.quantity || 1),
          integrationCode: opt.id || null,
        }));
      }

      return {
        name: item.name || 'Item Uairango',
        externalId: item.uniqueId || item.id || null,
        integrationCode: item.externalCode || item.id || null,
        price: parseFloat(item.unitPrice || 0),
        quantity: parseInt(item.quantity || 1),
        observations: item.observations || null,
        addons,
        sizeJson: sizeData ? JSON.stringify(sizeData) : null,
        flavorsJson: flavorsData.length > 0 ? JSON.stringify(flavorsData) : null,
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

    const rawPhone = rawData.customer?.phone?.number;
    const phone = rawPhone?.toString() || '';
    const isPhoneMasked = phone === 'Omitido' || phone.startsWith('0800');

    const customer = rawData.customer ? {
      name: rawData.customer.name || 'Cliente',
      phone,
      isPhoneMasked,
      localizer: rawData.customer.localizer || null,
      localizerExpiration: rawData.customer.localizerExpiration || null,
    } : null;

    // === PAGAMENTO: Separar ONLINE (já pago) de OFFLINE (pendente) ===
    const payments = rawData.payments || {};
    const paymentMethods = payments.methods || [];

    const onlineMethods = paymentMethods.filter(m => m.type === 'ONLINE');
    const offlineMethods = paymentMethods.filter(m => m.type === 'OFFLINE');

    const prepaidAmount = onlineMethods.reduce((sum, m) => sum + (parseFloat(m.value) || 0), 0) || parseFloat(payments.prepaid) || 0;
    const pendingAmount = offlineMethods.reduce((sum, m) => sum + (parseFloat(m.value) || 0), 0) || parseFloat(payments.pending) || 0;

    const isPrepaid = prepaidAmount > 0;
    const firstOfflineMethod = offlineMethods[0] || {};
    const firstOnlineMethod = onlineMethods[0] || {};
    const mainMethod = paymentMethods[0] || {};

    const rawMethod = offlineMethods.length > 0
      ? (firstOfflineMethod.method || 'CASH')
      : (isPrepaid ? firstOnlineMethod.method || 'ONLINE_PAID' : 'CASH');

    const subtotal = parseFloat(rawData.total?.subTotal || 0);
    const deliveryFee = parseFloat(rawData.total?.deliveryFee || 0);
    const discount = parseFloat(rawData.total?.benefits || 0);
    const additionalFees = parseFloat(rawData.total?.additionalFees || 0);
    const total = parseFloat(rawData.total?.orderAmount || (subtotal + deliveryFee - discount + additionalFees));

    // === BENEFITS (Cupons) ===
    const rawBenefits = rawData.benefits || [];
    const normalizedBenefits = Array.isArray(rawBenefits) && rawBenefits.length > 0
      ? rawBenefits.map(b => ({
          name: b.name || 'Cupom',
          value: b.sponsorshipValues?.reduce((s, v) => s + (parseFloat(v.value) || 0), 0)
            || parseFloat(rawData.total?.benefits || 0) / (rawBenefits.length || 1),
          target: b.target,
          sponsorship: b.sponsorship,
        }))
      : null;

    // === AGENDAMENTO ===
    const orderTiming = rawData.orderTiming || 'IMMEDIATE';
    const scheduledDateTime = orderTiming === 'SCHEDULED'
      ? (rawData.delivery?.deliveryDateTime || rawData.takeout?.takeoutDateTime || null)
      : null;

    return {
      orderType,
      items,
      customer,
      deliveryData,
      payment: {
        rawMethod,
        isPrepaid,
        prepaidAmount,
        pendingAmount,
        changeFor: firstOfflineMethod?.cash?.changeFor
          ? parseFloat(firstOfflineMethod.cash.changeFor)
          : (firstOfflineMethod?.changeFor ? parseFloat(firstOfflineMethod.changeFor) : null),
        cardBrand: mainMethod.card?.brand || null,
      },
      totals: {
        subtotal,
        deliveryFee,
        discount,
        additionalFees,
        total,
      },
      customerNote: !isDelivery ? rawData.takeout?.observations || null : null,
      displayId: rawData.displayId || null,
      pickupCode: rawData.pickupCode || null,
      scheduledDateTime,
      customerDocument: rawData.customer?.documentNumber || null,
      benefits: normalizedBenefits,
      isTest: rawData.isTest || false,
    };
  }

  async confirmOrderOnPlatform(restaurantId, platformOrderId) {
    try {
      await api.post(restaurantId, `/order/v1.0/orders/${platformOrderId}/confirm`);
      logger.info(`[UAIRANGO] Pedido ${platformOrderId} confirmado na plataforma`);
    } catch (error) {
      logger.error(`[UAIRANGO] Erro ao confirmar pedido ${platformOrderId}:`, error.message);
    }
  }

  async rejectOrderOnPlatform(restaurantId, platformOrderId, reason = '1') {
    try {
      await api.post(restaurantId, `/order/v1.0/orders/${platformOrderId}/requestCancellation`, {
        cancellationCode: parseInt(reason),
        reason: 'Cancelamento solicitado pelo estabelecimento'
      });
      logger.info(`[UAIRANGO] Pedido ${platformOrderId} rejeitado na plataforma`);
    } catch (error) {
      logger.error(`[UAIRANGO] Erro ao rejeitar pedido ${platformOrderId}:`, error.message);
    }
  }

  async startPreparationOnPlatform(restaurantId, platformOrderId) {
    try {
      await api.post(restaurantId, `/order/v1.0/orders/${platformOrderId}/confirm`);
      logger.info(`[UAIRANGO] Preparação iniciada para ${platformOrderId}`);
    } catch (error) {
      logger.error(`[UAIRANGO] Erro ao iniciar preparação ${platformOrderId}:`, error.message);
    }
  }

  async markReadyOnPlatform(restaurantId, platformOrderId, orderType = 'DELIVERY') {
    try {
      const endpoint = orderType === 'PICKUP'
        ? `/order/v1.0/orders/${platformOrderId}/readyToPickup`
        : `/order/v1.0/orders/${platformOrderId}/dispatch`;
      await api.post(restaurantId, endpoint);
      logger.info(`[UAIRANGO] Pedido ${platformOrderId} marcado como pronto`);
    } catch (error) {
      logger.error(`[UAIRANGO] Erro ao marcar pronto ${platformOrderId}:`, error.message);
    }
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
}

const uairangoOrderAdapter = new UairangoOrderAdapter();
module.exports = uairangoOrderAdapter;
module.exports.UairangoOrderAdapter = UairangoOrderAdapter;
