const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const SaiposService = require('./SaiposService');
const PricingService = require('./PricingService');
const InventoryService = require('./InventoryService');
const money = require('../utils/money');
const FinancialService = require('./FinancialService');
const LoyaltyService = require('./LoyaltyService');
const GeocodingService = require('./GeocodingService'); // Novo
const WhatsAppNotificationService = require('./WhatsAppNotificationService');
const { normalizePhone } = require('../lib/phoneUtils');
const socketLib = require('../lib/socket');
const OrderPlatformService = require('./OrderPlatformService');
const PaymentMethodResolver = require('./PaymentMethodResolver');
const IntegrationOrderService = require('./IntegrationOrderService');

const fullOrderInclude = {
  items: { 
    include: { 
      product: { 
        include: { 
          categories: true,
          addonGroups: { include: { addons: true } }
        } 
      } 
    } 
  },
  deliveryOrder: { include: { customer: true, driver: { select: { id: true, name: true } } } },
  user: { select: { name: true } },
  payments: true,
};

const summaryOrderSelect = {
  id: true,
  dailyOrderNumber: true,
  tableNumber: true,
  status: true,
  total: true,
  discount: true,
  extraCharge: true,
  orderType: true,
  createdAt: true,
  customerName: true,
  isPrinted: true,
  ifoodOrderId: true,
  deliveryOrder: {
    select: {
      name: true,
      phone: true,
      address: true,
      complement: true,
      reference: true,
      paymentMethod: true,
      deliveryFee: true,
      changeFor: true,
      notes: true,
      deliveryType: true,
      status: true,
      driver: { select: { name: true } }
    }
  },
  user: { select: { name: true } },
  payments: true,
  items: {
    select: {
      id: true,
      quantity: true,
      priceAtTime: true,
      observations: true,
      sizeJson: true,
      addonsJson: true,
      flavorsJson: true,
      product: {
        select: {
          name: true,
          categories: {
            select: {
              name: true
            }
          }
        }
      }
    }
  }
};

const eventEmitter = require('../lib/eventEmitter');

async function emitOrderUpdate(orderId, eventType = 'ORDER_UPDATED') {
  if (!orderId) return;
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: fullOrderInclude,
    });
    if (order) {
      const eventData = {
        eventType,
        restaurantId: order.restaurantId,
        payload: order,
      };

      // Emite via Socket.io para o canal do restaurante
      socketLib.emitToRestaurant(order.restaurantId, 'order_update', eventData);

      // Emite via EventEmitter para o SSE do OrderController
      eventEmitter.emit('order_update', eventData);
    }
  } catch (error) {
    logger.error(`[Socket/SSE] Failed to emit event for order ${orderId}:`, error);
  }
}

class OrderService {
  
  /**
   * Busca pedidos com seleção otimizada para listagem (Dashboard/Monitor).
   */
  async getOrders(restaurantId, filters = {}) {
    const { status, type, startDate, endDate, page = 1, limit = 100 } = filters;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      restaurantId,
      ...(status && { status }),
      ...(type && { orderType: type }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
    };

    return await prisma.order.findMany({
      where,
      select: summaryOrderSelect,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  /**
   * Método Privado: Processa itens do pedido (Preço + JSON)
   * Centraliza a lógica para evitar furos de cálculo entre criação e adição de itens.
   */
  async _processOrderItems(items) {
    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const allOptionsIds = [
          ...(item.addonsIds || []),
          ...(item.flavorIds || [])
      ];

      const calculation = await PricingService.calculateItemPrice(
        item.productId, 
        item.quantity, 
        item.sizeId, 
        allOptionsIds
      );
      
      subtotal = money.add(subtotal, calculation.totalPrice);

      const flavorsList = calculation.addonsObjects.filter(a => a.isFlavor);
      const addonsList = calculation.addonsObjects.filter(a => !a.isFlavor);

      processedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        priceAtTime: calculation.unitPrice,
        sizeJson: calculation.sizeObj ? JSON.stringify(calculation.sizeObj) : null,
        addonsJson: addonsList.length ? JSON.stringify(addonsList) : null,
        flavorsJson: flavorsList.length ? JSON.stringify(flavorsList) : null,
        observations: item.observations || ''
      });
    }

    return { processedItems, subtotal };
  }

  /**
   * Cria um pedido completo de forma transacional.
   */
  async createOrder({ restaurantId, items, orderType, deliveryInfo, tableNumber, paymentMethod, userId, customerName, discount = 0, extraCharge = 0 }) {
    logger.info(`[ORDER] Iniciando criação de pedido para restaurante: ${restaurantId}`);
    logger.info(`[ORDER] Itens recebidos: ${JSON.stringify(items, (key, val) => typeof val === 'object' ? val : String(val))}`);
    logger.info(`[ORDER] orderType: ${orderType}, deliveryInfo: ${JSON.stringify(deliveryInfo)}`);
    
    // 1. Preparação dos Itens (Utiliza método unificado)
    const { processedItems, subtotal: orderTotal } = await this._processOrderItems(items);

    const restaurant = await prisma.restaurant.findFirst({
        where: { OR: [{ id: restaurantId }, { slug: restaurantId }] },
        include: { settings: true }
    });

    if (!restaurant) {
        logger.error(`[ORDER ERROR] Restaurante não encontrado: ${restaurantId}`);
        throw new Error(`Restaurante não encontrado: ${restaurantId}`);
    }
    
    const realRestaurantId = restaurant.id;
    const isAutoAccept = restaurant.settings?.autoAcceptOrders || false;
    
    // Se tem userId (operador logado), vai direto para PREPARING
    const initialStatus = (userId || isAutoAccept) ? 'PREPARING' : 'PENDING';

    const finalOrderType = orderType === 'PICKUP' ? 'PICKUP' : 
                          (orderType === 'DELIVERY' && deliveryInfo?.deliveryType === 'retirada') ? 'PICKUP' : 
                          (deliveryInfo || orderType === 'DELIVERY') ? 'DELIVERY' : 'TABLE';

    // === VALIDAÇÕES DE DELIVERY ===
    if (finalOrderType === 'DELIVERY') {
        if (restaurant.settings && restaurant.settings.isOpen === false) {
            throw new Error('A loja está fechada para delivery no momento.');
        }

        const isDeliveryMode = deliveryInfo && deliveryInfo.deliveryType === 'delivery';
        if (isDeliveryMode && restaurant.settings && restaurant.settings.minOrderValue > 0) {
            if (orderTotal < restaurant.settings.minOrderValue) {
                throw new Error(`O valor mínimo para entrega é R$ ${restaurant.settings.minOrderValue.toFixed(2)}.`);
            }
        }
    }

    let coords = null;
    let fullAddress = 'Retirada no Balcão';

    if (finalOrderType === 'DELIVERY' && deliveryInfo) {
        const isDelivery = deliveryInfo.deliveryType === 'delivery';
        const addr = typeof deliveryInfo.address === 'object' ? deliveryInfo.address : {};
        
        if (isDelivery) {
            if (typeof deliveryInfo.address === 'object') {
                fullAddress = `${addr.street || ''}, ${addr.number || 'S/N'} - ${addr.neighborhood || ''}, ${addr.city || ''}/${addr.state || ''}`;
            } else {
                fullAddress = deliveryInfo.address || 'Endereço não informado';
            }
            logger.info(`[ORDER] Buscando coordenadas para: ${fullAddress}`);
            coords = await GeocodingService.getCoordinates(fullAddress);
        }
    }

    if (finalOrderType === 'PICKUP' && deliveryInfo) {
        fullAddress = 'Retirada no Balcão';
    }

    if (finalOrderType === 'TABLE' && tableNumber) {
        const existingOrder = await prisma.order.findFirst({
            where: {
                restaurantId: realRestaurantId,
                tableNumber: parseInt(tableNumber),
                status: { notIn: ['COMPLETED', 'CANCELED'] }
            }
        });

        if (existingOrder) {
            return await this.addItemsToOrder(existingOrder.id, items, userId);
        }
    }

    // Validar desconto antes de criar pedido
    const discountValidation = money.validateDiscount(parseFloat(discount) || 0, orderTotal);
    if (!discountValidation.valid) {
        throw new Error(discountValidation.reason || 'Desconto inválido');
    }

    // Validar troco (changeFor) deve ser >= total do pedido
    if (deliveryInfo?.deliveryType === 'delivery' && deliveryInfo?.changeFor) {
        const totalPedido = money.calcOrderTotal({
            subtotal: orderTotal,
            extraCharge,
            discount,
            deliveryFee: deliveryInfo?.deliveryFee
        });
        const changeFor = parseFloat(deliveryInfo.changeFor);
        if (changeFor < totalPedido) {
            throw new Error(`Valor do troco (R$ ${changeFor.toFixed(2)}) não pode ser menor que o total do pedido (R$ ${totalPedido.toFixed(2)})`);
        }
    }

    const orderData = {
      restaurantId: realRestaurantId,
      total: money.calcOrderTotal({ subtotal: orderTotal, extraCharge, discount, deliveryFee: deliveryInfo?.deliveryFee }),
      discount: parseFloat(discount),
      extraCharge: parseFloat(extraCharge),
      orderType: finalOrderType,
      status: initialStatus,
      pendingAt: initialStatus === 'PENDING' ? new Date() : null,
      preparingAt: initialStatus === 'PREPARING' ? new Date() : null,
      userId: userId || null, 
      customerName: customerName || null,
      items: { create: processedItems },
      tableNumber: (finalOrderType === 'TABLE' && tableNumber) ? parseInt(tableNumber) : null
    };

    logger.info(`[ORDER] Iniciando transação do banco de dados...`);
    const newOrder = await prisma.$transaction(async (tx) => {
        if (finalOrderType === 'DELIVERY' || finalOrderType === 'PICKUP') {
            const openSession = await tx.cashierSession.findFirst({
                where: { restaurantId: realRestaurantId, status: 'OPEN' },
                orderBy: { openedAt: 'desc' }
            });

            const startTime = openSession ? openSession.openedAt : new Date();
            if (!openSession) startTime.setHours(0, 0, 0, 0);

            // SELECT FOR UPDATE: Trava a linha do último pedido para evitar race conditions
            // Como o Prisma não suporta nativamente FOR UPDATE em findFirst, usamos queryRaw
            const lastOrders = await tx.$queryRaw`
                SELECT "dailyOrderNumber" FROM "Order" 
                WHERE "restaurantId" = ${realRestaurantId} 
                AND "orderType" IN ('DELIVERY', 'PICKUP')
                AND "createdAt" >= ${startTime}
                ORDER BY "dailyOrderNumber" DESC 
                LIMIT 1 
                FOR UPDATE
            `;

            const lastOrderNumber = lastOrders[0]?.dailyOrderNumber || 0;
            orderData.dailyOrderNumber = lastOrderNumber + 1;
        }

        const createdOrder = await tx.order.create({ data: orderData });

        if (finalOrderType === 'TABLE' && tableNumber) {
            await tx.table.updateMany({
                where: { number: parseInt(tableNumber), restaurantId: realRestaurantId },
                data: { status: 'occupied' }
            });
        }

        if ((finalOrderType === 'DELIVERY' || finalOrderType === 'PICKUP') && deliveryInfo) {
             const isDelivery = deliveryInfo.deliveryType === 'delivery';
             const isPickup = deliveryInfo.deliveryType === 'pickup' || deliveryInfo.deliveryType === 'retirada';
             const addr = typeof deliveryInfo.address === 'object' ? deliveryInfo.address : {};
const cleanPhone = deliveryInfo.phone ? normalizePhone(deliveryInfo.phone) : null;
              const customerName = deliveryInfo.name || 'Retirada Balcão';
              const hasValidPhone = cleanPhone && cleanPhone.length >= 8;

if (isPickup && !hasValidPhone) {
                   await tx.deliveryOrder.create({
                       data: {
                           orderId: createdOrder.id,
                           customerId: null,
                           name: customerName,
                           phone: null,
                           address: fullAddress,
                           complement: addr.complement || deliveryInfo.complement || null,
                           reference: addr.reference || deliveryInfo.reference || null,
                           deliveryType: deliveryInfo.deliveryType || 'retirada',
                           paymentMethod: deliveryInfo.paymentMethod || paymentMethod,
                           changeFor: deliveryInfo.changeFor ? parseFloat(deliveryInfo.changeFor) : null,
                           deliveryFee: 0,
                           notes: deliveryInfo.notes || null,
                           latitude: null,
                           longitude: null,
                           status: isAutoAccept ? 'CONFIRMED' : 'PENDING'
                       }
                   });
              } else {
                 const customer = await tx.customer.upsert({
                     where: { phone_restaurantId: { phone: cleanPhone, restaurantId: realRestaurantId } },
                     update: {
                         name: customerName,
                         address: fullAddress,
                         zipCode: addr.zipCode || addr.cep || deliveryInfo.cep || null,
                         street: addr.street || null,
                         number: addr.number || null,
                         neighborhood: addr.neighborhood || null,
                         city: addr.city || null,
                         state: addr.state || deliveryInfo.state || null,
                         complement: addr.complement || deliveryInfo.complement || null,
                         reference: addr.reference || deliveryInfo.reference || null,
                         latitude: coords?.lat || null,
                         longitude: coords?.lng || null
                     },
                     create: {
                         name: customerName,
                         phone: cleanPhone,
                         address: fullAddress,
                         zipCode: addr.zipCode || addr.cep || deliveryInfo.cep || null,
                         street: addr.street || null,
                         number: addr.number || null,
                         neighborhood: addr.neighborhood || null,
                         city: addr.city || null,
                         state: addr.state || deliveryInfo.state || null,
                         complement: addr.complement || deliveryInfo.complement || null,
                         reference: addr.reference || deliveryInfo.reference || null,
                         restaurantId: realRestaurantId,
                         latitude: coords?.lat || null,
                         longitude: coords?.lng || null
                     }
                 });

                  await tx.deliveryOrder.create({
                      data: {
                          orderId: createdOrder.id,
                          customerId: customer.id,
                          name: customerName,
                          phone: deliveryInfo.phone || null,
                          address: fullAddress,
                          complement: addr.complement || deliveryInfo.complement || null,
                          reference: addr.reference || deliveryInfo.reference || null,
                          deliveryType: deliveryInfo.deliveryType,
                          paymentMethod: deliveryInfo.paymentMethod || paymentMethod,
                          changeFor: deliveryInfo.changeFor ? parseFloat(deliveryInfo.changeFor) : null,
                          deliveryFee: isDelivery ? (deliveryInfo.deliveryFee || 0) : 0,
                          notes: deliveryInfo.notes || null,
                          latitude: coords?.lat || (deliveryInfo.latitude && !isNaN(parseFloat(deliveryInfo.latitude)) ? parseFloat(deliveryInfo.latitude) : null),
                          longitude: coords?.lng || (deliveryInfo.longitude && !isNaN(parseFloat(deliveryInfo.longitude)) ? parseFloat(deliveryInfo.longitude) : null),
                           status: isAutoAccept ? 'CONFIRMED' : 'PENDING'
                       }
                   });
              }
        }

        if (paymentMethod) {
            const finalFee = (finalOrderType === 'DELIVERY' && deliveryInfo?.deliveryFee) ? deliveryInfo.deliveryFee : 0;
            const totalToPay = money.calcOrderTotal({ subtotal: orderTotal, deliveryFee: finalFee, extraCharge, discount });

            await tx.payment.create({
                data: { orderId: createdOrder.id, amount: totalToPay, method: paymentMethod }
            });

            const openSession = await tx.cashierSession.findFirst({
                where: { restaurantId: realRestaurantId, status: 'OPEN' }
            });

            await FinancialService.processOrderPayment(realRestaurantId, {
                order: { ...createdOrder, total: totalToPay },
                paymentMethod,
                cashierId: openSession?.id,
                tx
            });
        }

        return await tx.order.findUnique({
            where: { id: createdOrder.id },
            include: { deliveryOrder: true }
        });
    }, { timeout: 30000 });

    SaiposService.sendOrderToSaipos(newOrder.id).catch(err => logger.error('[SAIPOS ERROR] Erro ao enviar pedido:', err));
    const finalOrder = await prisma.order.findUnique({ where: { id: newOrder.id }, include: fullOrderInclude });
    
    if (finalOrder && finalOrder.orderType === 'DELIVERY' && finalOrder.deliveryOrder?.phone) {
        WhatsAppNotificationService.notifyOrderUpdate(finalOrder.id, finalOrder.status).catch(err => logger.error('[WhatsApp Notification ERROR]:', err));
    }

    emitOrderUpdate(finalOrder.id, 'ORDER_CREATED');
    return finalOrder;
  }

  /**
   * Cria pedido a partir de integração externa (iFood, Uairango, etc).
   * 
   * Este é o ÚNICO ponto de criação de pedidos de integração.
   * Reutiliza a mesma lógica financeira do PDV (Payment + FinancialTransaction),
   * garantindo consistência no fechamento de caixa.
   * 
   * Os adapters (IfoodOrderAdapter, UairangoOrderAdapter) fazem APENAS tradução
   * de formato e chamam este método.
   */
  async createOrderFromIntegration({
    platform,           // 'ifood' | 'uairango'
    platformOrderId,    // ID externo (para idempotência)
    restaurantId,
    items,              // [{ name, price, quantity, observations, addons }]
    orderType,          // 'DELIVERY' | 'PICKUP'
    customer,           // { name, phone }
    deliveryData,       // { address, complement, neighborhood, city, state, zipCode, ... }
    payment,            // { rawMethod, isPrepaid, prepaidAmount, pendingAmount, changeFor }
    totals,             // { subtotal, deliveryFee, discount, total }
    notes,              // observações do pedido
  }) {
    logger.info(`[ORDER-INTEGRATION] Criando pedido ${platform}/${platformOrderId} para restaurante ${restaurantId}`);

    // ─── 1. IDEMPOTÊNCIA ────────────────────────────────────────────
    const eventType = 'ORDER_PLACED';

    const existingEvent = await prisma.integrationEvent.findUnique({
      where: {
        platform_platformOrderId_eventType: {
          platform,
          platformOrderId,
          eventType,
        },
      },
    });

    if (existingEvent?.status === 'PROCESSED' && existingEvent?.orderId) {
      logger.info(`[ORDER-INTEGRATION] Evento ${platformOrderId} (${platform}) já processado`);
      const existingOrder = await prisma.order.findUnique({
        where: { id: existingEvent.orderId },
        include: fullOrderInclude,
      });
      return { order: existingOrder, isReplayed: true };
    }

    // Verificar pedido existente por ID da plataforma
    const platformField = platform === 'ifood' ? 'ifoodOrderId' : 'uairangoOrderId';
    const existingOrder = await prisma.order.findFirst({
      where: { restaurantId, [platformField]: platformOrderId },
    });

    if (existingOrder) {
      logger.info(`[ORDER-INTEGRATION] Pedido ${platformOrderId} já existe (ID: ${existingOrder.id})`);
      if (existingEvent) {
        await prisma.integrationEvent.update({
          where: { id: existingEvent.id },
          data: { status: 'PROCESSED', orderId: existingOrder.id, processedAt: new Date() },
        });
      }
      return { order: existingOrder, isReplayed: true };
    }

    // ─── 2. RESOLVER FORMA DE PAGAMENTO (CENTRALIZADO) ──────────────
    const resolvedPaymentType = PaymentMethodResolver.resolveType(payment?.rawMethod);
    const paymentDisplayLabel = PaymentMethodResolver.getDisplayLabel(resolvedPaymentType);
    const isPrepaid = payment?.isPrepaid || false;
    const prepaidAmount = parseFloat(payment?.prepaidAmount) || 0;
    const pendingAmount = parseFloat(payment?.pendingAmount) || 0;

    logger.info(`[ORDER-INTEGRATION] Pagamento: ${payment?.rawMethod} → ${resolvedPaymentType} (prepaid: ${isPrepaid}, R$${prepaidAmount})`);

    // ─── 3. FIND/CREATE PRODUTOS E CLIENTE ──────────────────────────
    const orderItems = [];
    for (const item of items) {
      const product = await this._findOrCreateIntegrationProduct(restaurantId, item);
      
      const addonsData = (item.addons || []).map(addon => ({
        name: addon.name,
        price: parseFloat(addon.price) || 0,
        quantity: parseInt(addon.quantity) || 1,
      }));

      orderItems.push({
        productId: product.id,
        quantity: parseInt(item.quantity) || 1,
        priceAtTime: parseFloat(item.price) || product.price,
        observations: item.observations || null,
        addonsJson: addonsData.length > 0 ? JSON.stringify(addonsData) : null,
        sizeJson: item.sizeJson || null,
        flavorsJson: item.flavorsJson || null,
      });
    }

    let localCustomer = null;
    if (customer?.phone) {
      const cleanPhone = customer.phone.replace(/\D/g, '');
      if (cleanPhone.length >= 8) {
        localCustomer = await prisma.customer.upsert({
          where: { phone_restaurantId: { phone: cleanPhone, restaurantId } },
          update: {
            name: customer.name || 'Cliente',
            address: deliveryData?.address || undefined,
            neighborhood: deliveryData?.neighborhood || undefined,
            city: deliveryData?.city || undefined,
            state: deliveryData?.state || undefined,
            zipCode: deliveryData?.zipCode || undefined,
            complement: deliveryData?.complement || undefined,
            reference: deliveryData?.reference || undefined,
          },
          create: {
            name: customer.name || 'Cliente',
            phone: cleanPhone,
            address: deliveryData?.address || null,
            neighborhood: deliveryData?.neighborhood || null,
            city: deliveryData?.city || null,
            state: deliveryData?.state || null,
            zipCode: deliveryData?.zipCode || null,
            complement: deliveryData?.complement || null,
            reference: deliveryData?.reference || null,
            restaurantId,
          },
        });
      }
    }

    // ─── 4. TRANSAÇÃO ATÔMICA (Pedido + Payment + Financial) ────────
    const finalTotal = parseFloat(totals?.total) || 0;
    const finalDiscount = parseFloat(totals?.discount) || 0;
    const finalDeliveryFee = parseFloat(totals?.deliveryFee) || 0;

    const order = await prisma.$transaction(async (tx) => {
      // Numeração diária (mesma lógica do PDV)
      const openSession = await tx.cashierSession.findFirst({
        where: { restaurantId, status: 'OPEN' },
        orderBy: { openedAt: 'desc' },
      });

      const startTime = openSession ? openSession.openedAt : new Date();
      if (!openSession) startTime.setHours(0, 0, 0, 0);

      const lastOrders = await tx.$queryRaw`
        SELECT "dailyOrderNumber" FROM "Order" 
        WHERE "restaurantId" = ${restaurantId} 
        AND "orderType" IN ('DELIVERY', 'PICKUP')
        AND "createdAt" >= ${startTime}
        ORDER BY "dailyOrderNumber" DESC 
        LIMIT 1 
        FOR UPDATE
      `;
      const dailyOrderNumber = (lastOrders[0]?.dailyOrderNumber || 0) + 1;

      // Criar pedido
      const createdOrder = await tx.order.create({
        data: {
          dailyOrderNumber,
          status: 'PENDING',
          total: finalTotal,
          discount: finalDiscount,
          extraCharge: finalDeliveryFee,
          orderType: orderType === 'PICKUP' ? 'PICKUP' : 'DELIVERY',
          restaurantId,
          isPrinted: false,
          pendingAt: new Date(),
          ifoodOrderId: platform === 'ifood' ? platformOrderId : null,
          uairangoOrderId: platform === 'uairango' ? platformOrderId : null,
          items: { create: orderItems },
        },
        include: { items: true },
      });

      // Criar DeliveryOrder (se DELIVERY)
      if ((orderType === 'DELIVERY' || deliveryData) && deliveryData) {
        await tx.deliveryOrder.create({
          data: {
            orderId: createdOrder.id,
            customerId: localCustomer?.id || null,
            name: customer?.name || 'Cliente',
            phone: customer?.phone || null,
            address: deliveryData.address || '',
            complement: deliveryData.complement || '',
            reference: deliveryData.reference || '',
            neighborhood: deliveryData.neighborhood || '',
            city: deliveryData.city || '',
            state: deliveryData.state || '',
            zipCode: deliveryData.zipCode || '',
            deliveryType: deliveryData.deliveryType || 'delivery',
            paymentMethod: resolvedPaymentType, // SEMPRE type padronizado
            changeFor: payment?.changeFor ? parseFloat(payment.changeFor) : null,
            deliveryFee: finalDeliveryFee,
            notes: notes || '',
            latitude: deliveryData.latitude || null,
            longitude: deliveryData.longitude || null,
            status: 'PENDING',
          },
        });
      }

      // ─── CRIAR PAYMENT (MESMO PADRÃO DO PDV) ─────────────────────
      if (isPrepaid && prepaidAmount > 0) {
        // Pagamento online - já pago no app
        await tx.payment.create({
          data: {
            orderId: createdOrder.id,
            amount: prepaidAmount,
            method: resolvedPaymentType,
          },
        });

        // Criar transação financeira (igual PDV - linha 432 do createOrder)
        await FinancialService.processOrderPayment(restaurantId, {
          order: { ...createdOrder, total: prepaidAmount, dailyOrderNumber },
          paymentMethod: resolvedPaymentType,
          cashierId: openSession?.id,
          tx,
        });

        logger.info(`[ORDER-INTEGRATION] Payment PREPAID criado: R$${prepaidAmount} (${resolvedPaymentType}) no caixa ${openSession?.id || 'NENHUM'}`);
      }

      if (pendingAmount > 0) {
        // Pagamento pendente - será pago na entrega
        await tx.payment.create({
          data: {
            orderId: createdOrder.id,
            amount: pendingAmount,
            method: resolvedPaymentType,
          },
        });
        // NÃO cria FinancialTransaction - será criado no COMPLETED ou no acerto do motoboy
        logger.info(`[ORDER-INTEGRATION] Payment PENDING criado: R$${pendingAmount} (${resolvedPaymentType})`);
      }

      // Se não tem prepaid nem pending, criar payment com total (offline puro)
      if (!isPrepaid && pendingAmount === 0 && finalTotal > 0) {
        await tx.payment.create({
          data: {
            orderId: createdOrder.id,
            amount: finalTotal,
            method: resolvedPaymentType,
          },
        });
        // NÃO cria FinancialTransaction - será criado no COMPLETED
        logger.info(`[ORDER-INTEGRATION] Payment OFFLINE criado: R$${finalTotal} (${resolvedPaymentType})`);
      }

      // ─── REGISTRAR EVENTO DE INTEGRAÇÃO ──────────────────────────
      await tx.integrationEvent.upsert({
        where: {
          platform_platformOrderId_eventType: {
            platform,
            platformOrderId,
            eventType,
          },
        },
        create: {
          id: `${platform}_${platformOrderId}_${eventType}_${Date.now()}`,
          platform,
          platformOrderId,
          eventType,
          restaurantId,
          orderId: createdOrder.id,
          status: 'PROCESSED',
          processedAt: new Date(),
        },
        update: {
          orderId: createdOrder.id,
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });

      return createdOrder;
    }, { timeout: 30000 });

    logger.info(`[ORDER-INTEGRATION] Pedido ${order.id} criado (${platform}/${platformOrderId}, #${order.dailyOrderNumber})`);

    // ─── 5. EMITIR EVENTOS (fora da transação) ─────────────────────
    const finalOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: fullOrderInclude,
    });

    emitOrderUpdate(finalOrder.id, 'ORDER_CREATED');

    return { order: finalOrder, isReplayed: false };
  }

  /**
   * Busca ou cria produto a partir de dados de integração.
   * Usado por createOrderFromIntegration.
   */
  async _findOrCreateIntegrationProduct(restaurantId, item) {
    const name = item.name || `Item Integração (${item.externalId || 'diversos'})`;
    const price = parseFloat(item.price) || 0;

    let product = await prisma.product.findFirst({
      where: {
        restaurantId,
        name: { equals: name, mode: 'insensitive' },
      },
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          name,
          description: `Produto importado via integração`,
          price,
          restaurantId,
          isAvailable: true,
        },
      });
      logger.info(`[ORDER-INTEGRATION] Produto criado: ${product.id} - ${name}`);
    }

    return product;
  }

  /**
   * Adiciona itens a um pedido existente
   */
  async addItemsToOrder(orderId, items, userId = null) {
    logger.info(`[ORDER] Adicionando itens ao pedido: ${orderId}`);

    const originalOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { restaurant: { include: { settings: true } } }
    });

    if (!originalOrder) throw new Error("Pedido não encontrado.");

    // Utiliza método unificado de processamento de itens
    const { processedItems, subtotal: additionalTotal } = await this._processOrderItems(items);

    const result = await prisma.$transaction(async (tx) => {
        // Vincula o orderId aos itens processados
        const itemsWithOrderId = processedItems.map(item => ({ ...item, orderId }));
        
        await tx.orderItem.createMany({ data: itemsWithOrderId });
        
        const isAutoAccept = originalOrder.restaurant.settings?.autoAcceptOrders || false;
        const newStatus = isAutoAccept ? 'PREPARING' : 'PENDING';
        
        const updateData = { 
            total: money.add(originalOrder.total, additionalTotal), 
            status: originalOrder.status === 'COMPLETED' ? 'COMPLETED' : newStatus,
            userId 
        };

        if (originalOrder.status !== 'COMPLETED') {
            if (newStatus === 'PENDING') updateData.pendingAt = new Date();
            if (newStatus === 'PREPARING') updateData.preparingAt = new Date();
        }
        
        return await tx.order.update({
            where: { id: orderId },
            data: updateData,
            include: fullOrderInclude
        });
    });

    SaiposService.sendOrderToSaipos(orderId).catch(err => logger.error('[SAIPOS] AddItems Error:', err));
    emitOrderUpdate(result.id);
    return result;
  }

  /**
   * Atualiza o status do pedido e dispara eventos de fim de ciclo (Estoque, Financeiro, Fidelidade)
   */
  async updateOrderStatus(orderId, status) {
    const updatedOrder = await prisma.$transaction(async (tx) => {
        const updateData = { status };
        
        switch(status) {
            case 'PENDING': updateData.pendingAt = new Date(); break;
            case 'PREPARING': updateData.preparingAt = new Date(); break;
            case 'READY': updateData.readyAt = new Date(); break;
            case 'SHIPPED': updateData.shippedAt = new Date(); break;
            case 'DELIVERED': updateData.deliveredAt = new Date(); break;
            case 'COMPLETED': updateData.completedAt = new Date(); break;
            case 'CANCELED': 
                updateData.canceledAt = new Date(); 
                break;
        }

        const order = await tx.order.update({
            where: { id: orderId }, 
            data: updateData, 
            include: { deliveryOrder: true, payments: true }
        });

        if (status === 'CANCELED') {
            const canceledTrans = await tx.financialTransaction.findFirst({ where: { orderId: orderId } });
            if (canceledTrans) {
                await tx.financialTransaction.create({
                    data: {
                        restaurantId: order.restaurantId,
                        cashierId: canceledTrans.cashierId,
                        orderId: orderId,
                        description: `CANCELAMENTO PEDIDO #${order.dailyOrderNumber || orderId}`,
                        amount: canceledTrans.amount,
                        type: 'EXPENSE',
                        status: 'PAID',
                        paymentMethod: canceledTrans.paymentMethod,
                        dueDate: new Date(),
                        paymentDate: new Date()
                    }
                });
            }
        }

        if (order.orderType === 'DELIVERY' && order.deliveryOrder) {
            let deliveryStatus = 'PENDING';
            if (status === 'PREPARING' || status === 'READY') deliveryStatus = 'CONFIRMED';
            if (status === 'SHIPPED') deliveryStatus = 'OUT_FOR_DELIVERY';
            if (status === 'DELIVERED' || status === 'COMPLETED') deliveryStatus = 'DELIVERED';
            if (status === 'CANCELED') deliveryStatus = 'CANCELED';
            await tx.deliveryOrder.update({ where: { orderId }, data: { status: deliveryStatus } });
        }

        if (status === 'COMPLETED') {
            await LoyaltyService.processLoyaltyRewards(order, tx);
            
            const openSession = await tx.cashierSession.findFirst({ 
                where: { restaurantId: order.restaurantId, status: 'OPEN' } 
            });

            const rawMethod = order.deliveryOrder?.paymentMethod || order.payments?.[0]?.method || 'CASH';
            const method = PaymentMethodResolver.resolveType(rawMethod);
            const existingTrans = await tx.financialTransaction.findFirst({ where: { orderId: order.id } });
            
            if (!existingTrans) {
                await FinancialService.processOrderPayment(order.restaurantId, {
                    order,
                    paymentMethod: method,
                    cashierId: openSession?.id,
                    tx
                });
            }
            await InventoryService.processOrderStockDeduction(orderId, tx);
        }
        return order;
    });

    if (status === 'COMPLETED') {
        this._triggerAutomaticInvoice(updatedOrder).catch(err => logger.error('[FISCAL BACKGROUND]', err));
    }
    
    OrderPlatformService.syncStatus(updatedOrder, status).catch(err => logger.error('[Platform Sync] Error:', err));
    
    emitOrderUpdate(updatedOrder.id);
    WhatsAppNotificationService.notifyOrderUpdate(updatedOrder.id, status).catch(err => logger.error('[WhatsApp Notification] Error:', err));
    return await prisma.order.findUnique({ where: { id: updatedOrder.id }, include: fullOrderInclude });
  }

  async transferTable(currentTableNumber, targetTableNumber, restaurantId) {
    const currentOrder = await prisma.order.findFirst({
        where: { restaurantId, tableNumber: parseInt(currentTableNumber), status: { notIn: ['COMPLETED', 'CANCELED'] } }
    });
    if (!currentOrder) throw new Error("Não há pedido aberto na mesa de origem.");
    
    const targetOrderInitialState = await prisma.order.findFirst({
        where: { restaurantId, tableNumber: parseInt(targetTableNumber), status: { notIn: ['COMPLETED', 'CANCELED'] } }
    });

    const result = await prisma.$transaction(async (tx) => {
        if (targetOrderInitialState) {
            await tx.orderItem.updateMany({ where: { orderId: currentOrder.id }, data: { orderId: targetOrderInitialState.id } });
            await tx.order.update({ where: { id: targetOrderInitialState.id }, data: { total: money.add(targetOrderInitialState.total, currentOrder.total) } });
            await tx.order.update({ where: { id: currentOrder.id }, data: { status: 'CANCELED', total: 0 } });
            await tx.table.updateMany({ where: { number: parseInt(currentTableNumber), restaurantId }, data: { status: 'free' } });
            return targetOrderInitialState;
        } else {
            const updatedOrder = await tx.order.update({ where: { id: currentOrder.id }, data: { tableNumber: parseInt(targetTableNumber) } });
            await tx.table.updateMany({ where: { number: parseInt(currentTableNumber), restaurantId }, data: { status: 'free' } });
            await tx.table.updateMany({ where: { number: parseInt(targetTableNumber), restaurantId }, data: { status: 'occupied' } });
            return updatedOrder;
        }
    });

    emitOrderUpdate(currentOrder.id);
    emitOrderUpdate(result.id);
    return result;
  }

  async transferItems(sourceOrderId, targetTableNumber, itemIds, restaurantId, userId) {
    const sourceOrder = await prisma.order.findUnique({ where: { id: sourceOrderId }, include: { items: true } });
    if (!sourceOrder) throw new Error("Pedido de origem não encontrado.");
    
    const itemsToTransfer = sourceOrder.items.filter(item => itemIds.includes(item.id));
    if (itemsToTransfer.length === 0) throw new Error("Nenhum item válido selecionado.");
    
    const transferTotal = itemsToTransfer.reduce((acc, item) => money.add(acc, money.multiply(item.priceAtTime, item.quantity)), 0);

    const result = await prisma.$transaction(async (tx) => {
        let targetOrder = await tx.order.findFirst({
            where: { restaurantId, tableNumber: parseInt(targetTableNumber), status: { notIn: ['COMPLETED', 'CANCELED'] } }
        });
        
        if (!targetOrder) {
             targetOrder = await tx.order.create({
                data: { restaurantId, tableNumber: parseInt(targetTableNumber), status: 'PENDING', total: 0, orderType: 'TABLE', dailyOrderNumber: null, userId }
            });
            await tx.table.updateMany({ where: { number: parseInt(targetTableNumber), restaurantId }, data: { status: 'occupied' } });
        }

        await tx.orderItem.updateMany({ where: { id: { in: itemIds } }, data: { orderId: targetOrder.id } });
        await tx.order.update({ where: { id: sourceOrderId }, data: { total: { decrement: transferTotal } } });
        await tx.order.update({ where: { id: targetOrder.id }, data: { total: { increment: transferTotal } } });
        return targetOrder;
    });

    emitOrderUpdate(sourceOrderId);
    emitOrderUpdate(result.id);
    return result;
  }

  async removeItemFromOrder(orderId, itemId) {
    const item = await prisma.orderItem.findUnique({ where: { id: itemId } });
    if (!item || item.orderId !== orderId) throw new Error("Item inválido.");
    
    const itemTotal = money.multiply(item.priceAtTime, item.quantity);
    
    const result = await prisma.$transaction(async (tx) => {
        await tx.orderItem.delete({ where: { id: itemId } });
        const updatedOrder = await tx.order.update({ where: { id: orderId }, data: { total: { decrement: itemTotal } }, include: { items: true } });
        if (updatedOrder.total < 0) await tx.order.update({ where: { id: orderId }, data: { total: 0 } });
        return updatedOrder;
    });
    
    emitOrderUpdate(orderId);
    return result;
  }

  async finishKdsItem(itemId) {
    const updatedItem = await prisma.orderItem.update({ where: { id: itemId }, data: { isReady: true }, include: { order: true } });
    const orderItems = await prisma.orderItem.findMany({ where: { orderId: updatedItem.orderId } });
    
    if (orderItems.every(item => item.isReady)) {
        await this.updateOrderStatus(updatedItem.orderId, 'READY');
    } else {
        emitOrderUpdate(updatedItem.orderId);
    }

    return updatedItem;
  }

  async markAsPrinted(orderId) { 
      const order = await prisma.order.update({ where: { id: orderId }, data: { isPrinted: true } });
      emitOrderUpdate(orderId);
      return order;
  }

  async updatePaymentMethod(orderId, newMethod, restaurantId) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Pedido não encontrado");

    const payments = await prisma.payment.findMany({ where: { orderId } });

    const result = await prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({ where: { orderId }, data: { method: newMethod } });
      await tx.deliveryOrder.updateMany({ where: { orderId }, data: { paymentMethod: newMethod } });

      await tx.financialTransaction.updateMany({
        where: { 
          orderId,
          type: 'INCOME',
          status: 'PAID',
          description: { startsWith: 'VENDA' }
        },
        data: { paymentMethod: newMethod }
      });

      return { success: true };
    });

    logger.info(`[ORDER payment] alterado todos os pagamentos do pedido ${orderId}: ${payments.map(p => p.method).join(', ')} → ${newMethod}`);

    emitOrderUpdate(orderId);
    return result;
  }

  async updateSinglePaymentMethod(paymentId, newMethod) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new Error("Pagamento não encontrado");

    const oldMethod = payment.method;
    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: { method: newMethod }
    });

    const order = await prisma.order.findUnique({ 
      where: { id: payment.orderId },
      include: { deliveryOrder: true }
    });
    if (order?.deliveryOrder) {
      await prisma.deliveryOrder.updateMany({
        where: { orderId: payment.orderId },
        data: { paymentMethod: newMethod }
      });
    }

    await prisma.financialTransaction.updateMany({
      where: { 
        orderId: payment.orderId,
        type: 'INCOME',
        status: 'PAID',
        description: { startsWith: 'VENDA' }
      },
      data: { paymentMethod: newMethod }
    });

    logger.info(`[ORDER payment] Alterado ${paymentId}: ${oldMethod} → ${newMethod}, order: ${payment.orderId}`);

    if (order) emitOrderUpdate(order.id);
    return updated;
  }

  async updateOrderFinancials(orderId, { deliveryFee, total, discount, surcharge }) {
    logger.info(`[ORDER] Atualizando dados financeiros do pedido ${orderId}`);
    
    // Validar valores não negativos
    const parsedTotal = parseFloat(total);
    const parsedDiscount = parseFloat(discount) || 0;
    const parsedSurcharge = parseFloat(surcharge) || 0;
    const parsedDeliveryFee = parseFloat(deliveryFee) || 0;
    
    if (isNaN(parsedTotal) || parsedTotal < 0) {
        throw new Error('Total do pedido deve ser um valor positivo');
    }
    if (parsedDiscount < 0) {
        throw new Error('Desconto não pode ser negativo');
    }
    if (parsedSurcharge < 0) {
        throw new Error('Encargo extra não pode ser negativo');
    }
    if (parsedDeliveryFee < 0) {
        throw new Error('Taxa de entrega não pode ser negativa');
    }
    
    const result = await prisma.$transaction(async (tx) => {
        // 1. Atualiza o pedido principal (Order)
        const updatedOrder = await tx.order.update({
            where: { id: orderId },
            data: {
                total: parseFloat(total),
                discount: parseFloat(discount || 0),
                extraCharge: parseFloat(surcharge || 0)
            }
        });

        // 2. Se for um pedido de delivery, atualiza a taxa de entrega no DeliveryOrder
        await tx.deliveryOrder.updateMany({
            where: { orderId },
            data: {
                deliveryFee: parseFloat(deliveryFee || 0)
            }
        });

        return updatedOrder;
    });

    await emitOrderUpdate(orderId);
    return result;
  }

  async addPaymentToOrder(orderId, { amount, method }) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Pedido não encontrado");

    // Verificar se pedido iFood já foi pago online - bloquear duplicação
    if (order.ifoodOrderId) {
      const existingPayments = await prisma.payment.findMany({
        where: { orderId }
      });
      
      // Se já tem pagamento com "Pago Online", não permitir adicionar
      const hasOnlinePayment = existingPayments.some(p => 
        p.method?.includes('Pago Online') || p.method?.includes('pago online')
      );
      
      if (hasOnlinePayment) {
        throw new Error("Este pedido já foi pago via iFood. Não é possível adicionar pagamento manualmente.");
      }
      
      // Se tem payment com valor = total do pedido, já foi pago
      const totalPaid = existingPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      if (totalPaid >= order.total) {
        throw new Error("Este pedido já foi pago integralmente. Não é possível adicionar pagamento manualmente.");
      }
    }

    const restaurantId = order.restaurantId;
    const openSession = await prisma.cashierSession.findFirst({
      where: { restaurantId, status: 'OPEN' }
    });

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          orderId,
          amount: parseFloat(amount),
          method
        }
      });

      const category = await tx.transactionCategory.findFirst({
        where: { restaurantId, name: 'Vendas' }
      });

      await tx.financialTransaction.create({
        data: {
          restaurantId,
          orderId,
          cashierId: openSession?.id,
          categoryId: category?.id,
          description: `VENDA ADICIONAL #${order.dailyOrderNumber || order.id.slice(-4)}`,
          amount: parseFloat(amount),
          type: 'INCOME',
          status: 'PAID',
          dueDate: new Date(),
          paymentDate: new Date(),
          paymentMethod: method
        }
      });

      return payment;
    });

    emitOrderUpdate(orderId);
    return result;
  }

  async removePaymentFromOrder(paymentId) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new Error('Pagamento não encontrado.');

    const order = await prisma.order.findUnique({ where: { id: payment.orderId } });
    if (!order) throw new Error("Pedido não encontrado");

    const restaurantId = order.restaurantId;
    const openSession = await prisma.cashierSession.findFirst({
      where: { restaurantId, status: 'OPEN' }
    });

    const existingTransactions = await prisma.financialTransaction.findMany({
      where: { orderId: payment.orderId, amount: payment.amount, paymentMethod: payment.method }
    });

    await prisma.$transaction(async (tx) => {
      if (existingTransactions.length > 0) {
        for (const ft of existingTransactions) {
          await tx.financialTransaction.updateMany({
            where: { id: ft.id },
            data: { status: 'CANCELED' }
          });
        }
      }

      await tx.payment.delete({ where: { id: paymentId } });
    });

    logger.info(`[ORDER payment] Removido ${paymentId}: ${payment.method} R$ ${payment.amount}, order: ${payment.orderId}, FTs canceladas: ${existingTransactions.length}`);

    emitOrderUpdate(payment.orderId);
    return { success: true };
  }

  async updateOrderCustomer(orderId, customerData) {
    const order = await prisma.order.findUnique({ 
        where: { id: orderId },
        include: { deliveryOrder: true }
    });
    
    if (order.deliveryOrder) {
        await prisma.deliveryOrder.update({
            where: { id: order.deliveryOrder.id },
            data: {
                name: customerData.name,
                phone: customerData.phone,
                address: customerData.address,
                complement: customerData.complement || null,
                reference: customerData.reference || null
            }
        });
    }

    const updated = await prisma.order.update({
        where: { id: orderId },
        data: { customerName: customerData.name },
        include: fullOrderInclude
    });

    emitOrderUpdate(orderId);
    return updated;
  }

  async updateDeliveryType(orderId, deliveryType, manualFee = null) {
    const order = await prisma.order.findUnique({ 
        where: { id: orderId }, 
        include: { 
            deliveryOrder: true, 
            restaurant: { include: { settings: true } } 
        } 
    });
    if (!order?.deliveryOrder) throw new Error('Pedido não encontrado.');
    
    let deliveryFee = manualFee !== null ? parseFloat(manualFee) : 0;
    
    if (manualFee === null && deliveryType === 'delivery') {
        deliveryFee = order.restaurant.settings?.deliveryFee || 0;
    }

    const oldFee = order.deliveryOrder.deliveryFee || 0;
    const updateData = { deliveryType, deliveryFee };
    if (deliveryType === 'pickup' || deliveryType === 'retirada') updateData.driverId = null;
    
    const result = await prisma.$transaction(async (tx) => {
        await tx.deliveryOrder.update({ where: { id: order.deliveryOrder.id }, data: updateData });
        const diff = money.subtract(deliveryFee, oldFee);
        return await tx.order.update({
            where: { id: orderId },
            data: { total: { increment: diff } },
            include: fullOrderInclude
        });
    });

    SaiposService.sendOrderToSaipos(orderId).catch(err => logger.error('[SAIPOS] UpdateDeliveryType Sync Error:', err));
    emitOrderUpdate(orderId);
    return result;
  }

  async getKdsItems(restaurantId, area) {
    const where = {
        order: {
            restaurantId,
            status: { in: ['PENDING', 'PREPARING'] }
        },
        isReady: false
    };

    if (area && area !== 'all') {
        where.product = { productionArea: area };
    }

    return await prisma.orderItem.findMany({
        where,
        include: {
            product: true,
            order: {
                select: {
                    id: true,
                    dailyOrderNumber: true,
                    tableNumber: true,
                    orderType: true,
                    createdAt: true,
                    customerName: true,
                    deliveryOrder: { select: { name: true } }
                }
            }
        },
        orderBy: { order: { createdAt: 'asc' } }
    });
  }

  getSaoPauloDate() {
    const now = new Date();
    return new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  }

  async getDriverSettlement(restaurantId, startDate, endDate, startTime, endTime) {
    if (!startDate || !endDate) {
      throw new Error("Parâmetros startDate e endDate são obrigatórios.");
    }

    const spNow = this.getSaoPauloDate();
    const startHour = startTime ? startTime : '00:00';
    const endHour = endTime ? endTime : '23:59:59';
    const [sh, sm] = startHour.split(':');
    const [eh, em] = endHour.split(':');

    const startStr = `${startDate}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00-03:00`;
    const endStr = `${endDate}T${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:59-03:00`;
    const start = new Date(startStr);
    const end = new Date(endStr);

    logger.info(`[SETTLEMENT] Buscando acertos de entregadores: restaurantId=${restaurantId}, periodo=${start.toISOString()} até ${end.toISOString()} (timezone: America/Sao_Paulo)`);

    const tenantPaymentMethods = await prisma.paymentMethod.findMany({
      where: { restaurantId },
      select: { id: true, name: true }
    });
    const paymentMethodMap = new Map(tenantPaymentMethods.map(pm => [pm.id.toLowerCase(), pm.name.toLowerCase()]));
    logger.info(`[SETTLEMENT] Métodos de pagamento do tenant carregados: ${tenantPaymentMethods.length}`);

    const resolvePaymentMethodName = (methodValue) => {
      if (!methodValue) return '';
      const normalized = methodValue.toLowerCase();
      if (normalized === 'cash' || normalized === 'pix' || normalized.includes('credit') || normalized.includes('debit')) {
        return normalized;
      }
      const resolved = paymentMethodMap.get(normalized);
      if (resolved) return resolved;
      return normalized;
    };

    const drivers = await prisma.user.findMany({
        where: { 
            restaurantId, 
            OR: [
                { roleRef: { permissions: { some: { name: 'delivery:manage' } } } },
                { permissions: { some: { name: 'delivery:manage' } } }
            ]
        },
        include: {
            deliveries: {
                where: {
                    status: 'DELIVERED',
                    order: { isSettled: false },
updatedAt: { gte: start, lte: end }
                },
                include: { order: { include: { payments: true } } }
            }
        }
    });

    logger.info(`[SETTLEMENT] Encontrados ${drivers.length} entregadores com entregas no período`);

    return drivers.filter(d => {
        if (d.deliveries.length === 0) return false;
        logger.info(`[SETTLEMENT] Entregador ${d.name}: ${d.deliveries.length} entregas`);
        d.deliveries.forEach((del, idx) => {
            const orderPayments = del.order?.payments || [];
            const paymentSummary = orderPayments.length > 0 
                ? orderPayments.map(p => `${resolvePaymentMethodName(p.method)}:${p.amount}`).join(', ')
                : del.paymentMethod;
            logger.info(`[SETTLEMENT]   Pedido ${idx + 1}: order.total=${del.order?.total}, deliveryFee=${del.deliveryFee}, payments=${paymentSummary}`);
        });
        return true;
    }).map(d => {
        let cash = 0; let card = 0; let pix = 0; let deliveryFees = 0; let totalOrdersValue = 0;
        d.deliveries.forEach(del => {
            const order = del.order; if (!order) return;
            
            deliveryFees = money.add(deliveryFees, del.deliveryFee || 0);
            totalOrdersValue = money.add(totalOrdersValue, order.total);
            
            const orderPayments = order.payments || [];
            if (orderPayments.length > 0) {
                orderPayments.forEach(p => {
                    const resolvedMethod = resolvePaymentMethodName(p.method);
                    const pAmount = p.amount || 0;
                    if (resolvedMethod.includes('dinheiro') || resolvedMethod.includes('cash')) {
                        cash = money.add(cash, pAmount);
                    } else if (resolvedMethod.includes('cart') || resolvedMethod.includes('card') || resolvedMethod.includes('deb') || resolvedMethod.includes('cred')) {
                        card = money.add(card, pAmount);
                    } else if (resolvedMethod.includes('pix')) {
                        pix = money.add(pix, pAmount);
                    } else {
                        cash = money.add(cash, pAmount);
                    }
                });
            } else {
                const method = del.paymentMethod?.toLowerCase() || '';
                const totalWithFee = order.total;
                if (method.includes('dinheiro') || method.includes('cash')) cash = money.add(cash, totalWithFee);
                else if (method.includes('cart') || method.includes('card') || method.includes('deb') || method.includes('cred')) card = money.add(card, totalWithFee);
                else if (method.includes('pix')) pix = money.add(pix, totalWithFee);
                else cash = money.add(cash, totalWithFee);
            }
        });
        const totalDeliveries = d.deliveries.length;
        const baseRate = Number(d.baseRate) || 0;
        const bonusPerDelivery = Number(d.bonusPerDelivery) || 0;
        const totalCommission = money.multiply(bonusPerDelivery, d.deliveries.length);
        const totalToPay = (baseRate > 0 || bonusPerDelivery > 0) 
            ? money.add(baseRate, totalCommission)
            : 0;
        
        const storeNet = (baseRate > 0 || bonusPerDelivery > 0) 
            ? money.subtract(totalOrdersValue, money.add(totalToPay, deliveryFees))
            : totalOrdersValue;
        
        logger.info(`[SETTLEMENT] Cálculos para ${d.name}: totalOrdersValue=${totalOrdersValue}, deliveryFees=${deliveryFees}, totalToPay=${totalToPay}, storeNet=${storeNet}`);
        
        return { driverId: d.id, driverName: d.name || d.email, totalOrders: totalDeliveries, cash, card, pix, deliveryFees, totalToPay, storeNet, baseRate, totalCommission };
    });
  }

  async payDriverSettlement(restaurantId, driverName, amount, startDate, endDate, driverId = null) {
      const activeCashier = await prisma.cashierSession.findFirst({ where: { restaurantId, status: 'OPEN' } });
      if (!activeCashier) throw new Error("Não é possível realizar acerto: Não há caixa aberto.");
      
      if (!startDate || !endDate) {
        throw new Error("Parâmetros startDate e endDate são obrigatórios.");
      }
      
      const startStr = `${startDate}T00:00:00-03:00`;
      const endStr = `${endDate}T23:59:59-03:00`;
      const start = new Date(startStr);
      const end = new Date(endStr);
      const deliveries = await prisma.deliveryOrder.findMany({
          where: { driverId, status: 'DELIVERED', order: { restaurantId, isSettled: false }, updatedAt: { gte: start, lte: end } },
          include: { order: { include: { payments: true } } }
      });
      if (deliveries.length === 0) throw new Error("Nenhum pedido pendente de acerto para este entregador na data informativa.");
      
      const tenantPaymentMethods = await prisma.paymentMethod.findMany({
        where: { restaurantId },
        select: { id: true, name: true }
      });
      const paymentMethodMap = new Map(tenantPaymentMethods.map(pm => [pm.id.toLowerCase(), pm.name.toLowerCase()]));
      
const resolvePaymentMethodName = (methodValue) => {
        if (!methodValue) return '';
        const normalized = methodValue.toLowerCase();
        if (normalized === 'cash' || normalized === 'pix' || normalized.includes('credit') || normalized.includes('debit')) {
          return normalized;
        }
        const resolved = paymentMethodMap.get(normalized);
        return resolved || normalized;
      };
      
      let cashCollected = 0;
      deliveries.forEach(del => {
          const order = del.order;
          if (!order) return;
          const orderPayments = order.payments || [];
          if (orderPayments.length > 0) {
              orderPayments.forEach(p => {
                  const resolvedMethod = resolvePaymentMethodName(p.method);
                  if (resolvedMethod.includes('dinheiro') || resolvedMethod.includes('cash')) {
                      cashCollected = money.add(cashCollected, p.amount || 0);
                  }
              });
          } else {
              const method = del.paymentMethod?.toLowerCase() || '';
              if (method.includes('dinheiro') || method.includes('cash')) {
                  cashCollected = money.add(cashCollected, order.total || 0);
              }
          }
      });
      cashCollected = Number(cashCollected) || 0;
      return await prisma.$transaction(async (tx) => {
          const orderIds = deliveries.map(d => d.orderId);
          await tx.order.updateMany({ where: { id: { in: orderIds } }, data: { isSettled: true, settledAt: new Date() } });
          let feeCategory = await tx.transactionCategory.findFirst({ where: { restaurantId, name: 'Pagamento de Entregador' } });
          if (!feeCategory) feeCategory = await tx.transactionCategory.create({ data: { name: 'Pagamento de Entregador', type: 'EXPENSE', isSystem: true, restaurantId } });
          let salesCategory = await tx.transactionCategory.findFirst({ where: { restaurantId, name: 'Venda de Delivery' } });
          if (!salesCategory) salesCategory = await tx.transactionCategory.create({ data: { name: 'Venda de Delivery', type: 'INCOME', isSystem: true, restaurantId } });
          if (cashCollected > 0) {
              await tx.financialTransaction.create({ data: { restaurantId, cashierId: activeCashier.id, description: `ENTRADA ACERTO [MOTOBOY: ${driverName}]: Dinheiro coletado em entregas`, amount: cashCollected, type: 'INCOME', status: 'PAID', paymentMethod: 'cash', categoryId: salesCategory.id, dueDate: new Date(), paymentDate: new Date() } });
          }
          return await tx.financialTransaction.create({ data: { restaurantId, cashierId: activeCashier.id, description: `PAGAMENTO ACERTO [MOTOBOY: ${driverName}]: Taxas de entrega/Comissões`, amount, type: 'EXPENSE', status: 'PAID', paymentMethod: 'cash', recipientUserId: driverId, categoryId: feeCategory.id, dueDate: new Date(), paymentDate: new Date() } });
      });
  }

  async _triggerAutomaticInvoice(order) {
      logger.info(`[FISCAL] Analisando pedido #${order.id} para emissão automática...`);
  }
}

module.exports = new OrderService();
module.exports.emitOrderUpdate = emitOrderUpdate;