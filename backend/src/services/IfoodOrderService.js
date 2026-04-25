const axios = require('axios');
const crypto = require('crypto');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const socketLib = require('../lib/socket');

class IfoodOrderService {
  getBaseUrl(env) {
    return env === 'production'
      ? 'https://merchant-api.ifood.com.br'
      : 'https://merchant-api.ifood.com.br';
  }

  _notifySyncError(restaurantId, orderId, message) {
    logger.error(`[IFOOD SYNC ERROR] Order ${orderId}: ${message}`);
    socketLib.emitToRestaurant(restaurantId, 'sync_error', {
      orderId,
      service: 'IFOOD',
      message: message || 'Falha desconhecida na integração'
    });
  }

  validateWebhookSignature(payload, signature, signingKey) {
    if (!signature || !signingKey) {
      logger.warn('[IFOOD] Assinatura ou chave não fornecida');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', signingKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  async processWebhookEvent(restaurantId, eventData) {
    const { code, orderId, metadata } = eventData;

    logger.info(`[IFOOD] Processando evento ${code} para pedido ${orderId}`);

    switch (code) {
      case 'PLACED':
      case 'CONFIRMED':
        await this.createOrderFromIfood(restaurantId, orderId, metadata);
        break;

      case 'CANCELLED':
        await this.cancelOrderFromIfood(restaurantId, orderId);
        break;

      case 'ORDER_PATCHED':
        await this.updateOrderFromIfood(restaurantId, orderId, metadata);
        break;

      default:
        logger.info(`[IFOOD] Evento ${code} não processado`);
    }
  }

  async createOrderFromIfood(restaurantId, ifoodOrderId, metadata) {
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

      const orderNumber = await this.getNextDailyOrderNumber(restaurantId);

      const items = metadata?.items || [];
      const orderItems = [];

      for (const item of items) {
        const product = await this.findOrCreateProduct(restaurantId, item);

        orderItems.push({
          productId: product.id,
          quantity: item.quantity || 1,
          priceAtTime: item.price || product.price,
          observations: item.notes || item.observation || null,
          sizeJson: item.size ? JSON.stringify(item.size) : null,
          addonsJson: item.addons ? JSON.stringify(item.addons) : null,
          flavorsJson: item.flavors ? JSON.stringify(item.flavors) : null
        });
      }

      let deliveryOrderData = null;

      if (metadata?.orderType === 'DELIVERY' || metadata?.deliveryAddress) {
        const customer = await this.findOrCreateCustomer(
          restaurantId,
          metadata?.customer || metadata?.createdBy
        );

        deliveryOrderData = {
          name: metadata?.customer?.name || metadata?.createdBy?.name || 'Cliente iFood',
          phone: metadata?.customer?.phone || metadata?.createdBy?.phone || '',
          address: metadata?.deliveryAddress?.street || metadata?.address,
          complement: metadata?.deliveryAddress?.complement,
          reference: metadata?.deliveryAddress?.reference,
          neighborhood: metadata?.deliveryAddress?.district || metadata?.deliveryAddress?.neighborhood,
          city: metadata?.deliveryAddress?.city,
          state: metadata?.deliveryAddress?.state,
          zipCode: metadata?.deliveryAddress?.zipCode,
          deliveryType: 'delivery',
          paymentMethod: this.mapPaymentMethod(metadata?.payments?.[0]?.method || metadata?.paymentMethod),
          changeFor: metadata?.changeFor,
          deliveryFee: metadata?.deliveryFee || 0,
          notes: metadata?.notes,
          customerId: customer?.id
        };
      }

      const subtotal = items.reduce((sum, item) => {
        const itemPrice = item.price || 0;
        const addonsPrice = (item.addons || []).reduce((a, b) => a + (b.price || 0), 0);
        return sum + ((itemPrice + addonsPrice) * (item.quantity || 1));
      }, 0);

      const deliveryFee = metadata?.deliveryFee || 0;
      const total = subtotal + deliveryFee;

      const order = await prisma.order.create({
        data: {
          dailyOrderNumber: orderNumber,
          status: 'PENDING',
          total,
          orderType: metadata?.orderType === 'PICKUP' ? 'PICKUP' :
                   metadata?.orderType === 'DELIVERY' ? 'DELIVERY' : 'TABLE',
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

      logger.info(`[IFOOD] Pedido ${order.id} criado a partir do iFood ${ifoodOrderId}`);

      socketLib.emitToRestaurant(restaurantId, 'new_order', {
        order: order.id,
        source: 'IFOOD',
        orderNumber: order.dailyOrderNumber
      });

      return order;
    } catch (error) {
      logger.error(`[IFOOD] Erro ao criar pedido:`, error);
      throw error;
    }
  }

  async findOrCreateProduct(restaurantId, item) {
    const name = item.name || `Item iFood (${item.productId || 'diversos'})`;

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
          description: `Produto importado do iFood - ${item.productId}`,
          price: item.price || 0,
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

      socketLib.emitToRestaurant(restaurantId, 'order_canceled', {
        orderId: order.id,
        source: 'IFOOD'
      });
    } catch (error) {
      logger.error(`[IFOOD] Erro ao cancelar pedido:`, error);
    }
  }

  async updateOrderFromIfood(restaurantId, ifoodOrderId, metadata) {
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

      if (metadata?.changeType === 'DELETE_ITEMS' && metadata?.items) {
        for (const item of metadata.items) {
          const existingItem = order.items.find(i => i.id === item.id);
          if (existingItem) {
            await prisma.orderItem.delete({
              where: { id: existingItem.id }
            });
          }
        }

        logger.info(`[IFOOD]Itens removidos do pedido ${order.id}`);
      }

      socketLib.emitToRestaurant(restaurantId, 'order_updated', {
        orderId: order.id,
        source: 'IFOOD'
      });
    } catch (error) {
      logger.error(`[IFOOD] Erro ao atualizar pedido:`, error);
    }
  }

  async getNextDailyOrderNumber(restaurantId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastOrder = await prisma.order.findFirst({
      where: {
        restaurantId,
        createdAt: { gte: today }
      },
      orderBy: { dailyOrderNumber: 'desc' }
    });

    return (lastOrder?.dailyOrderNumber || 0) + 1;
  }

  mapPaymentMethod(method) {
    const methodMap = {
      'CASH': 'Dinheiro',
      'CREDIT_CARD': 'Cartão de Crédito',
      'DEBIT_CARD': 'Cartão de Débito',
      'PIX': 'Pix',
      'MEAL_VOUCHER': 'Vale Refeição',
      'FOOD_VOUCHER': 'Vale Refeição'
    };

    return methodMap[method] || method || 'Dinheiro';
  }

  async confirmOrder(orderId, restaurantId) {
    try {
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

      const settings = order.restaurant.integrationSettings;
      const baseUrl = this.getBaseUrl(settings.ifoodEnv);

      await axios.post(
        `${baseUrl}/order/v1.0/orders/${order.ifoodOrderId}/confirm`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${settings.ifoodAccessToken}`,
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
      return { success: false, error: errorMsg };
    }
  }

  async rejectOrder(orderId, restaurantId, reason) {
    try {
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

      const settings = order.restaurant.integrationSettings;
      const baseUrl = this.getBaseUrl(settings.ifoodEnv);

      await axios.post(
        `${baseUrl}/order/v1.0/orders/${order.ifoodOrderId}/requestCancellation`,
        { reason: reason || '501' },
        {
          headers: {
            'Authorization': `Bearer ${settings.ifoodAccessToken}`,
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
      return { success: false, error: errorMsg };
    }
  }

  async startPreparation(orderId, restaurantId) {
    try {
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

      const settings = order.restaurant.integrationSettings;
      const baseUrl = this.getBaseUrl(settings.ifoodEnv);

      await axios.post(
        `${baseUrl}/order/v1.0/orders/${order.ifoodOrderId}/startPreparation`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${settings.ifoodAccessToken}`,
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
      return { success: false, error: errorMsg };
    }
  }

  async markReady(orderId, restaurantId) {
    try {
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

      const settings = order.restaurant.integrationSettings;
      const baseUrl = this.getBaseUrl(settings.ifoodEnv);

      const endpoint = order.orderType === 'PICKUP'
        ? `${baseUrl}/order/v1.0/orders/${order.ifoodOrderId}/readyToPickup`
        : `${baseUrl}/order/v1.0/orders/${order.ifoodOrderId}/dispatch`;

      await axios.post(
        endpoint,
        order.orderType === 'DELIVERY' ? { deliveredBy: 'MERCHANT' } : {},
        {
          headers: {
            'Authorization': `Bearer ${settings.ifoodAccessToken}`,
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
      return { success: false, error: errorMsg };
    }
  }
}

module.exports = new IfoodOrderService();