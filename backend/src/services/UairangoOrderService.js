const axios = require('axios');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const socketLib = require('../lib/socket');

class UairangoOrderService {
  BASE_URL = 'https://www.uairango.com/api2';

  /**
   * Obtém o token de acesso válido para o restaurante.
   */
  async getAccessToken(restaurantId) {
    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId }
    });

    if (!settings?.uairangoActive || !settings?.uairangoToken) {
      return null;
    }

    try {
      const response = await axios.post(`${this.BASE_URL}/login`, {
        token: settings.uairangoToken
      });

      if (response.data && response.data.success && response.data.token) {
        return response.data.token;
      }
      return null;
    } catch (error) {
      logger.error(`[UAIRANGO] Erro ao obter token para restaurante ${restaurantId}:`, error.message);
      return null;
    }
  }

  /**
   * Cria um pedido no sistema a partir dos dados do Uai Rangô.
   */
  async createOrderFromUairango(restaurantId, uairangoOrderId, orderData) {
    try {
      const settings = await prisma.integrationSettings.findUnique({
        where: { restaurantId }
      });

      if (!settings?.uairangoActive) {
        logger.info(`[UAIRANGO] Integração não ativa para restaurante ${restaurantId}`);
        return;
      }

      const existingOrder = await prisma.order.findFirst({
        where: {
          restaurantId,
          uairangoOrderId
        }
      });

      if (existingOrder) {
        logger.info(`[UAIRANGO] Pedido ${uairangoOrderId} já existe no sistema`);
        return;
      }

      const orderNumber = await this.getNextDailyOrderNumber(restaurantId);

      const isDelivery = orderData.tipo_entrega === 'Delivery';
      const orderType = isDelivery ? 'DELIVERY' : 'TAKEOUT';

      const orderItems = [];

      const products = orderData.produtos || [];
      for (const item of products) {
        const product = await this.findOrCreateProduct(restaurantId, item);

        const addonsData = [];
        if (Array.isArray(item.adicionais)) {
          for (const addon of item.adicionais) {
            addonsData.push({
              name: addon.nome || 'Adicional',
              price: parseFloat(addon.valor || 0),
              quantity: addon.quantidade || 1
            });
          }
        }

        const sizeData = item.opcao ? {
          name: item.opcao,
          price: parseFloat(item.valor || 0)
        } : null;

        orderItems.push({
          productId: product.id,
          quantity: parseInt(item.quantidade || 1),
          priceAtTime: parseFloat(item.valor || 0),
          observations: item.obs || null,
          addonsJson: addonsData.length > 0 ? JSON.stringify(addonsData) : null,
          sizeJson: sizeData ? JSON.stringify(sizeData) : null,
          flavorsJson: null
        });
      }

      const deliveryOrderData = isDelivery ? {
        customerName: orderData.usuario?.nome || 'Cliente',
        phone: orderData.usuario?.tel1 || orderData.usuario?.tel_localizador || '',
        street: orderData.endereco?.rua || '',
        number: orderData.endereco?.num?.toString() || '',
        complement: orderData.endereco?.complemento || '',
        neighborhood: orderData.endereco?.bairro || '',
        city: orderData.endereco?.cidade || '',
        state: orderData.endereco?.uf || '',
        zipCode: orderData.endereco?.cep || '',
        reference: orderData.endereco?.ponto_referencia || '',
        latitude: orderData.endereco?.lat ? parseFloat(orderData.endereco.lat) : null,
        longitude: orderData.endereco?.lng ? parseFloat(orderData.endereco.lng) : null,
        estimatedTime: orderData.prazo_min || orderData.prazo_max || null
      } : null;

      const total = parseFloat(orderData.valor_total || 0);
      const extraCharge = isDelivery ? parseFloat(orderData.taxa_entrega || 0) : 0;

      const paymentMethod = this.mapPaymentMethod(orderData.forma_pagamento);

      const order = await prisma.order.create({
        data: {
          dailyOrderNumber: orderNumber,
          status: 'CONFIRMED',
          total: total - (orderData.taxa_entrega || 0),
          discount: 0,
          extraCharge: extraCharge,
          orderType: orderType,
          isPrinted: false,
          pendingAt: new Date(),
          preparingAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          restaurantId,
          uairangoOrderId,
          items: {
            create: orderItems
          }
        },
        include: {
          items: {
            include: {
              product: true
            }
          },
          restaurant: true
        }
      });

      if (deliveryOrderData) {
        await prisma.deliveryOrder.create({
          data: {
            status: 'PENDING',
            ...deliveryOrderData,
            orderId: order.id
          }
        });
      }

      if (orderData.observacao) {
        await prisma.orderNote.create({
          data: {
            orderId: order.id,
            content: orderData.observacao,
            createdBy: 'Sistema'
          }
        });
      }

      socketLib.emitToRestaurant(restaurantId, 'new_order', {
        order: order,
        platform: 'uairango',
        orderId: uairangoOrderId
      });

      await this.confirmOrderOnUairango(restaurantId, uairangoOrderId);

      logger.info(`[UAIRANGO] Pedido ${order.id} criado a partir do Uai Rangô ${uairangoOrderId} (${orderType})`);

      return order;
    } catch (error) {
      logger.error(`[UAIRANGO] Erro ao criar pedido ${uairangoOrderId}:`, error.message);
      this._notifySyncError(restaurantId, uairangoOrderId, `Erro ao criar pedido: ${error.message}`);
      throw error;
    }
  }

  /**
   * Encontra ou cria um produto baseado nos dados do item do pedido.
   */
  async findOrCreateProduct(restaurantId, item) {
    const productName = item.produto || 'Produto Uai Rangô';
    
    const existingProduct = await prisma.product.findFirst({
      where: {
        restaurantId,
        name: productName
      }
    });

    if (existingProduct) {
      return existingProduct;
    }

    const defaultCategory = await prisma.category.findFirst({
      where: { restaurantId }
    });

    const product = await prisma.product.create({
      data: {
        name: productName,
        description: item.obs || '',
        price: parseFloat(item.valor || 0),
        restaurantId,
        showInMenu: false,
        isFlavor: false,
        saiposIntegrationCode: item.id_produto?.toString() || null
      }
    });

    if (defaultCategory) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          categories: {
            connect: { id: defaultCategory.id }
          }
        }
      });
    }

    return product;
  }

  /**
   * Obtém o próximo número de pedido do dia.
   */
  async getNextDailyOrderNumber(restaurantId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastOrder = await prisma.order.findFirst({
      where: {
        restaurantId,
        createdAt: {
          gte: today
        }
      },
      orderBy: {
        dailyOrderNumber: 'desc'
      }
    });

    return (lastOrder?.dailyOrderNumber || 0) + 1;
  }

  /**
   * Mapeia o método de pagamento do Uai Rangô para o sistema.
   */
  mapPaymentMethod(formaPagamento) {
    if (!formaPagamento) return 'money';
    
    const lower = formaPagamento.toLowerCase();
    if (lower.includes('pix')) return 'pix';
    if (lower.includes('crédito')) return 'credit_card';
    if (lower.includes('débito')) return 'debit_card';
    if (lower.includes('online')) return 'online';
    
    return 'money';
  }

  /**
   * Confirma o pedido no Uai Rangô (API).
   */
  async confirmOrderOnUairango(restaurantId, uairangoOrderId) {
    const token = await this.getAccessToken(restaurantId);
    if (!token) return;

    try {
      await axios.post(
        `${this.BASE_URL}/auth/pedido/confirma/${uairangoOrderId}`,
        {},
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      logger.info(`[UAIRANGO] Pedido ${uairangoOrderId} confirmado no Uai Rangô`);
    } catch (error) {
      logger.error(`[UAIRANGO] Erro ao confirmar pedido ${uairangoOrderId} no Uai Rangô:`, error.message);
    }
  }

  /**
   * Confirma um pedido no sistema e no Uai Rangô.
   */
  async confirmOrder(orderId, restaurantId) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId }
    });

    if (!order || !order.uairangoOrderId) {
      throw new Error('Pedido não encontrado ou não é do Uai Rangô');
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CONFIRMED',
        preparingAt: new Date()
      }
    });

    const token = await this.getAccessToken(restaurantId);
    if (token) {
      try {
        await axios.post(
          `${this.BASE_URL}/auth/pedido/confirma/${order.uairangoOrderId}`,
          {},
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      } catch (error) {
        logger.error(`[UAIRANGO] Erro ao confirmar no Uai Rangô:`, error.message);
      }
    }

    socketLib.emitToRestaurant(restaurantId, 'order_updated', { orderId });

    return { success: true };
  }

  /**
   * Rejeita/cancela um pedido no sistema e no Uai Rangô.
   */
  async rejectOrder(orderId, restaurantId, reason) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId }
    });

    if (!order || !order.uairangoOrderId) {
      throw new Error('Pedido não encontrado ou não é do Uai Rangô');
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELED',
        canceledAt: new Date()
      }
    });

    const token = await this.getAccessToken(restaurantId);
    if (token) {
      try {
        await axios.post(
          `${this.BASE_URL}/auth/pedido/cancela/${order.uairangoOrderId}`,
          {},
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      } catch (error) {
        logger.error(`[UAIRANGO] Erro ao cancelar no Uai Rangô:`, error.message);
      }
    }

    socketLib.emitToRestaurant(restaurantId, 'order_updated', { orderId });

    return { success: true };
  }

  /**
   * Marca o pedido como pronto/dispatch no sistema e no Uai Rangô.
   */
  async markReady(orderId, restaurantId) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId }
    });

    if (!order || !order.uairangoOrderId) {
      throw new Error('Pedido não encontrado ou não é do Uai Rangô');
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'READY',
        readyAt: new Date()
      }
    });

    const token = await this.getAccessToken(restaurantId);
    if (token) {
      try {
        await axios.post(
          `${this.BASE_URL}/auth/pedido/notifica/${order.uairangoOrderId}`,
          {},
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      } catch (error) {
        logger.error(`[UAIRANGO] Erro ao notificar no Uai Rangô:`, error.message);
      }
    }

    socketLib.emitToRestaurant(restaurantId, 'order_updated', { orderId });

    return { success: true };
  }

  /**
   * Notifica erro de sincronização via socket.
   */
  _notifySyncError(restaurantId, orderId, message) {
    logger.error(`[UAIRANGO SYNC ERROR] Order ${orderId}: ${message}`);
    socketLib.emitToRestaurant(restaurantId, 'sync_error', {
      orderId,
      service: 'UAIRANGO',
      message: message || 'Falha desconhecida na integração'
    });
  }
}

module.exports = new UairangoOrderService();