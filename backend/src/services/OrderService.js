const prisma = require('../lib/prisma');
const SaiposService = require('./SaiposService');
const PricingService = require('./PricingService');
const InventoryService = require('./InventoryService');
const LoyaltyService = require('./LoyaltyService');
const eventEmitter = require('../lib/eventEmitter');

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
      eventEmitter.emit('order_update', {
        eventType,
        restaurantId: order.restaurantId,
        payload: order,
      });
    }
  } catch (error) {
    console.error(`[SSE] Failed to emit event for order ${orderId}:`, error);
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
             
             const cleanPhone = deliveryInfo.phone ? deliveryInfo.phone.replace(/\D/g, '') : '';
             
             const customer = await tx.customer.upsert({
                 where: { phone_restaurantId: { phone: cleanPhone, restaurantId: realRestaurantId } },
                 update: {
                     name: deliveryInfo.name, address: fullAddress, zipCode: deliveryInfo.cep || null,
                     street: deliveryInfo.street || null, number: deliveryInfo.number || null,
                     neighborhood: deliveryInfo.neighborhood || null, city: deliveryInfo.city || null,
                     state: deliveryInfo.state || null, complement: deliveryInfo.complement || null,
                     reference: deliveryInfo.reference || null
                 },
                 create: {
                     name: deliveryInfo.name, phone: cleanPhone, address: fullAddress, zipCode: deliveryInfo.cep || null,
                     street: deliveryInfo.street || null, number: deliveryInfo.number || null,
                     neighborhood: deliveryInfo.neighborhood || null, city: deliveryInfo.city || null,
                     state: deliveryInfo.state || null, complement: deliveryInfo.complement || null,
                     reference: deliveryInfo.reference || null, restaurantId: realRestaurantId
                 }
             });
 
             await tx.deliveryOrder.create({
                 data: {
                     orderId: createdOrder.id, customerId: customer.id, name: deliveryInfo.name, phone: deliveryInfo.phone,
                     address: fullAddress, deliveryType: deliveryInfo.deliveryType, paymentMethod: deliveryInfo.paymentMethod || paymentMethod,
                     changeFor: deliveryInfo.changeFor ? parseFloat(deliveryInfo.changeFor) : null,
                     deliveryFee: isDelivery ? (deliveryInfo.deliveryFee || 0) : 0,
                     latitude: deliveryInfo.latitude ? parseFloat(deliveryInfo.latitude) : null,
                     longitude: deliveryInfo.longitude ? parseFloat(deliveryInfo.longitude) : null,
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

            // Se o pedido já nasce aceito/preparando (balcão/auto-accept), já vincula ao financeiro/caixa
            const openSession = await tx.cashierSession.findFirst({
                where: { restaurantId: realRestaurantId, status: 'OPEN' }
            });

            if (openSession) {
                await tx.financialTransaction.create({
                    data: {
                        restaurantId: realRestaurantId,
                        cashierId: openSession.id,
                        orderId: createdOrder.id,
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
        }

        return await tx.order.findUnique({
            where: { id: createdOrder.id },
            include: { deliveryOrder: true }
        });
    });

    // 3. Integrações Pós-Commit (Fire & Forget)
    SaiposService.sendOrderToSaipos(newOrder.id).catch(err => console.error('[SAIPOS] Erro ao enviar pedido:', err));
    
    const finalOrder = await prisma.order.findUnique({ where: { id: newOrder.id }, include: fullOrderInclude });
    
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
        
        return await tx.order.update({
            where: { id: orderId },
            data: { 
                total: originalOrder.total + additionalTotal, 
                status: originalOrder.status === 'COMPLETED' ? 'COMPLETED' : newStatus,
                userId 
            },
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
        const order = await tx.order.update({
            where: { id: orderId }, 
            data: { status }, 
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
            const openSession = await tx.cashierSession.findFirst({ 
                where: { restaurantId: order.restaurantId, status: 'OPEN' } 
            });

            if (openSession) {
                // Cria a transação financeira vinculada ao caixa
                const method = order.deliveryOrder?.paymentMethod || order.payments?.[0]?.method || 'cash';
                await tx.financialTransaction.create({
                    data: {
                        restaurantId: order.restaurantId,
                        cashierId: openSession.id,
                        orderId: order.id,
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

  async updateDeliveryType(orderId, deliveryType) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { deliveryOrder: true, restaurant: { include: { settings: true } } } });
    if (!order?.deliveryOrder) throw new Error('Pedido não encontrado.');
    
    const deliveryFee = deliveryType === 'delivery' ? (order.restaurant.settings?.deliveryFee || 0) : 0;
    const updateData = { deliveryType, deliveryFee };
    if (deliveryType === 'pickup') updateData.driverId = null;
    
    const result = await prisma.deliveryOrder.update({ where: { id: order.deliveryOrder.id }, data: updateData });

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
    const startOfDay = date ? new Date(date) : new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const drivers = await prisma.user.findMany({
        where: { restaurantId, roleRef: { name: { equals: 'Entregador', mode: 'insensitive' } } },
        include: {
            deliveries: {
                where: {
                    status: 'DELIVERED',
                    updatedAt: { gte: startOfDay, lte: endOfDay }
                },
                include: { order: true }
            }
        }
    });

    return drivers.map(d => {
        const totalDeliveries = d.deliveries.length;
        const baseRate = d.baseRate || 0;
        const totalCommission = d.deliveries.reduce((acc, curr) => acc + (d.bonusPerDelivery || 0), 0);
        const totalToPay = baseRate + totalCommission;

        return {
            driverId: d.id,
            driverName: d.name,
            totalDeliveries,
            baseRate,
            totalCommission,
            totalToPay,
            deliveries: d.deliveries
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