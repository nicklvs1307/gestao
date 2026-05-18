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
    const items = rawItems.map(item => {
      const rawOptions = item.options || [];
      const itemType = item.type || '';
      const isPizza = itemType === 'LEGACY_PIZZA' || itemType === 'PIZZA';
      
      // Arrays para organizar as opções
      let flavorsData = [];
      let sizeData = null;
      let addonsData = [];
      
      if (isPizza) {
        // ─── PIZZA: Extrair TOPPING (sabores) e CRUST (massa/borda) ───
        const crustOptions = rawOptions.filter(opt => opt.type === 'CRUST');
        const toppingOptions = rawOptions.filter(opt => opt.type === 'TOPPING');
        
        // Mapear sabores (TOPPING)
        flavorsData = toppingOptions.map(opt => ({
          name: opt.name,
          price: parseFloat(opt.unitPrice) || 0,
          addition: parseFloat(opt.addition) || 0,
          quantity: opt.quantity || 1,
          groupName: opt.groupName || null,
          integrationCode: opt.externalCode || null,
        }));
        
        // Mapear tamanho/massa (CRUST)
        sizeData = crustOptions[0] ? {
          name: crustOptions[0].name,
          price: parseFloat(crustOptions[0].unitPrice) || 0,
          integrationCode: crustOptions[0].externalCode || null,
        } : null;
        
        // Adicionais de 3º nível para pizzas (customizations nos toppings)
        toppingOptions.forEach(opt => {
          if (opt.customizations && Array.isArray(opt.customizations)) {
            opt.customizations.forEach(cust => {
              addonsData.push({
                name: cust.name,
                price: parseFloat(cust.unitPrice) || parseFloat(cust.addition) || 0,
                quantity: cust.quantity || 1,
                parentFlavor: opt.name,
                groupName: cust.groupName || null,
                integrationCode: cust.externalCode || null,
              });
            });
          }
        });
      } else {
        // ─── PRODUTO SIMPLES / COMBO: Extrair todas as options como addons ───
        rawOptions.forEach(opt => {
          // Mapear cada option como addon (exceto se for CRUST de pizza)
          if (opt.type !== 'CRUST') {
            addonsData.push({
              name: opt.name,
              price: parseFloat(opt.unitPrice) || parseFloat(opt.addition) || 0,
              quantity: opt.quantity || 1,
              groupName: opt.groupName || null,
              optionType: opt.type || null,
              integrationCode: opt.externalCode || null,
            });
          }
          
          // Mapear customizations (3º nível) como addons adicionais
          if (opt.customizations && Array.isArray(opt.customizations)) {
            opt.customizations.forEach(cust => {
              addonsData.push({
                name: cust.name,
                price: parseFloat(cust.unitPrice) || parseFloat(cust.addition) || 0,
                quantity: cust.quantity || 1,
                parentAddon: opt.name,
                groupName: cust.groupName || null,
                optionType: cust.type || null,
                integrationCode: cust.externalCode || null,
              });
            });
          }
        });
      }
      
      // Usar optionsPrice como preço total quando existir (já inclui complementos)
      const itemPrice = item.optionsPrice > 0 
        ? item.optionsPrice + item.price  // base + options
        : (item.totalPrice || item.price || 0);

      return {
        name: item.name || `Item iFood (${item.id || item.productId || 'diversos'})`,
        externalId: item.id || item.productId,
        integrationCode: item.externalCode || null,
        price: itemPrice,
        quantity: item.quantity || 1,
        observations: item.observations || null,
        addons: addonsData,
        sizeJson: sizeData ? JSON.stringify(sizeData) : null,
        flavorsJson: flavorsData.length ? JSON.stringify(flavorsData) : null,
      };
    });

    // ─── PAGAMENTO ────────────────────────────────────────────────
    // API v2 do iFood: payments é um OBJETO { prepaid, pending, methods }
    const payments = rawData?.payments || {};
    const paymentMethods = payments.methods || [];

    // Separar métodos Online (já pagos no app) e Offline (cobrar na entrega)
    const onlineMethods = paymentMethods.filter(m => m.type === 'ONLINE');
    const offlineMethods = paymentMethods.filter(m => m.type === 'OFFLINE');

    // Calcular valores corretamente
    const prepaidAmount = onlineMethods.reduce((sum, m) => sum + (parseFloat(m.value) || 0), 0) || parseFloat(payments.prepaid) || 0;
    const pendingAmount = offlineMethods.reduce((sum, m) => sum + (parseFloat(m.value) || 0), 0) || parseFloat(payments.pending) || 0;

    // Método offline (para cobrança na entrega) - usar primeiro offline ou CASH como fallback
    const firstOfflineMethod = offlineMethods[0] || {};
    const isPrepaid = prepaidAmount > 0;
    const rawMethod = offlineMethods.length > 0 
      ? (firstOfflineMethod.method || 'CASH') 
      : (isPrepaid ? 'ONLINE_PAID' : 'CASH');

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
    const additionalFees = rawData?.total?.additionalFees || rawData?.additionalFees || 0;
    const benefitsAmount = rawData?.total?.benefits || 0;
    const total = rawData?.total?.orderAmount || (subtotal + deliveryFee + additionalFees - benefitsAmount);

    // ─── SCHEDULE (AGENDAMENTO) ────────────────────────────────────
    const schedule = rawData?.schedule || {};
    const orderTiming = rawData?.orderTiming || 'IMMEDIATE';
    const scheduledDateTime = (orderTiming === 'SCHEDULED') 
      ? (schedule?.deliveryDateTimeStart || schedule?.scheduledDateTime || null)
      : null;

    // ─── BENEFITS (CUPONS) ──────────────────────────────────────────
    const benefits = rawData?.benefits || [];
    const normalizedBenefits = benefits.map(b => ({
      name: b.name || b.campaign?.name,
      value: b.sponsorshipValues?.reduce((s, v) => s + (parseFloat(v.value) || 0), 0) || 0,
      target: b.target, // ITEM, SUBTOTAL, DELIVERY_FEE
      sponsorship: b.sponsorship,
    }));

    // ─── RETORNO NORMALIZADO ──────────────────────────────────────
    // Considera PICKUP se: orderType === 'PICKUP' OU se não há endereço de entrega
    const isPickupOrder = orderType === 'PICKUP' || !deliveryAddress;

    // Nome do cliente: buscar em vários campos possíveis do iFood
    const customerName = customer?.name || customer?.documentNumber || 'Cliente iFood';

    return {
      orderType: isPickupOrder ? 'PICKUP' : 'DELIVERY',
      items,
      customer: {
        name: customerName,
        phone: customer?.phone?.number || customer?.phone || '',
        document: customer?.document || null, // CPF ou CNPJ
      },
      deliveryData,
      payment: {
        rawMethod,
        isPrepaid,
        prepaidAmount,
        pendingAmount,
        changeFor: firstOfflineMethod?.cash?.changeFor 
          ? parseFloat(firstOfflineMethod.cash.changeFor) 
          : (firstOfflineMethod?.changeFor ? parseFloat(firstOfflineMethod.changeFor) : null),
      },
      totals: {
        subtotal,
        deliveryFee,
        discount: benefitsAmount,
        platformFee: additionalFees,
        total,
      },
      customerNote: rawData?.extraInfo || null,
      // === CAMPOS IFOOD (Homologação) ===
      displayId: rawData.displayId || null,
      // pickupCode: para pedidos DELIVERY usa o código do motoboy, para PICKUP usa o displayId (código de coleta)
      pickupCode: isPickupOrder ? (rawData.displayId || null) : (rawData?.delivery?.pickupCode || null),
      scheduledDateTime,
      customerDocument: customer?.documentNumber || null,
      benefits: normalizedBenefits.length > 0 ? normalizedBenefits : null,
    };
  }

  async confirmOrderOnPlatform(restaurantId, platformOrderId) {
    const settings = await this.getSettings(restaurantId);
    if (!settings?.ifoodAutoAcceptOrders) {
      logger.info(`[IFOOD] Auto-accept desativado para ${restaurantId}, pulando confirmação automática`);
      return;
    }

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
