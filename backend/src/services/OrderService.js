const prisma = require('../lib/prisma');
const SaiposService = require('./SaiposService');
const PricingService = require('./PricingService');
const InventoryService = require('./InventoryService');
const LoyaltyService = require('./LoyaltyService');

class OrderService {
  
  /**
   * Cria um pedido completo de forma transacional.
   */
  async createOrder({ restaurantId, items, orderType, deliveryInfo, tableNumber, paymentMethod, userId, customerName }) {
    let orderTotal = 0;
    const processedItems = [];

    // 1. Preparação dos Itens (Cálculo de Preço via PricingService)
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

    // Lógica para adicionar itens em pedido existente de mesa
    if (orderType === 'TABLE' && tableNumber) {
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
      orderType: orderType || 'TABLE',
      status: initialStatus,
      userId: userId || null, 
      customerName: customerName || null,
      items: { create: processedItems }
    };

    if (tableNumber) orderData.tableNumber = parseInt(tableNumber);

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

        if (orderType === 'TABLE' && tableNumber) {
            await tx.table.updateMany({
                where: { number: parseInt(tableNumber), restaurantId: realRestaurantId },
                data: { status: 'occupied' }
            });
        }

        // Processar Delivery Info
        if (orderType === 'DELIVERY' && deliveryInfo) {
             const isDelivery = deliveryInfo.deliveryType === 'delivery';
             let fullAddress = deliveryInfo.address || 'Retirada no Balcão';
             
             // Se for entrega e tivermos campos estruturados, montamos a string bonitinha
             if (isDelivery && deliveryInfo.street) {
                 fullAddress = `${deliveryInfo.street}${deliveryInfo.number ? ', ' + deliveryInfo.number : ''}${deliveryInfo.neighborhood ? ' - ' + deliveryInfo.neighborhood : ''}`;
             } else if (!isDelivery) {
                 fullAddress = 'Retirada no Balcão';
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
                     status: isAutoAccept ? 'CONFIRMED' : 'PENDING'
                 }
             });
        }

        // Registrar Pagamento Inicial (se houver)
        if (paymentMethod) {
            await tx.payment.create({
                data: {
                    orderId: createdOrder.id,
                    amount: orderTotal + (deliveryInfo?.deliveryFee || 0),
                    method: paymentMethod
                }
            });
        }

        return createdOrder;
    });

    // 3. Integrações Pós-Commit (Fire & Forget)
    // Não bloqueia a resposta se a Saipos demorar
    SaiposService.sendOrderToSaipos(newOrder.id).catch(err => console.error('[SAIPOS] Erro ao enviar pedido:', err));

    return prisma.order.findUnique({
        where: { id: newOrder.id },
        include: { 
            items: { include: { product: { include: { categories: true } } } }, 
            deliveryOrder: true, 
            payments: true,
            user: { select: { name: true } }
        }
    });
  }

  /**
   * Adiciona itens a um pedido existente
   */
  async addItemsToOrder(orderId, items, userId = null) {
    let additionalTotal = 0;
    const processedItems = [];

    const originalOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { restaurant: { include: { settings: true } } }
    });

    if (!originalOrder) throw new Error("Pedido não encontrado.");

    // Cálculo via PricingService
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
                status: originalOrder.status === 'COMPLETED' ? 'COMPLETED' : newStatus, // Não reabre pedido finalizado
                userId 
            },
            include: { 
                items: { include: { product: { include: { categories: true } } } },
                deliveryOrder: true, payments: true, user: { select: { name: true } }
            }
        });
    });

    SaiposService.sendOrderToSaipos(orderId).catch(err => console.error('[SAIPOS] AddItems Error:', err));
    return result;
  }

  /**
   * Atualiza o status do pedido e dispara eventos de fim de ciclo (Estoque, Financeiro, Fidelidade)
   * Agora 100% Transacional.
   */
  async updateOrderStatus(orderId, status) {
    // 1. Inicia Transação
    const updatedOrder = await prisma.$transaction(async (tx) => {
        // Atualiza Status Principal
        const order = await tx.order.update({
            where: { id: orderId }, 
            data: { status }, 
            include: { deliveryOrder: true, payments: true }
        });

        // Sincroniza Status Delivery
        if (order.orderType === 'DELIVERY' && order.deliveryOrder) {
            let deliveryStatus = 'PENDING';
            if (status === 'PREPARING' || status === 'READY') deliveryStatus = 'CONFIRMED';
            if (status === 'COMPLETED') deliveryStatus = 'DELIVERED';
            if (status === 'CANCELED') deliveryStatus = 'CANCELED';
            
            await tx.deliveryOrder.update({ where: { orderId }, data: { status: deliveryStatus } });
        }

        // === EFEITOS COLATERAIS QUANDO FINALIZADO (COMPLETED) ===
        if (status === 'COMPLETED') {
            
            // A. Fidelidade (Pontos e Cashback)
            await LoyaltyService.processLoyaltyRewards(order, tx);

            // B. Financeiro (Lançamento no Caixa)
            const openSession = await tx.cashierSession.findFirst({ 
                where: { restaurantId: order.restaurantId, status: 'OPEN' } 
            });

            if (openSession) {
                const paymentMethodKey = order.payments?.[0]?.method || order.deliveryOrder?.paymentMethod || 'other';
                const totalAmount = order.total + (order.deliveryOrder?.deliveryFee || 0);
                
                // Busca config de taxas
                const paymentConfig = await tx.paymentMethod.findFirst({ 
                    where: { restaurantId: order.restaurantId, OR: [{ type: paymentMethodKey }, { name: paymentMethodKey }] } 
                });

                let finalAmount = totalAmount;
                let dueDate = new Date();
                let transactionStatus = 'PAID';
                let description = `Venda Pedido #${order.dailyOrderNumber || order.id.slice(-4)}`;

                if (paymentConfig) {
                    if (paymentConfig.feePercentage > 0) {
                        finalAmount = totalAmount * (1 - paymentConfig.feePercentage / 100);
                    }
                    if (paymentConfig.daysToReceive > 0) { 
                        dueDate.setDate(dueDate.getDate() + paymentConfig.daysToReceive); 
                        transactionStatus = 'PENDING'; 
                        description += ` (Prev. ${new Date(dueDate).toLocaleDateString()})`; 
                    }
                }

                await tx.financialTransaction.create({ 
                    data: { 
                        description, 
                        amount: parseFloat(finalAmount.toFixed(2)), 
                        type: 'INCOME', 
                        status: transactionStatus, 
                        dueDate, 
                        paymentDate: transactionStatus === 'PAID' ? new Date() : null, 
                        paymentMethod: paymentMethodKey, 
                        restaurantId: order.restaurantId, 
                        orderId: order.id, 
                        cashierId: openSession.id 
                    } 
                });
            }

            // C. Baixa de Estoque
            await InventoryService.processOrderStockDeduction(orderId, tx);
        }

        return order;
    });

    // Eventos Pós-Transação (Não críticos para a integridade do pedido)
    if (status === 'COMPLETED') {
        this._triggerAutomaticInvoice(updatedOrder).catch(err => console.error('[FISCAL BACKGROUND]', err));
    }

    return updatedOrder;
  }

  // --- MÉTODOS AUXILIARES ---

  async _triggerAutomaticInvoice(order) {
    try {
        const fiscalConfig = await prisma.restaurantFiscalConfig.findUnique({ where: { restaurantId: order.restaurantId } });
        if (fiscalConfig?.emissionMode === 'AUTOMATIC') {
            const FiscalService = require('./FiscalService');
            const fullOrder = await prisma.order.findUnique({ 
                where: { id: order.id }, 
                include: { items: { include: { product: { include: { categories: true } } } } } 
            });
            const result = await FiscalService.autorizarNfce(fullOrder, fiscalConfig, fullOrder.items);
            if (result.success) {
                await prisma.invoice.create({ 
                    data: { restaurantId: order.restaurantId, orderId: order.id, type: 'NFCe', status: 'AUTHORIZED', issuedAt: new Date() } 
                });
            }
        }
    } catch (error) { console.error('[FISCAL] Erro automático:', error.message); }
  }

  async transferTable(currentTableNumber, targetTableNumber, restaurantId) {
    const currentOrder = await prisma.order.findFirst({
        where: { restaurantId, tableNumber: parseInt(currentTableNumber), status: { notIn: ['COMPLETED', 'CANCELED'] } }
    });
    if (!currentOrder) throw new Error("Não há pedido aberto na mesa de origem.");
    
    const targetOrder = await prisma.order.findFirst({
        where: { restaurantId, tableNumber: parseInt(targetTableNumber), status: { notIn: ['COMPLETED', 'CANCELED'] } }
    });

    return await prisma.$transaction(async (tx) => {
        if (targetOrder) {
            // Merge de Mesas
            await tx.orderItem.updateMany({ where: { orderId: currentOrder.id }, data: { orderId: targetOrder.id } });
            await tx.order.update({ where: { id: targetOrder.id }, data: { total: targetOrder.total + currentOrder.total } });
            await tx.order.update({ where: { id: currentOrder.id }, data: { status: 'CANCELED', total: 0 } });
            await tx.table.updateMany({ where: { number: parseInt(currentTableNumber), restaurantId }, data: { status: 'free' } });
            return targetOrder;
        } else {
            // Transferência Simples
            const updatedOrder = await tx.order.update({ where: { id: currentOrder.id }, data: { tableNumber: parseInt(targetTableNumber) } });
            await tx.table.updateMany({ where: { number: parseInt(currentTableNumber), restaurantId }, data: { status: 'free' } });
            await tx.table.updateMany({ where: { number: parseInt(targetTableNumber), restaurantId }, data: { status: 'occupied' } });
            return updatedOrder;
        }
    });
  }

  async transferItems(sourceOrderId, targetTableNumber, itemIds, restaurantId, userId) {
    const sourceOrder = await prisma.order.findUnique({ where: { id: sourceOrderId }, include: { items: true } });
    if (!sourceOrder) throw new Error("Pedido de origem não encontrado.");
    
    const itemsToTransfer = sourceOrder.items.filter(item => itemIds.includes(item.id));
    if (itemsToTransfer.length === 0) throw new Error("Nenhum item válido selecionado.");
    
    const transferTotal = itemsToTransfer.reduce((acc, item) => acc + (item.priceAtTime * item.quantity), 0);

    return await prisma.$transaction(async (tx) => {
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
  }

  async removeItemFromOrder(orderId, itemId) {
    const item = await prisma.orderItem.findUnique({ where: { id: itemId } });
    if (!item || item.orderId !== orderId) throw new Error("Item inválido.");
    
    const itemTotal = item.priceAtTime * item.quantity;
    
    return await prisma.$transaction(async (tx) => {
        await tx.orderItem.delete({ where: { id: itemId } });
        const updatedOrder = await tx.order.update({ where: { id: orderId }, data: { total: { decrement: itemTotal } }, include: { items: true } });
        if (updatedOrder.total < 0) await tx.order.update({ where: { id: orderId }, data: { total: 0 } });
        return updatedOrder;
    });
  }

  // Métodos de Driver e KDS mantidos (são apenas consultas ou updates simples)
  async getDriverSettlement(restaurantId, date) {
    const targetDate = date ? new Date(date) : new Date(); targetDate.setHours(0,0,0,0);
    const nextDay = new Date(targetDate); nextDay.setDate(targetDate.getDate() + 1);
    const orders = await prisma.order.findMany({ where: { restaurantId, orderType: 'DELIVERY', status: 'COMPLETED', createdAt: { gte: targetDate, lt: nextDay }, deliveryOrder: { driverId: { not: null } } }, include: { deliveryOrder: { include: { driver: true } }, payments: true } });
    const settlement = {};
    orders.forEach(order => {
        const driverId = order.deliveryOrder.driverId, driver = order.deliveryOrder.driver;
        if (!settlement[driverId]) {
            settlement[driverId] = { driverName: driver.name, totalOrders: 0, cash: 0, card: 0, pix: 0, other: 0, deliveryFees: 0, totalToPay: 0, storeNet: 0 };
            if (driver.paymentType === 'DAILY' || driver.paymentType === 'SHIFT') settlement[driverId].totalToPay += (driver.baseRate || 0);
        }
        const s = settlement[driverId]; s.totalOrders++;
        s.totalToPay += (driver.bonusPerDelivery || 0);
        if (driver.paymentType === 'DELIVERY') s.totalToPay += (driver.baseRate || 0);
        s.deliveryFees += (order.deliveryOrder.deliveryFee || 0);
        const method = order.deliveryOrder.paymentMethod || 'cash', amount = order.total + (order.deliveryOrder.deliveryFee || 0);
        if (method === 'cash') s.cash += amount; else if (method.includes('card')) s.card += amount; else if (method === 'pix') s.pix += amount; else s.other += amount;
    });
    Object.values(settlement).forEach(s => { s.storeNet = (s.cash + s.card + s.pix + s.other) - s.totalToPay; });
    return Object.values(settlement);
  }

  async payDriverSettlement(restaurantId, driverName, amount, date, driverId = null) {
     return await prisma.financialTransaction.create({ data: { description: `ACERTO MOTOBOY: ${driverName} (Ref: ${date})`, amount: parseFloat(amount), type: 'EXPENSE', status: 'PAID', dueDate: new Date(), paymentDate: new Date(), paymentMethod: 'cash', restaurantId, ...(driverId && { recipientUser: { connect: { id: driverId } } }) } });
  }

  async getKdsItems(restaurantId, area) {
    const items = await prisma.orderItem.findMany({ 
        where: { 
            order: { 
                restaurantId, 
                status: { in: ['PENDING', 'PREPARING'] } 
            }, 
            product: { productionArea: area || undefined }, 
            isReady: false 
        }, 
        include: { 
            product: { include: { categories: true } }, 
            order: { 
                include: {
                    deliveryOrder: {
                        select: { deliveryType: true }
                    }
                }
            } 
        }, 
        orderBy: { order: { createdAt: 'asc' } } 
    });
    const groupedOrders = items.reduce((acc, item) => {
        const orderId = item.orderId; if (!acc[orderId]) acc[orderId] = { ...item.order, items: [] };
        const { order, ...itemData } = item; acc[orderId].items.push(itemData); return acc;
    }, {});
    return Object.values(groupedOrders).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async finishKdsItem(itemId) {
    const updatedItem = await prisma.orderItem.update({ where: { id: itemId }, data: { isReady: true }, include: { order: true } });
    const orderItems = await prisma.orderItem.findMany({ where: { orderId: updatedItem.orderId } });
    if (orderItems.every(item => item.isReady)) await this.updateOrderStatus(updatedItem.orderId, 'READY');
    return updatedItem;
  }

  async markAsPrinted(orderId) { return await prisma.order.update({ where: { id: orderId }, data: { isPrinted: true } }); }

  async updatePaymentMethod(orderId, newMethod, restaurantId) {
    return await prisma.$transaction(async (tx) => {
        await tx.payment.updateMany({ where: { orderId }, data: { method: newMethod } });
        await tx.deliveryOrder.updateMany({ where: { orderId }, data: { paymentMethod: newMethod } });
        await tx.financialTransaction.updateMany({ where: { orderId, restaurantId }, data: { paymentMethod: newMethod } });
        return { success: true };
    });
  }

  async updateDeliveryType(orderId, deliveryType) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { deliveryOrder: true, restaurant: { include: { settings: true } } } });
    if (!order?.deliveryOrder) throw new Error('Pedido não encontrado.');
    const deliveryFee = deliveryType === 'delivery' ? (order.restaurant.settings?.deliveryFee || 0) : 0;
    const updateData = { deliveryType, deliveryFee };
    if (deliveryType === 'pickup') updateData.driverId = null;
    return await prisma.deliveryOrder.update({ where: { id: order.deliveryOrder.id }, data: updateData });
  }
}

module.exports = new OrderService();