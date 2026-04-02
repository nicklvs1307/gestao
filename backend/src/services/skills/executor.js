/**
 * SkillExecutor - Executa chamadas de API para as skills
 * 
 * Este módulo contém toda a lógica de acesso ao banco de dados.
 * É separado da documentação (MD) para manter separação de concerns.
 */

const prisma = require('../../lib/prisma');
const { normalizePhone } = require('../../lib/phoneUtils');
const socketLib = require('../../lib/socket');
const logger = require('../../config/logger');

class SkillExecutor {
  
  // ============================================================
  // MENU - Cardápio, produtos, categorias, promoções
  // ============================================================

  async searchProducts(restaurantId, query) {
    const products = await prisma.product.findMany({
      where: {
        restaurantId,
        isAvailable: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      },
      include: {
        sizes: { include: { globalSize: true } },
        addonGroups: { include: { addons: true } },
        categories: { select: { name: true } }
      }
    });

    if (products.length === 0) {
      return { error: `Não encontrei produtos para "${query}".` };
    }

    return { products };
  }

  async getMenu(restaurantId, category = null) {
    const whereClause = { restaurantId, isActive: true };
    if (category) {
      whereClause.name = { contains: category, mode: 'insensitive' };
    }

    const categories = await prisma.category.findMany({
      where: whereClause,
      select: {
        name: true,
        products: {
          where: { isAvailable: true, showInMenu: true },
          select: {
            id: true, name: true, price: true, description: true, imageUrl: true,
            sizes: { select: { name: true, price: true, globalSize: { select: { name: true } } } },
            addonGroups: { select: { name: true, addons: { select: { name: true, price: true } } } }
          }
        }
      },
      orderBy: { order: 'asc' }
    });

    if (categories.length === 0) {
      return { error: category ? `Categoria "${category}" não encontrada.` : 'Nenhuma categoria encontrada.' };
    }

    return { categories };
  }

  async getCategories(restaurantId) {
    const categories = await prisma.category.findMany({
      where: { restaurantId, isActive: true },
      select: { name: true },
      orderBy: { order: 'asc' }
    });

    if (categories.length === 0) {
      return { error: 'Nenhuma categoria disponível.' };
    }

    return { categories: categories.map(c => c.name) };
  }

  async getPromotions(restaurantId) {
    const now = new Date();
    const promotions = await prisma.promotion.findMany({
      where: {
        restaurantId, isActive: true,
        startDate: { lte: now },
        endDate: { gte: now }
      },
      include: {
        applicableProducts: { select: { name: true } },
        applicableCategories: { select: { name: true } }
      }
    });

    return { promotions };
  }

  // ============================================================
  // CUSTOMER - Busca, cria, atualiza clientes
  // ============================================================

  async searchCustomer(restaurantId, phone) {
    const normalizedPhone = normalizePhone(phone);

    const customer = await prisma.customer.findFirst({
      where: {
        restaurantId,
        phone: { contains: normalizedPhone.slice(-8) }
      },
      select: {
        id: true, name: true, phone: true, email: true,
        address: true, street: true, number: true, neighborhood: true,
        city: true, state: true, zipCode: true, complement: true, reference: true,
        loyaltyPoints: true, cashbackBalance: true, createdAt: true,
        orders: {
          where: { status: { notIn: ['CANCELED'] } },
          select: {
            id: true, total: true, status: true, createdAt: true,
            items: { select: { quantity: true, product: { select: { name: true } } } }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!customer) {
      return { notFound: true, phone };
    }

    return { customer };
  }

  async createCustomer(restaurantId, data) {
    const existing = await prisma.customer.findFirst({
      where: { restaurantId, phone: { contains: normalizePhone(data.phone).slice(-8) } }
    });

    if (existing) {
      return { error: `Cliente já cadastrado como "${existing.name}". Use update_customer para alterar.` };
    }

    const customer = await prisma.customer.create({
      data: {
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
      }
    });

    return { customer };
  }

  async updateCustomer(restaurantId, phone, data) {
    const normalizedPhone = normalizePhone(phone);

    const customer = await prisma.customer.findFirst({
      where: { restaurantId, phone: { contains: normalizedPhone.slice(-8) } }
    });

    if (!customer) {
      return { error: 'Cliente não encontrado.' };
    }

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        name: data.name || customer.name,
        address: data.address || customer.address,
        street: data.street || customer.street,
        number: data.number || customer.number,
        neighborhood: data.neighborhood || customer.neighborhood,
        city: data.city || customer.city,
        state: data.state || customer.state,
        zipCode: data.zipCode || customer.zipCode,
        complement: data.complement || customer.complement
      }
    });

    return { customer: updated };
  }

  // ============================================================
  // ORDER - Criação, status, histórico, cancelamento
  // ============================================================

  async createOrder(restaurantId, args, customerPhone) {
    try {
      let calculatedTotal = 0;
      const orderItemsData = [];

      for (const item of args.items) {
        const quantity = Number(item.quantity) || 1;

        const dbProduct = await prisma.product.findFirst({
          where: {
            restaurantId,
            isAvailable: true,
            OR: [
              ...(item.productId ? [{ id: item.productId }] : []),
              { name: { contains: item.name, mode: 'insensitive' } }
            ]
          },
          include: {
            sizes: { include: { globalSize: true } },
            addonGroups: { include: { addons: true } }
          }
        });

        if (!dbProduct) {
          return { error: `Produto "${item.name}" não encontrado.` };
        }

        if (!dbProduct.isAvailable) {
          return { error: `Produto "${dbProduct.name}" não disponível.` };
        }

        let itemPrice = dbProduct.price;
        let sizeJson = null;

        if (dbProduct.sizes.length > 0) {
          const selectedSize = dbProduct.sizes.find(s =>
            (s.name && item.size && s.name.toLowerCase().includes(item.size.toLowerCase())) ||
            (s.globalSize?.name && item.size && s.globalSize.name.toLowerCase().includes(item.size.toLowerCase()))
          );

          if (selectedSize) {
            itemPrice = selectedSize.price;
            sizeJson = JSON.stringify({ name: selectedSize.name || selectedSize.globalSize?.name, price: itemPrice });
          } else if (item.size) {
            return { error: `Tamanho "${item.size}" não existe. Opções: ${dbProduct.sizes.map(s => s.name || s.globalSize?.name).join(', ')}.` };
          }
        }

        let addonsTotal = 0;
        const selectedAddons = [];
        if (item.addons && item.addons.length > 0) {
          for (const addonName of item.addons) {
            let found = false;
            for (const group of dbProduct.addonGroups) {
              const addon = group.addons.find(a => a.name.toLowerCase() === addonName.toLowerCase());
              if (addon) {
                addonsTotal += addon.price;
                selectedAddons.push({ name: addon.name, price: addon.price });
                found = true;
                break;
              }
            }
            if (!found) {
              return { error: `Adicional "${addonName}" não encontrado.` };
            }
          }
        }

        calculatedTotal += (itemPrice + addonsTotal) * quantity;

        orderItemsData.push({
          productId: dbProduct.id,
          quantity,
          priceAtTime: itemPrice + addonsTotal,
          observations: item.observations || '',
          sizeJson,
          addonsJson: selectedAddons.length > 0 ? JSON.stringify(selectedAddons) : null
        });
      }

      const restaurantInfo = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        include: { settings: true }
      });

      const deliveryFee = args.orderType === 'DELIVERY' ? (restaurantInfo?.settings?.deliveryFee || 0) : 0;
      calculatedTotal += deliveryFee;

      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const existingOrder = await prisma.order.findFirst({
        where: {
          restaurantId,
          customerName: args.customerName,
          createdAt: { gte: twoMinutesAgo },
          deliveryOrder: {
            phone: normalizePhone(customerPhone),
            deliveryType: args.orderType.toLowerCase()
          }
        }
      });

      if (existingOrder) {
        return { duplicate: true, orderId: existingOrder.id };
      }

      const newOrder = await prisma.order.create({
        data: {
          restaurant: { connect: { id: restaurantId } },
          status: 'PENDING',
          orderType: 'DELIVERY',
          total: Number(calculatedTotal.toFixed(2)),
          customerName: args.customerName,
          items: {
            create: orderItemsData.map(i => ({
              productId: i.productId,
              quantity: i.quantity,
              priceAtTime: i.priceAtTime,
              observations: i.observations,
              sizeJson: i.sizeJson,
              addonsJson: i.addonsJson
            }))
          },
          deliveryOrder: {
            create: {
              name: args.customerName,
              address: args.deliveryAddress || 'Retirada',
              phone: normalizePhone(customerPhone),
              deliveryType: args.orderType.toLowerCase(),
              paymentMethod: args.paymentMethod,
              changeFor: args.changeFor || 0,
              deliveryFee,
              notes: args.notes || null
            }
          }
        },
        include: { deliveryOrder: true, items: { include: { product: true } } }
      });

      socketLib.emitToRestaurant(restaurantId, 'new_order', newOrder);

      return { order: newOrder };
    } catch (error) {
      logger.error('[Executor CREATE ORDER ERROR]', error);
      return { error: `Erro ao criar pedido: ${error.message}` };
    }
  }

  async checkOrderStatus(restaurantId, orderId, phone) {
    try {
      let order;

      if (orderId) {
        order = await prisma.order.findUnique({
          where: { id: orderId, restaurantId },
          include: { deliveryOrder: true, items: { include: { product: true } } }
        });
      } else {
        const searchPhone = normalizePhone(phone);
        order = await prisma.order.findFirst({
          where: {
            restaurantId,
            deliveryOrder: { phone: { contains: searchPhone } }
          },
          orderBy: { createdAt: 'desc' },
          include: { deliveryOrder: true, items: { include: { product: true } } }
        });
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
      const searchPhone = normalizePhone(phone);

      const orders = await prisma.order.findMany({
        where: {
          restaurantId,
          deliveryOrder: { phone: { contains: searchPhone } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          items: { include: { product: true } },
          deliveryOrder: true
        }
      });

      if (orders.length === 0) {
        return { error: 'Nenhum pedido encontrado.' };
      }

      return { orders };
    } catch (error) {
      logger.error('[Executor HISTORY ERROR]', error);
      return { error: `Erro ao buscar histórico: ${error.message}` };
    }
  }

  async cancelOrder(restaurantId, orderId, phone, reason) {
    try {
      const searchPhone = normalizePhone(phone);

      const order = await prisma.order.findFirst({
        where: { id: orderId, restaurantId },
        include: { deliveryOrder: true }
      });

      if (!order) {
        return { error: `Pedido #${orderId} não encontrado.` };
      }

      if (order.deliveryOrder?.phone && !order.deliveryOrder.phone.includes(searchPhone.slice(-8))) {
        return { error: 'Pedido não pertence a este cliente.' };
      }

      const cancellableStatuses = ['BUILDING', 'PENDING'];
      if (!cancellableStatuses.includes(order.status)) {
        return { error: `Pedido já está em "${order.status}" e não pode ser cancelado.` };
      }

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELED',
          canceledAt: new Date()
        }
      });

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
    const query = neighborhood || address;
    if (!query) {
      return { error: 'Informe o endereço ou bairro.' };
    }

    const areas = await prisma.deliveryArea.findMany({
      where: { restaurantId, isActive: true }
    });

    if (areas.length === 0) {
      const settings = await prisma.restaurantSettings.findUnique({
        where: { restaurantId }
      });
      return { defaultFee: settings?.deliveryFee || 0, areas: [] };
    }

    const matchedArea = areas.find(a => 
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      query.toLowerCase().includes(a.name.toLowerCase())
    );

    if (matchedArea) {
      return { area: matchedArea };
    }

    const radiusArea = areas.find(a => a.type === 'RADIUS' && a.radius);
    if (radiusArea) {
      return { radius: radiusArea.radius / 1000 };
    }

    return { areas: areas.map(a => ({ name: a.name, fee: a.fee })) };
  }

  async getDeliveryFee(restaurantId, area = null) {
    if (area) {
      const deliveryArea = await prisma.deliveryArea.findFirst({
        where: { 
          restaurantId, 
          isActive: true,
          name: { contains: area, mode: 'insensitive' }
        }
      });

      if (deliveryArea) {
        return { area: deliveryArea.name, fee: deliveryArea.fee };
      }
    }

    const settings = await prisma.restaurantSettings.findUnique({
      where: { restaurantId }
    });

    const defaultFee = settings?.deliveryFee || 0;

    const areas = await prisma.deliveryArea.findMany({
      where: { restaurantId, isActive: true }
    });

    return { defaultFee, areas: areas.map(a => ({ name: a.name, fee: a.fee })) };
  }

  async getDeliveryTime(restaurantId) {
    const settings = await prisma.restaurantSettings.findUnique({
      where: { restaurantId }
    });

    return { deliveryTime: settings?.deliveryTime || '30-40 min' };
  }

  // ============================================================
  // PAYMENT - Métodos, troco
  // ============================================================

  async getPaymentMethods(restaurantId, orderType = null) {
    const methods = await prisma.paymentMethod.findMany({
      where: { 
        restaurantId, 
        isActive: true,
        ...(orderType === 'PICKUP' ? { allowPos: true } : { allowDelivery: true })
      },
      orderBy: { name: 'asc' }
    });

    return { methods };
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
    const settings = await prisma.restaurantSettings.findUnique({
      where: { restaurantId }
    });

    if (!settings?.loyaltyEnabled) {
      return { enabled: false };
    }

    return {
      enabled: true,
      pointsPerReal: settings.pointsPerReal || 1,
      cashbackPercentage: settings.cashbackPercentage || 0
    };
  }

  async getLoyaltyBalance(restaurantId, phone) {
    const normalizedPhone = normalizePhone(phone);

    const customer = await prisma.customer.findFirst({
      where: {
        restaurantId,
        phone: { contains: normalizedPhone.slice(-8) }
      }
    });

    if (!customer) {
      return { error: 'Cliente não encontrado.' };
    }

    return {
      name: customer.name,
      loyaltyPoints: customer.loyaltyPoints || 0,
      cashbackBalance: customer.cashbackBalance || 0
    };
  }

  // ============================================================
  // STORE INFO - Informações da loja
  // ============================================================

  async getStoreInfo(restaurantId, query) {
    const knowledge = await prisma.storeKnowledge.findMany({
      where: {
        restaurantId,
        isActive: true,
        OR: [
          { question: { contains: query, mode: 'insensitive' } },
          { answer: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 5
    });

    return { knowledge };
  }

  async getOperatingHours(restaurantId) {
    const settings = await prisma.restaurantSettings.findUnique({
      where: { restaurantId }
    });

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { name: true, openingHours: true }
    });

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

    return { hours, isOpenNow };
  }

  async getRestaurantInfo(restaurantId) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    });

    if (!restaurant) {
      return { error: 'Restaurante não encontrado.' };
    }

    return { restaurant };
  }
}

module.exports = new SkillExecutor();
