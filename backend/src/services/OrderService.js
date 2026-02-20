const prisma = require('../lib/prisma');
const SaiposService = require('./SaiposService');
const PricingService = require('./PricingService');
const InventoryService = require('./InventoryService');
const LoyaltyService = require('./LoyaltyService');
const GeocodingService = require('./GeocodingService'); // Novo
const WhatsAppNotificationService = require('./WhatsAppNotificationService');
const { normalizePhone } = require('../lib/phoneUtils');
const socketLib = require('../lib/socket');

const fullOrderInclude = {
  items: { include: { product: { include: { categories: true } } } },
  deliveryOrder: { include: { customer: true, driver: { select: { id: true, name: true } } } },
  user: { select: { name: true } },
  payments: true,
};

async function emitOrderUpdate(orderId, eventType = 'ORDER_UPDATED') {
  if (!orderId) return;
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: fullOrderInclude,
    });
    if (order) {
      // Emite via Socket.io para o canal do restaurante
      socketLib.emitToRestaurant(order.restaurantId, 'order_update', {
        eventType,
        payload: order,
      });
    }
  } catch (error) {
    console.error(`[Socket] Failed to emit event for order ${orderId}:`, error);
  }
}

class OrderService {
  
  /**
   * Cria um pedido completo de forma transacional.
   */
  async createOrder({ restaurantId, items, orderType, deliveryInfo, tableNumber, paymentMethod, userId, customerName }) {
    let orderTotal = 0;
    const processedItems = [];

    // 1. Preparação dos Itens
    for (const item of items) {
      const calculation = await PricingService.calculateItemPrice(
        item.productId, 
        item.quantity, 
        item.sizeId, 
        item.addonsIds,
        item.flavorIds
      );

      orderTotal += calculation.totalPrice;

      processedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        priceAtTime: calculation.unitPrice,
        sizeJson: calculation.sizeObj ? JSON.stringify(calculation.sizeObj) : null,
        addonsJson: calculation.addonsObjects.length ? JSON.stringify(calculation.addonsObjects) : null,
        flavorsJson: calculation.flavorsObjects.length ? JSON.stringify(calculation.flavorsObjects) : null,
        observations: item.observations || ''
      });
    }

    const restaurant = await prisma.restaurant.findFirst({
        where: { OR: [{ id: restaurantId }, { slug: restaurantId }] },
        include: { settings: true }
    });

    if (!restaurant) throw new Error(`Restaurante não encontrado: ${restaurantId}`);
    
    const realRestaurantId = restaurant.id;
    const isAutoAccept = restaurant.settings?.autoAcceptOrders || false;
    const initialStatus = isAutoAccept ? 'PREPARING' : 'PENDING';

    // Determinar OrderType Real: Se tem deliveryInfo, É DELIVERY obrigatoriamente
    const finalOrderType = (deliveryInfo || orderType === 'DELIVERY' || orderType === 'PICKUP') ? 'DELIVERY' : 'TABLE';

    // Lógica para adicionar itens em pedido existente de mesa
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

    const orderData = {
      restaurantId: realRestaurantId,
      total: orderTotal,
      orderType: finalOrderType,
      status: initialStatus,
      // Timestamps de Performance
      pendingAt: initialStatus === 'PENDING' ? new Date() : null,
      preparingAt: initialStatus === 'PREPARING' ? new Date() : null,
      userId: userId || null, 
      customerName: customerName || null,
      items: { create: processedItems }
    };

    if (finalOrderType === 'TABLE' && tableNumber) {
        orderData.tableNumber = parseInt(tableNumber);
    } else {
        orderData.tableNumber = null; 
    }

    // 2. Transação de Criação
    const newOrder = await prisma.$transaction(async (tx) => {
        // Gerar número diário sequencial
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const lastOrder = await tx.order.findFirst({
            where: { restaurantId: realRestaurantId, createdAt: { gte: today } },
            orderBy: { dailyOrderNumber: 'desc' },
            select: { dailyOrderNumber: true }
        });

        orderData.dailyOrderNumber = (lastOrder?.dailyOrderNumber || 0) + 1;

        const createdOrder = await tx.order.create({ data: orderData });

        if (finalOrderType === 'TABLE' && tableNumber) {
            await tx.table.updateMany({
                where: { number: parseInt(tableNumber), restaurantId: realRestaurantId },
                data: { status: 'occupied' }
            });
        }

        // Processar Delivery Info
        if (finalOrderType === 'DELIVERY' && deliveryInfo) {
             const isDelivery = deliveryInfo.deliveryType === 'delivery';
             let fullAddress = 'Retirada no Balcão';
             
             if (isDelivery) {
                 if (typeof deliveryInfo.address === 'object') {
                     const addr = deliveryInfo.address;
                     fullAddress = `${addr.street || ''}, ${addr.number || 'S/N'}${addr.complement ? ' (' + addr.complement + ')' : ''} - ${addr.neighborhood || ''}, ${addr.city || ''}/${addr.state || ''}`;
                 } else {
                     fullAddress = deliveryInfo.address || 'Endereço não informado';
                 }
             }
             
             const cleanPhone = normalizePhone(deliveryInfo.phone);
             
             // Busca Coordenadas Automaticamente para o Mapa de Calor
             const coords = await GeocodingService.getCoordinates(fullAddress);

             const customer = await tx.customer.upsert({
                 where: { phone_restaurantId: { phone: cleanPhone, restaurantId: realRestaurantId } },
                 update: {
                     name: deliveryInfo.name, address: fullAddress, zipCode: deliveryInfo.cep || null,
                     street: deliveryInfo.street || null, number: deliveryInfo.number || null,
                     neighborhood: deliveryInfo.neighborhood || null, city: deliveryInfo.city || null,
                     state: deliveryInfo.state || null, complement: deliveryInfo.complement || null,
                     reference: deliveryInfo.reference || null,
                     latitude: coords?.lat || null,
                     longitude: coords?.lng || null
                 },
                 create: {
                     name: deliveryInfo.name, phone: cleanPhone, address: fullAddress, zipCode: deliveryInfo.cep || null,
                     street: deliveryInfo.street || null, number: deliveryInfo.number || null,
                     neighborhood: deliveryInfo.neighborhood || null, city: deliveryInfo.city || null,
                     state: deliveryInfo.state || null, complement: deliveryInfo.complement || null,
                     reference: deliveryInfo.reference || null, restaurantId: realRestaurantId,
                     latitude: coords?.lat || null,
                     longitude: coords?.lng || null
                 }
             });
 
             await tx.deliveryOrder.create({
                 data: {
                     orderId: createdOrder.id, customerId: customer.id, name: deliveryInfo.name, phone: deliveryInfo.phone,
                     address: fullAddress, deliveryType: deliveryInfo.deliveryType, paymentMethod: deliveryInfo.paymentMethod || paymentMethod,
                     changeFor: deliveryInfo.changeFor ? parseFloat(deliveryInfo.changeFor) : null,
                     deliveryFee: isDelivery ? (deliveryInfo.deliveryFee || 0) : 0,
                     latitude: coords?.lat || deliveryInfo.latitude ? parseFloat(coords?.lat || deliveryInfo.latitude) : null,
                     longitude: coords?.lng || deliveryInfo.longitude ? parseFloat(coords?.lng || deliveryInfo.longitude) : null,
                     status: isAutoAccept ? 'CONFIRMED' : 'PENDING'
                 }
             });

             // Opcional: Atualizar a localização padrão do cliente
             if (deliveryInfo.latitude && deliveryInfo.longitude) {
                 await tx.customer.update({
                     where: { id: customer.id },
                     data: { 
                         latitude: parseFloat(deliveryInfo.latitude),
                         longitude: parseFloat(deliveryInfo.longitude)
                     }
                 });
             }

             // Atualiza o TOTAL do pedido incluindo a taxa de entrega
             if (isDelivery && deliveryInfo.deliveryFee > 0) {
                 await tx.order.update({
                     where: { id: createdOrder.id },
                     data: { total: { increment: deliveryInfo.deliveryFee } }
                 });
             }
        }

        // Registrar Pagamento Inicial (se houver)
        if (paymentMethod) {
            const finalFee = (orderType === 'DELIVERY' && deliveryInfo?.deliveryFee) ? deliveryInfo.deliveryFee : 0;
            const totalToPay = orderTotal + finalFee;

            await tx.payment.create({
                data: {
                    orderId: createdOrder.id,
                    amount: totalToPay,
                    method: paymentMethod
                }
            });

            // Registrar transação financeira (Receita)
            // Busca ou cria categoria de vendas
            let category = await tx.transactionCategory.findFirst({
                where: { restaurantId: realRestaurantId, name: 'Vendas' }
            });

            if (!category) {
                category = await tx.transactionCategory.create({
                    data: { name: 'Vendas', type: 'INCOME', isSystem: true, restaurantId: realRestaurantId }
                });
            }

            const openSession = await tx.cashierSession.findFirst({
                where: { restaurantId: realRestaurantId, status: 'OPEN' }
            });

            await tx.financialTransaction.create({
                data: {
                    restaurantId: realRestaurantId,
                    cashierId: openSession?.id || null,
                    orderId: createdOrder.id,
                    categoryId: category.id,
                    description: `VENDA #${orderData.dailyOrderNumber || createdOrder.id.slice(-4)}`,
                    amount: totalToPay,
                    type: 'INCOME',
                    status: 'PAID',
                    dueDate: new Date(),
                    paymentDate: new Date(),
                    paymentMethod: paymentMethod
                }
            });
        }

        return await tx.order.findUnique({
            where: { id: createdOrder.id },
            include: { deliveryOrder: true }
        });
    });

    // 3. Integrações Pós-Commit (Fire & Forget)
    SaiposService.sendOrderToSaipos(newOrder.id).catch(err => console.error('[SAIPOS] Erro ao enviar pedido:', err));
    
    const finalOrder = await prisma.order.findUnique({ where: { id: newOrder.id }, include: fullOrderInclude });
    
    // Notifica via WhatsApp o recebimento (PENDING)
    if (finalOrder.orderType === 'DELIVERY' && finalOrder.deliveryOrder?.phone) {
        WhatsAppNotificationService.notifyOrderUpdate(finalOrder.id, finalOrder.status).catch(err => console.error('[WhatsApp Notification] Error:', err));
    }

    emitOrderUpdate(finalOrder.id, 'ORDER_CREATED');
    
    return finalOrder;
  }

  /**
   * Adiciona itens a um pedido existente
   */
  async addItemsToOrder(orderId, items, userId = null) {
    // ... (lógica original)
    let additionalTotal = 0;
    const processedItems = [];

    const originalOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { restaurant: { include: { settings: true } } }
    });

    if (!originalOrder) throw new Error("Pedido não encontrado.");

    for (const item of items) {
       const calculation = await PricingService.calculateItemPrice(
        item.productId, item.quantity, item.sizeId, item.addonsIds, item.flavorIds
      );
      additionalTotal += calculation.totalPrice;
      
      processedItems.push({
        orderId: orderId, productId: item.productId, quantity: item.quantity,
        priceAtTime: calculation.unitPrice,
        sizeJson: item.sizeJson || (calculation.sizeObj ? JSON.stringify(calculation.sizeObj) : null),
        addonsJson: item.addonsJson || (calculation.addonsObjects.length ? JSON.stringify(calculation.addonsObjects) : null),
        flavorsJson: item.flavorsJson || (calculation.flavorsObjects.length ? JSON.stringify(calculation.flavorsObjects) : null),
        observations: item.observations || ''
      });
    }

    const result = await prisma.$transaction(async (tx) => {
        await tx.orderItem.createMany({ data: processedItems });
        
        const isAutoAccept = originalOrder.restaurant.settings?.autoAcceptOrders || false;
        const newStatus = isAutoAccept ? 'PREPARING' : 'PENDING';
        
        const updateData = { 
            total: originalOrder.total + additionalTotal, 
            status: originalOrder.status === 'COMPLETED' ? 'COMPLETED' : newStatus,
            userId 
        };

        // Se o status mudou de algo para PENDING/PREPARING, marca o timestamp
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

    SaiposService.sendOrderToSaipos(orderId).catch(err => console.error('[SAIPOS] AddItems Error:', err));
    
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
            case 'CANCELED': updateData.canceledAt = new Date(); break;
        }

        const order = await tx.order.update({
            where: { id: orderId }, 
            data: updateData, 
            include: { deliveryOrder: true, payments: true }
        });

        if (order.orderType === 'DELIVERY' && order.deliveryOrder) {
            let deliveryStatus = 'PENDING';
            if (status === 'PREPARING' || status === 'READY') deliveryStatus = 'CONFIRMED';
            if (status === 'COMPLETED') deliveryStatus = 'DELIVERED';
            if (status === 'CANCELED') deliveryStatus = 'CANCELED';
            await tx.deliveryOrder.update({ where: { orderId }, data: { status: deliveryStatus } });
        }

        if (status === 'COMPLETED') {
            await LoyaltyService.processLoyaltyRewards(order, tx);
            
            // Busca ou cria categoria de vendas
            let category = await tx.transactionCategory.findFirst({
                where: { restaurantId: order.restaurantId, name: 'Vendas' }
            });

            if (!category) {
                category = await tx.transactionCategory.create({
                    data: { name: 'Vendas', type: 'INCOME', isSystem: true, restaurantId: order.restaurantId }
                });
            }

            const openSession = await tx.cashierSession.findFirst({ 
                where: { restaurantId: order.restaurantId, status: 'OPEN' } 
            });

            // Cria a transação financeira vinculada ao caixa (se houver) e à categoria
            const method = order.deliveryOrder?.paymentMethod || order.payments?.[0]?.method || 'cash';
            
            // Verifica se já não existe transação para este pedido (evitar duplicidade)
            const existingTrans = await tx.financialTransaction.findFirst({ where: { orderId: order.id } });
            
            if (!existingTrans) {
                await tx.financialTransaction.create({
                    data: {
                        restaurantId: order.restaurantId,
                        cashierId: openSession?.id || null,
                        orderId: order.id,
                        categoryId: category.id,
                        description: `VENDA #${order.dailyOrderNumber || order.id.slice(-4)}`,
                        amount: order.total,
                        type: 'INCOME',
                        status: 'PAID',
                        dueDate: new Date(),
                        paymentDate: new Date(),
                        paymentMethod: method
                    }
                });
            }
            await InventoryService.processOrderStockDeduction(orderId, tx);
        }
        return order;
    });

    if (status === 'COMPLETED') {
        this._triggerAutomaticInvoice(updatedOrder).catch(err => console.error('[FISCAL BACKGROUND]', err));
    }
    
    emitOrderUpdate(updatedOrder.id);
    
    // Notifica via WhatsApp o novo status
    WhatsAppNotificationService.notifyOrderUpdate(updatedOrder.id, status).catch(err => console.error('[WhatsApp Notification] Error:', err));
    
    const finalOrder = await prisma.order.findUnique({ where: { id: updatedOrder.id }, include: fullOrderInclude });
    return finalOrder;
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
            await tx.order.update({ where: { id: targetOrderInitialState.id }, data: { total: targetOrderInitialState.total + currentOrder.total } });
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
    
    const transferTotal = itemsToTransfer.reduce((acc, item) => acc + (item.priceAtTime * item.quantity), 0);

    const result = await prisma.$transaction(async (tx) => {
        let targetOrder = await tx.order.findFirst({
            where: { restaurantId, tableNumber: parseInt(targetTableNumber), status: { notIn: ['COMPLETED', 'CANCELED'] } }
        });
        
        if (!targetOrder) {
             const today = new Date(); today.setHours(0, 0, 0, 0);
             const lastOrder = await tx.order.findFirst({ where: { restaurantId, createdAt: { gte: today } }, orderBy: { dailyOrderNumber: 'desc' } });
             targetOrder = await tx.order.create({
                data: { restaurantId, tableNumber: parseInt(targetTableNumber), status: 'PENDING', total: 0, orderType: 'TABLE', dailyOrderNumber: (lastOrder?.dailyOrderNumber || 0) + 1, userId }
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
    
    const itemTotal = item.priceAtTime * item.quantity;
    
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
    const result = await prisma.$transaction(async (tx) => {
        await tx.payment.updateMany({ where: { orderId }, data: { method: newMethod } });
        await tx.deliveryOrder.updateMany({ where: { orderId }, data: { paymentMethod: newMethod } });
        await tx.financialTransaction.updateMany({ where: { orderId, restaurantId }, data: { paymentMethod: newMethod } });
        return { success: true };
    });
    emitOrderUpdate(orderId);
    return result;
  }

  async updateOrderFinancials(orderId, { deliveryFee, total, discount, surcharge }) {
    // ... (existing code remains)
  }

  async addPaymentToOrder(orderId, { amount, method }) {
    const result = await prisma.payment.create({
        data: {
            orderId,
            amount: parseFloat(amount),
            method
        }
    });
    emitOrderUpdate(orderId);
    return result;
  }

  async removePaymentFromOrder(paymentId) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new Error('Pagamento não encontrado.');
    
    await prisma.payment.delete({ where: { id: paymentId } });
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
                address: customerData.address
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
    
    // Se manualFee for passado, usa ele. Senão usa o padrão ou 0.
    let deliveryFee = manualFee !== null ? parseFloat(manualFee) : 0;
    
    if (manualFee === null && deliveryType === 'delivery') {
        deliveryFee = order.restaurant.settings?.deliveryFee || 0;
    }

    const oldFee = order.deliveryOrder.deliveryFee || 0;
    const updateData = { deliveryType, deliveryFee };
    if (deliveryType === 'pickup') updateData.driverId = null;
    
    const result = await prisma.$transaction(async (tx) => {
        await tx.deliveryOrder.update({ where: { id: order.deliveryOrder.id }, data: updateData });
        
        // Ajusta o total do pedido baseado na diferença de taxas
        return await tx.order.update({
            where: { id: orderId },
            data: { total: { increment: deliveryFee - oldFee } },
            include: fullOrderInclude
        });
    });

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

  async getDriverSettlement(restaurantId, date) {
    const queryDate = date ? new Date(date) : new Date();
    const start = new Date(queryDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(queryDate);
    end.setHours(23, 59, 59, 999);

    const drivers = await prisma.user.findMany({
        where: { 
            restaurantId, 
            roleRef: { 
                permissions: { 
                    some: { name: 'delivery:manage' } 
                } 
            } 
        },
        include: {
            deliveries: {
                where: {
                    status: 'DELIVERED',
                    updatedAt: { gte: start, lte: end }
                },
                include: { 
                    order: {
                        include: { payments: true }
                    } 
                }
            }
        }
    });

    return drivers.map(d => {
        let cash = 0;
        let card = 0;
        let pix = 0;
        let deliveryFees = 0;
        let totalOrdersValue = 0;

        d.deliveries.forEach(del => {
            const order = del.order;
            if (!order) return;

            deliveryFees += del.deliveryFee || 0;
            totalOrdersValue += order.total;

            const method = del.paymentMethod?.toLowerCase() || '';
            if (method.includes('dinheiro') || method.includes('cash')) {
                cash += order.total;
            } else if (method.includes('cart') || method.includes('card') || method.includes('deb') || method.includes('cred')) {
                card += order.total;
            } else if (method.includes('pix')) {
                pix += order.total;
            } else {
                // Fallback para outros métodos ou se não identificado
                cash += order.total; 
            }
        });

        const totalDeliveries = d.deliveries.length;
        const baseRate = d.baseRate || 0;
        const totalCommission = d.deliveries.reduce((acc, curr) => acc + (d.bonusPerDelivery || 0), 0);
        
        // O que a loja deve ao entregador
        const totalToPay = baseRate + totalCommission;

        // Saldo líquido da loja para esse entregador: 
        // (Total de Vendas) - (O que pagou ao entregador)
        const storeNet = totalOrdersValue - totalToPay;

        return {
            driverId: d.id,
            driverName: d.name || d.email,
            totalOrders: totalDeliveries,
            cash,
            card,
            pix,
            deliveryFees,
            totalToPay,
            storeNet,
            baseRate,
            totalCommission
        };
    });
  }

  async payDriverSettlement(restaurantId, driverName, amount, date, driverId = null) {
      // Busca ou cria a categoria para pagamento de entregadores
      let category = await prisma.transactionCategory.findFirst({
          where: { restaurantId, name: 'Pagamento de Entregador' }
      });

      if (!category) {
          category = await prisma.transactionCategory.create({
              data: {
                  name: 'Pagamento de Entregador',
                  type: 'EXPENSE',
                  isSystem: true,
                  restaurantId
              }
          });
      }

      return await prisma.financialTransaction.create({
          data: {
              restaurantId,
              description: `FECHAMENTO MOTOBOY: ${driverName}`,
              amount,
              type: 'EXPENSE',
              status: 'PAID',
              dueDate: new Date(),
              paymentDate: new Date(),
              paymentMethod: 'cash',
              recipientUserId: driverId,
              categoryId: category.id
          }
      });
  }

  async _triggerAutomaticInvoice(order) {
      // Implementação futura ou via hook
      console.log(`[FISCAL] Analisando pedido #${order.id} para emissão automática...`);
  }
}

module.exports = new OrderService();