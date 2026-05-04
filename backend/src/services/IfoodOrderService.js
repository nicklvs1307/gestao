const axios = require('axios');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const socketLib = require('../lib/socket');
const IfoodAuthService = require('./IfoodAuthService');
const OrderNumberService = require('./OrderNumberService');
const FinancialService = require('./FinancialService');

const BASE_URL = 'https://merchant-api.ifood.com.br';

class IfoodOrderService {

  _notifySyncError(restaurantId, orderId, message) {
    logger.error(`[IFOOD SYNC ERROR] Order ${orderId}: ${message}`);
    socketLib.emitToRestaurant(restaurantId, 'sync_error', {
      orderId,
      service: 'IFOOD',
      message: message || 'Falha desconhecida na integração'
    });
  }

  /**
   * Cria pedido local a partir dos dados COMPLETOS retornados pela API do iFood.
   * Recebe o objeto completo de GET /order/v1.0/orders/{orderId}.
   */
  async createOrderFromIfood(restaurantId, ifoodOrderId, orderData) {
    try {
      const settings = await prisma.integrationSettings.findUnique({
        where: { restaurantId }
      });

      if (!settings?.ifoodIntegrationActive) {
        logger.info(`[IFOOD] Integração não ativa para restaurante ${restaurantId}`);
        return;
      }

      const existingOrder = await prisma.order.findFirst({
        where: {
          restaurantId,
          ifoodOrderId: ifoodOrderId
        }
      });

      if (existingOrder) {
        logger.info(`[IFOOD] Pedido ${ifoodOrderId} já existe no sistema`);
        return;
      }

      const orderNumber = await OrderNumberService.getNextDailyOrderNumber(restaurantId);

      // Mapear itens do formato da API iFood
      const items = orderData?.items || [];
      const orderItems = [];

      for (const item of items) {
        const product = await this.findOrCreateProduct(restaurantId, item);

        // Mapear subitens/opções como addons
        const subItems = item.subItems || [];
        const addonsData = subItems.map(sub => ({
          name: sub.name,
          price: sub.totalPrice || sub.price || 0,
          quantity: sub.quantity || 1
        }));

        orderItems.push({
          productId: product.id,
          quantity: item.quantity || 1,
          priceAtTime: item.unitPrice || item.totalPrice || item.price || product.price,
          observations: item.observations || null,
          addonsJson: addonsData.length > 0 ? JSON.stringify(addonsData) : null,
          sizeJson: null,
          flavorsJson: null
        });
      }

      // Mapear dados de entrega do formato da API iFood
      let deliveryOrderData = null;
      const deliveryAddress = orderData?.delivery?.deliveryAddress;
      const customer = orderData?.customer;
      const orderType = orderData?.orderType || orderData?.type;

      if (orderType === 'DELIVERY' || deliveryAddress) {
        const localCustomer = await this.findOrCreateCustomer(
          restaurantId,
          {
            name: customer?.name,
            phone: customer?.phone?.number || customer?.phone,
            address: deliveryAddress?.streetName || deliveryAddress?.formattedAddress,
            street: deliveryAddress?.streetName,
            number: deliveryAddress?.streetNumber,
            complement: deliveryAddress?.complement,
            neighborhood: deliveryAddress?.neighborhood,
            city: deliveryAddress?.city,
            state: deliveryAddress?.state,
            zipCode: deliveryAddress?.postalCode,
            reference: deliveryAddress?.reference
          }
        );

        // Processar pagamentos do iFood
        const payments = orderData?.payments || {};
        const prepaid = parseFloat(payments.prepaid) || 0;
        const pending = parseFloat(payments.pending) || 0;
        const paymentMethods = payments.methods || [];
        
        // Detectar se pagamento é online (já foi pago no app)
        const onlinePayments = paymentMethods.filter(p => p.type === 'ONLINE');
        const offlinePayments = paymentMethods.filter(p => p.type === 'OFFLINE');
        const isPaidOnline = prepaid > 0 || onlinePayments.length > 0;
        
        // Usar o primeiro método de pagamento válido
        const firstValidPayment = paymentMethods[0] || {};
        const ifoodMethod = firstValidPayment.method || firstValidPayment.type || 'CASH';
        const mappedMethod = this.mapIfoodPaymentMethod(ifoodMethod);

        // Armazenar info sobre pagamento online para uso posterior
        const paymentInfo = {
          isPaidOnline,
          prepaidAmount: prepaid,
          pendingAmount: pending,
          method: mappedMethod,
          rawMethod: ifoodMethod,
          // Guardar para exibir "Pago Online - PIX" etc
          displayLabel: isPaidOnline ? `Pago Online - ${this.getPaymentDisplayLabel(ifoodMethod)}` : mappedMethod
        };

        deliveryOrderData = {
          name: customer?.name || 'Cliente iFood',
          phone: customer?.phone?.number || customer?.phone || '',
          address: deliveryAddress?.formattedAddress || deliveryAddress?.streetName || '',
          complement: deliveryAddress?.complement || '',
          reference: deliveryAddress?.reference || '',
          neighborhood: deliveryAddress?.neighborhood || '',
          city: deliveryAddress?.city || '',
          state: deliveryAddress?.state || '',
          zipCode: deliveryAddress?.postalCode || '',
          deliveryType: 'delivery',
          paymentMethod: paymentInfo.displayLabel,
          changeFor: firstValidPayment.changeFor || null,
          deliveryFee: orderData?.total?.deliveryFee || orderData?.deliveryFee || 0,
          notes: orderData?.extraInfo || '',
          customerId: localCustomer?.id
        };
      }

      // Calcular totais usando dados da API
      const subtotal = orderData?.total?.subTotal || 
        items.reduce((sum, item) => {
          return sum + ((item.totalPrice || item.unitPrice || 0) * (item.quantity || 1));
        }, 0);

      const deliveryFee = orderData?.total?.deliveryFee || orderData?.deliveryFee || 0;
      const discount = orderData?.total?.discount || 0;
      const total = orderData?.total?.orderAmount || (subtotal + deliveryFee - discount);

      const order = await prisma.order.create({
        data: {
          dailyOrderNumber: orderNumber,
          status: 'PENDING',
          total,
          orderType: orderType === 'PICKUP' ? 'PICKUP' :
                     orderType === 'DELIVERY' ? 'DELIVERY' :
                     orderType === 'INDOOR' ? 'TABLE' : 'DELIVERY',
          restaurantId,
          isPrinted: false,
          ifoodOrderId: ifoodOrderId,
          pendingAt: new Date(),
          items: {
            create: orderItems
          },
          deliveryOrder: deliveryOrderData ? {
            create: deliveryOrderData
          } : undefined
        },
        include: {
          items: true,
          deliveryOrder: true
        }
      });

      logger.info(`[IFOOD] Pedido ${order.id} criado a partir do iFood ${ifoodOrderId} (${orderType})`);

      // Criar registros de pagamento (igual PDV)
      await this.processIfoodPayments(order, restaurantId, paymentInfo, ifoodOrderId);

      await require('./OrderService').emitOrderUpdate(order.id, 'ORDER_CREATED');

      return order;
    } catch (error) {
      logger.error(`[IFOOD] Erro ao criar pedido:`, error);
      this._notifySyncError(restaurantId, ifoodOrderId, `Erro ao criar pedido: ${error.message}`);
      throw error;
    }
  }

  async findOrCreateProduct(restaurantId, item) {
    const name = item.name || `Item iFood (${item.id || item.productId || 'diversos'})`;
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
          description: `Produto importado do iFood - ${item.id || item.productId || 'auto'}`,
          price,
          restaurantId,
          isAvailable: true
        }
      });

      logger.info(`[IFOOD] Produto criado: ${product.id} - ${name}`);
    }

    return product;
  }

  async findOrCreateCustomer(restaurantId, customerData) {
    if (!customerData?.phone) {
      return null;
    }

    const phone = customerData.phone.replace(/\D/g, '');
    const name = customerData.name || 'Cliente iFood';

    let customer = await prisma.customer.findFirst({
      where: {
        restaurantId,
        phone
      }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name,
          phone,
          address: customerData.address || customerData.street,
          street: customerData.street,
          number: customerData.number,
          complement: customerData.complement,
          neighborhood: customerData.neighborhood,
          city: customerData.city,
          state: customerData.state,
          zipCode: customerData.zipCode,
          restaurantId
        }
      });

      logger.info(`[IFOOD] Cliente criado: ${customer.id} - ${name}`);
    }

    return customer;
  }

  async cancelOrderFromIfood(restaurantId, ifoodOrderId) {
    try {
      const order = await prisma.order.findFirst({
        where: {
          restaurantId,
          ifoodOrderId: ifoodOrderId
        }
      });

      if (!order) {
        logger.warn(`[IFOOD] Pedido ${ifoodOrderId} não encontrado`);
        return;
      }

      if (order.status === 'CANCELED' || order.status === 'COMPLETED') {
        logger.info(`[IFOOD] Pedido ${order.id} já ${order.status.toLowerCase()}`);
        return;
      }

      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELED',
          canceledAt: new Date()
        }
      });

      logger.info(`[IFOOD] Pedido ${order.id} cancelado via iFood`);

      await require('./OrderService').emitOrderUpdate(order.id, 'ORDER_CANCELED');
    } catch (error) {
      logger.error(`[IFOOD] Erro ao cancelar pedido:`, error);
    }
  }

  async updateOrderFromIfood(restaurantId, ifoodOrderId, orderData) {
    try {
      const order = await prisma.order.findFirst({
        where: {
          restaurantId,
          ifoodOrderId
        },
        include: {
          items: true
        }
      });

      if (!order) {
        logger.warn(`[IFOOD] Pedido ${ifoodOrderId} não encontrado para atualização`);
        return;
      }

      // Atualizar total se veio dados novos
      if (orderData?.total?.orderAmount) {
        await prisma.order.update({
          where: { id: order.id },
          data: { total: orderData.total.orderAmount }
        });
      }

      logger.info(`[IFOOD] Pedido ${order.id} atualizado via iFood`);

      await require('./OrderService').emitOrderUpdate(order.id, 'ORDER_UPDATED');
    } catch (error) {
      logger.error(`[IFOOD] Erro ao atualizar pedido:`, error);
      this._notifySyncError(restaurantId, ifoodOrderId, `Erro ao atualizar pedido: ${error.message}`);
    }
  }

  mapPaymentMethod(method) {
    const methodMap = {
      'CASH': 'Dinheiro',
      'CREDIT': 'Cartão de Crédito',
      'CREDIT_CARD': 'Cartão de Crédito',
      'DEBIT': 'Cartão de Débito',
      'DEBIT_CARD': 'Cartão de Débito',
      'PIX': 'Pix',
      'MEAL_VOUCHER': 'Vale Refeição',
      'FOOD_VOUCHER': 'Vale Refeição',
      'DIGITAL_WALLET': 'Carteira Digital',
      'ONLINE': 'Pagamento Online',
      'COUPON': 'Cupom'
    };

    return methodMap[method] || method || 'Dinheiro';
  }

  /**
   * Mapeia método do iFood para o formato interno do sistema
   */
  mapIfoodPaymentMethod(method) {
    const methodMap = {
      'CASH': 'dinheiro',
      'CREDIT': 'cartao-credito',
      'CREDIT_CARD': 'cartao-credito',
      'DEBIT': 'cartao-debito',
      'DEBIT_CARD': 'cartao-debito',
      'PIX': 'pix',
      'MEAL_VOUCHER': 'vale-refeicao',
      'FOOD_VOUCHER': 'vale-refeicao',
      'DIGITAL_WALLET': 'carteira-digital',
      'OTHER': 'outro'
    };

    return methodMap[method?.toUpperCase()] || 'dinheiro';
  }

  /**
   * Retorna label para exibição (ex: "Pix", "Cartão de Crédito")
   */
  getPaymentDisplayLabel(method) {
    const labelMap = {
      'CASH': 'Dinheiro',
      'CREDIT': 'Cartão de Crédito',
      'CREDIT_CARD': 'Cartão de Crédito',
      'DEBIT': 'Cartão de Débito',
      'DEBIT_CARD': 'Cartão de Débito',
      'PIX': 'Pix',
      'MEAL_VOUCHER': 'Vale Refeição',
      'FOOD_VOUCHER': 'Vale Refeição',
      'DIGITAL_WALLET': 'Carteira Digital',
      'OTHER': 'Outro'
    };

    return labelMap[method?.toUpperCase()] || method || 'Dinheiro';
  }

  /**
   * Processa pagamentos do iFood e cria registros no banco
   * Segue o mesmo padrão do PDV (OrderService.createOrder)
   */
  async processIfoodPayments(order, restaurantId, paymentInfo, ifoodOrderId) {
    try {
      const ifoodMethod = paymentInfo.rawMethod?.toUpperCase() || 'CASH';
      const isPaidOnline = paymentInfo.isPaidOnline;
      
      // Valores a processar
      const totalAmount = order.total;
      const prepaidAmount = paymentInfo.prepaidAmount || 0;
      const pendingAmount = paymentInfo.pendingAmount || 0;

      // Se tem pagamento online (já foi pago no app), criar transação
      if (isPaidOnline && prepaidAmount > 0) {
        logger.info(`[IFOOD] Pagamento online detectado: R$ ${prepaidAmount} (${ifoodMethod})`);

        // 1. Criar registro no pedido (prisma.payment)
        await prisma.payment.create({
          data: {
            orderId: order.id,
            amount: prepaidAmount,
            method: paymentInfo.method
          }
        });

        // 2. Buscar caixa aberto
        const openSession = await prisma.cashierSession.findFirst({
          where: { restaurantId, status: 'OPEN' }
        });

        // 3. Criar transação financeira (igual PDV)
        await FinancialService.processOrderPayment(restaurantId, {
          order: { ...order, dailyOrderNumber: order.dailyOrderNumber },
          paymentMethod: paymentInfo.method,
          cashierId: openSession?.id
        });

        logger.info(`[IFOOD] Transação criada: R$ ${prepaidAmount} no caixa ${openSession?.id || 'NULL'}`);
      }

      // Se tem pagamento pendente (offline - pagar na entrega), não criar transação ainda
      if (pendingAmount > 0) {
        logger.info(`[IFOOD] Pagamento pendente: R$ ${pendingAmount} (pagar na entrega)`);
        
        // Criar registro como pendente (não cria financialTransaction ainda)
        await prisma.payment.create({
          data: {
            orderId: order.id,
            amount: pendingAmount,
            method: 'pendente'
          }
        });
      }

      // Se não tem prepaid nem pending, mas tem método definido (offline total)
      if (!isPaidOnline && pendingAmount === 0 && totalAmount > 0) {
        const method = this.mapIfoodPaymentMethod(ifoodMethod);
        logger.info(`[IFOOD] Pagamento total offline: R$ ${totalAmount} (${method})`);

        await prisma.payment.create({
          data: {
            orderId: order.id,
            amount: totalAmount,
            method: method
          }
        });

        // Não criar transação ainda - será criado quando delivery confirmar recebimento
      }

    } catch (error) {
      logger.error(`[IFOOD] Erro ao processar pagamentos: ${error.message}`);
      // Não falha o pedido por erro de pagamento
    }
  }

  /**
   * Helper interno: busca pedido e obtém token válido via IfoodAuthService.
   * Modelo centralizado: usa token global da aplicação.
   * Retorna { order, token } ou { success: false, error }.
   */
  async _getOrderAndToken(orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: {
          include: { integrationSettings: true }
        }
      }
    });

    if (!order || !order.ifoodOrderId) {
      return { success: false, error: 'Pedido não encontrado ou não é do iFood' };
    }

    const token = await IfoodAuthService.getValidToken();

    if (!token) {
      return { success: false, error: 'Token iFood expirado ou indisponível. Verifique as credenciais.' };
    }

    return { order, token };
  }

  async confirmOrder(orderId, restaurantId) {
    try {
      const result = await this._getOrderAndToken(orderId);
      if (result.success === false) return result;

      const { order, token } = result;

      await axios.post(
        `${BASE_URL}/order/v1.0/orders/${order.ifoodOrderId}/confirm`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'PREPARING' }
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      logger.error(`[IFOOD] Erro ao confirmar pedido:`, errorMsg);
      this._notifySyncError(restaurantId, orderId, `Erro ao confirmar: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  async rejectOrder(orderId, restaurantId, reason) {
    try {
      const result = await this._getOrderAndToken(orderId);
      if (result.success === false) return result;

      const { order, token } = result;

      await axios.post(
        `${BASE_URL}/order/v1.0/orders/${order.ifoodOrderId}/requestCancellation`,
        { reason: reason || '501' },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELED',
          canceledAt: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      logger.error(`[IFOOD] Erro ao rejeitar pedido:`, errorMsg);
      this._notifySyncError(restaurantId, orderId, `Erro ao rejeitar: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  async startPreparation(orderId, restaurantId) {
    try {
      const result = await this._getOrderAndToken(orderId);
      if (result.success === false) return result;

      const { order, token } = result;

      await axios.post(
        `${BASE_URL}/order/v1.0/orders/${order.ifoodOrderId}/startPreparation`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'PREPARING',
          preparingAt: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      logger.error(`[IFOOD] Erro ao iniciar preparação:`, errorMsg);
      this._notifySyncError(restaurantId, orderId, `Erro ao iniciar preparação: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  async markReady(orderId, restaurantId) {
    try {
      const result = await this._getOrderAndToken(orderId);
      if (result.success === false) return result;

      const { order, token } = result;

      const endpoint = order.orderType === 'PICKUP'
        ? `${BASE_URL}/order/v1.0/orders/${order.ifoodOrderId}/readyToPickup`
        : `${BASE_URL}/order/v1.0/orders/${order.ifoodOrderId}/dispatch`;

      await axios.post(
        endpoint,
        order.orderType === 'DELIVERY' ? { deliveredBy: 'MERCHANT' } : {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'READY',
          readyAt: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      logger.error(`[IFOOD] Erro ao marcar pronto:`, errorMsg);
      this._notifySyncError(restaurantId, orderId, `Erro ao marcar pronto: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }
}

module.exports = new IfoodOrderService();