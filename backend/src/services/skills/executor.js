/**
 * SkillExecutor - Executa chamadas de API para as skills
 * 
 * Este módulo faz chamadas HTTP para as APIs REST internas via apiClient.
 * É separado da documentação (MD) para manter separação de concerns.
 */

const { normalizePhone } = require('../../lib/phoneUtils');
const logger = require('../../config/logger');
const apiClient = require('./apiClient');

class SkillExecutor {
  
  // ============================================================
  // MENU - Cardápio, produtos, categorias, promoções
  // ============================================================

  async searchProducts(restaurantId, query) {
    try {
      const result = await apiClient.getProducts(restaurantId);
      const products = result.products || result;
      
      const filtered = products.filter(p => 
        p.isAvailable && (
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(query.toLowerCase()))
        )
      );

      if (filtered.length === 0) {
        return { error: `Não encontrei produtos para "${query}".` };
      }

      return { products: filtered };
    } catch (error) {
      logger.error('[Executor SEARCH PRODUCTS ERROR]', error);
      return { error: `Erro ao buscar produtos: ${error.message}` };
    }
  }

  async getMenu(restaurantId, category = null) {
    try {
      const result = await apiClient.getProducts(restaurantId);
      const products = result.products || result;
      const availableProducts = products.filter(p => p.isAvailable && p.showInMenu !== false);

      if (category) {
        const filtered = availableProducts.filter(p =>
          p.categories && p.categories.some(c => c.name.toLowerCase().includes(category.toLowerCase()))
        );
        if (filtered.length === 0) {
          return { error: `Categoria "${category}" não encontrada.` };
        }
        return { categories: [{ name: category, products: filtered }] };
      }

      const grouped = {};
      for (const product of availableProducts) {
        const cats = product.categories || [{ name: 'Outros' }];
        for (const cat of cats) {
          if (!grouped[cat.name]) grouped[cat.name] = [];
          grouped[cat.name].push(product);
        }
      }

      const categories = Object.entries(grouped).map(([name, products]) => ({ name, products }));

      if (categories.length === 0) {
        return { error: 'Nenhuma categoria encontrada.' };
      }

      return { categories };
    } catch (error) {
      logger.error('[Executor GET MENU ERROR]', error);
      return { error: `Erro ao buscar cardápio: ${error.message}` };
    }
  }

  async getCategories(restaurantId) {
    try {
      const result = await apiClient.getCategories(restaurantId);
      const categories = result.categories || result;

      if (categories.length === 0) {
        return { error: 'Nenhuma categoria disponível.' };
      }

      return { categories: categories.map(c => c.name) };
    } catch (error) {
      logger.error('[Executor GET CATEGORIES ERROR]', error);
      return { error: `Erro ao buscar categorias: ${error.message}` };
    }
  }

  async getPromotions(restaurantId) {
    try {
      const result = await apiClient.getActivePromotions(restaurantId);
      const promotions = result.promotions || result;
      return { promotions: promotions || [] };
    } catch (error) {
      logger.error('[Executor GET PROMOTIONS ERROR]', error);
      return { promotions: [] };
    }
  }

  // ============================================================
  // CUSTOMER - Busca, cria, atualiza clientes
  // ============================================================

  async searchCustomer(restaurantId, phone) {
    try {
      const result = await apiClient.searchCustomers(restaurantId, normalizePhone(phone));
      const customers = result.customers || result;

      if (!customers || customers.length === 0) {
        return { notFound: true, phone };
      }

      return { customer: customers[0] };
    } catch (error) {
      logger.error('[Executor SEARCH CUSTOMER ERROR]', error);
      return { notFound: true, phone };
    }
  }

  async createCustomer(restaurantId, data) {
    try {
      const customerData = {
        restaurantId,
        name: data.name,
        phone: normalizePhone(data.phone),
        address: data.address || null,
        street: data.street || null,
        number: data.number || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
        complement: data.complement || null,
        reference: data.reference || null
      };

      const result = await apiClient.createCustomer(customerData);
      return { customer: result };
    } catch (error) {
      logger.error('[Executor CREATE CUSTOMER ERROR]', error);
      if (error.message?.includes('já cadastrado')) {
        return { error: `Cliente já cadastrado. Use update_customer para alterar.` };
      }
      return { error: `Erro ao criar cliente: ${error.message}` };
    }
  }

  async updateCustomer(restaurantId, phone, data) {
    try {
      const searchResult = await this.searchCustomer(restaurantId, phone);
      if (searchResult.notFound) {
        return { error: 'Cliente não encontrado.' };
      }

      const customerId = searchResult.customer.id;
      const result = await apiClient.updateCustomer(customerId, data);
      return { customer: result };
    } catch (error) {
      logger.error('[Executor UPDATE CUSTOMER ERROR]', error);
      return { error: `Erro ao atualizar cliente: ${error.message}` };
    }
  }

  // ============================================================
  // ORDER - Criação, status, histórico, cancelamento
  // ============================================================

  async createOrder(restaurantId, args, customerPhone) {
    try {
      const orderData = {
        items: args.items.map(item => ({
          productId: item.productId,
          quantity: Number(item.quantity) || 1,
          observations: item.observations || null,
          sizeId: item.sizeId || null,
          size: item.size || null,
          addonsIds: item.addonsIds || [],
          addons: item.addons || []
        })),
        orderType: args.orderType || 'DELIVERY',
        deliveryInfo: {
          name: args.customerName,
          phone: normalizePhone(customerPhone),
          address: args.deliveryAddress || 'Retirada',
          deliveryType: (args.orderType || 'DELIVERY').toLowerCase(),
          paymentMethod: args.paymentMethod,
          changeFor: args.changeFor || 0,
          deliveryFee: args.deliveryFee || 0
        }
      };

      const result = await apiClient.createDeliveryOrder(restaurantId, orderData);
      return { order: result };
    } catch (error) {
      logger.error('[Executor CREATE ORDER ERROR]', error);
      return { error: `Erro ao criar pedido: ${error.message}` };
    }
  }

  async checkOrderStatus(restaurantId, orderId, phone) {
    try {
      let order;

      if (orderId) {
        order = await apiClient.getOrder(orderId);
      } else {
        const result = await apiClient.getOrderByPhone(phone);
        const orders = result.orders || result;
        order = Array.isArray(orders) ? orders[0] : null;
      }

      if (!order) {
        return { error: 'Pedido não encontrado.' };
      }

      return { order };
    } catch (error) {
      logger.error('[Executor CHECK STATUS ERROR]', error);
      return { error: `Erro ao consultar status: ${error.message}` };
    }
  }

  async getOrderHistory(restaurantId, phone) {
    try {
      const result = await apiClient.getOrderByPhone(phone);
      const orders = result.orders || result;

      if (!orders || (Array.isArray(orders) && orders.length === 0)) {
        return { error: 'Nenhum pedido encontrado.' };
      }

      return { orders: Array.isArray(orders) ? orders : [orders] };
    } catch (error) {
      logger.error('[Executor HISTORY ERROR]', error);
      return { error: `Erro ao buscar histórico: ${error.message}` };
    }
  }

  async cancelOrder(restaurantId, orderId, phone, reason) {
    try {
      const result = await apiClient.cancelOrder(orderId, reason);
      return { success: true, orderId, reason };
    } catch (error) {
      logger.error('[Executor CANCEL ERROR]', error);
      return { error: `Erro ao cancelar pedido: ${error.message}` };
    }
  }

  // ============================================================
  // DELIVERY - Áreas, taxas, tempo
  // ============================================================

  async checkDeliveryArea(restaurantId, address, neighborhood) {
    try {
      const query = neighborhood || address;
      if (!query) {
        return { error: 'Informe o endereço ou bairro.' };
      }

      const result = await apiClient.getDeliveryAreas(restaurantId);
      const areas = result.areas || result;

      if (!areas || areas.length === 0) {
        const settings = await apiClient.getRestaurantSettings(restaurantId);
        return { defaultFee: settings?.settings?.deliveryFee || 0, areas: [] };
      }

      const matchedArea = areas.find(a => 
        a.name.toLowerCase().includes(query.toLowerCase()) ||
        query.toLowerCase().includes(a.name.toLowerCase())
      );

      if (matchedArea) {
        return { area: matchedArea };
      }

      return { areas: areas.map(a => ({ name: a.name, fee: a.fee })) };
    } catch (error) {
      logger.error('[Executor CHECK DELIVERY AREA ERROR]', error);
      return { error: `Erro ao verificar área de entrega: ${error.message}` };
    }
  }

  async getDeliveryFee(restaurantId, area = null) {
    try {
      if (area) {
        const result = await apiClient.getDeliveryAreas(restaurantId);
        const areas = result.areas || result;
        const matchedArea = areas?.find(a => 
          a.name.toLowerCase().includes(area.toLowerCase()) ||
          area.toLowerCase().includes(a.name.toLowerCase())
        );

        if (matchedArea) {
          return { area: matchedArea.name, fee: matchedArea.fee };
        }
      }

      const settings = await apiClient.getRestaurantSettings(restaurantId);
      const defaultFee = settings?.settings?.deliveryFee || 0;

      const areasResult = await apiClient.getDeliveryAreas(restaurantId);
      const areas = areasResult.areas || areasResult || [];

      return { defaultFee, areas: areas.map(a => ({ name: a.name, fee: a.fee })) };
    } catch (error) {
      logger.error('[Executor GET DELIVERY FEE ERROR]', error);
      return { defaultFee: 0, areas: [] };
    }
  }

  async getDeliveryTime(restaurantId) {
    try {
      const result = await apiClient.getRestaurantSettings(restaurantId);
      return { deliveryTime: result?.settings?.deliveryTime || '30-40 min' };
    } catch (error) {
      logger.error('[Executor GET DELIVERY TIME ERROR]', error);
      return { deliveryTime: '30-40 min' };
    }
  }

  // ============================================================
  // PAYMENT - Métodos, troco
  // ============================================================

  async getPaymentMethods(restaurantId, orderType = null) {
    try {
      const result = await apiClient.getPaymentMethods(restaurantId);
      let methods = result.methods || result;

      if (orderType === 'PICKUP') {
        methods = methods.filter(m => m.allowPos !== false);
      } else {
        methods = methods.filter(m => m.allowDelivery !== false);
      }

      return { methods };
    } catch (error) {
      logger.error('[Executor GET PAYMENT METHODS ERROR]', error);
      return { methods: [] };
    }
  }

  calculateChange(totalAmount, paymentAmount) {
    const total = Number(totalAmount);
    const payment = Number(paymentAmount);

    if (isNaN(total) || isNaN(payment)) {
      return { error: 'Valores inválidos.' };
    }

    if (payment < total) {
      return { error: true, missing: total - payment };
    }

    if (payment === total) {
      return { exact: true, change: 0 };
    }

    return { change: payment - total };
  }

  // ============================================================
  // LOYALTY - Programa de fidelidade
  // ============================================================

  async getLoyaltyInfo(restaurantId) {
    try {
      const result = await apiClient.getLoyaltyInfo(restaurantId);
      const settings = result.settings || result;

      if (!settings?.loyaltyEnabled) {
        return { enabled: false };
      }

      return {
        enabled: true,
        pointsPerReal: settings.pointsPerReal || 1,
        cashbackPercentage: settings.cashbackPercentage || 0
      };
    } catch (error) {
      logger.error('[Executor GET LOYALTY INFO ERROR]', error);
      return { enabled: false };
    }
  }

  async getLoyaltyBalance(restaurantId, phone) {
    try {
      const searchResult = await this.searchCustomer(restaurantId, phone);
      if (searchResult.notFound) {
        return { error: 'Cliente não encontrado.' };
      }

      const customer = searchResult.customer;
      return {
        name: customer.name,
        loyaltyPoints: customer.loyaltyPoints || 0,
        cashbackBalance: customer.cashbackBalance || 0
      };
    } catch (error) {
      logger.error('[Executor GET LOYALTY BALANCE ERROR]', error);
      return { error: `Erro ao buscar saldo: ${error.message}` };
    }
  }

  // ============================================================
  // STORE INFO - Informações da loja
  // ============================================================

  async getStoreInfo(restaurantId, query) {
    try {
      const result = await apiClient.getKnowledgeBase(restaurantId, query);
      const knowledge = result.knowledge || result;
      return { knowledge: knowledge || [] };
    } catch (error) {
      logger.error('[Executor GET STORE INFO ERROR]', error);
      return { knowledge: [] };
    }
  }

  async getOperatingHours(restaurantId) {
    try {
      const result = await apiClient.getRestaurantSettings(restaurantId);
      const settings = result.settings || result;
      const restaurant = result.restaurant;

      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = now.toTimeString().slice(0, 5);

      let hours = [];
      let isOpenNow = false;

      if (settings?.operatingHours) {
        try {
          const parsedHours = typeof settings.operatingHours === 'string' 
            ? JSON.parse(settings.operatingHours) 
            : settings.operatingHours;

          for (let i = 0; i < 7; i++) {
            const dayHours = parsedHours.find(h => h.dayOfWeek === i);
            const isToday = i === currentDay;

            if (dayHours?.isClosed) {
              hours.push({ dayOfWeek: i, dayName: dayNames[i], isClosed: true });
            } else if (dayHours) {
              hours.push({ 
                dayOfWeek: i, 
                dayName: dayNames[i], 
                isClosed: false,
                openingTime: dayHours.openingTime,
                closingTime: dayHours.closingTime
              });

              if (isToday) {
                isOpenNow = currentTime >= dayHours.openingTime && currentTime <= dayHours.closingTime;
              }
            }
          }
        } catch (e) {
          logger.error('[Executor] Error parsing operating hours:', e);
        }
      }

      return { hours, isOpenNow, restaurant };
    } catch (error) {
      logger.error('[Executor GET OPERATING HOURS ERROR]', error);
      return { hours: [], isOpenNow: false };
    }
  }

  async getRestaurantInfo(restaurantId) {
    try {
      const result = await apiClient.getRestaurantSettings(restaurantId);
      const restaurant = result.restaurant;

      if (!restaurant) {
        return { error: 'Restaurante não encontrado.' };
      }

      return { restaurant };
    } catch (error) {
      logger.error('[Executor GET RESTAURANT INFO ERROR]', error);
      return { error: `Erro ao buscar informações: ${error.message}` };
    }
  }
}

module.exports = new SkillExecutor();
