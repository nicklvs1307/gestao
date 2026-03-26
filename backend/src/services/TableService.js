const FinancialService = require('./FinancialService');
const prisma = require('../lib/prisma');

class TableService {
  /**
   * Gera um resumo detalhado das mesas com pedidos ativos e saldos.
   */
  async getTablesSummary(restaurantId) {
    const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { serviceTaxPercentage: true }
    });
    const serviceTaxRate = (restaurant?.serviceTaxPercentage || 0) / 100;

    const tables = await prisma.table.findMany({ 
        where: { restaurantId }, 
        orderBy: { number: 'asc' } 
    });
    
    const activeOrders = await prisma.order.findMany({ 
        where: { 
            restaurantId, 
            status: { notIn: ['COMPLETED', 'CANCELED'] },
            orderType: 'TABLE'
        }, 
        include: { 
            items: { 
                where: { isPaid: false },
                include: { product: true } 
            },
            payments: true,
            user: { select: { name: true } }
        } 
    });

    return tables.map(t => {
        const tableOrders = activeOrders.filter(o => o.tableNumber === t.number);
        
        const tabs = tableOrders.map(order => {
            const itemsSubtotal = order.items.reduce((acc, item) => acc + (item.priceAtTime * item.quantity), 0);
            const serviceTax = Number((itemsSubtotal * serviceTaxRate).toFixed(2));
            const totalWithTax = itemsSubtotal + serviceTax + (order.extraCharge || 0) - (order.discount || 0);
            
            const paymentsTotal = order.payments.reduce((acc, p) => acc + p.amount, 0);
            const balanceDue = Math.max(0, totalWithTax - paymentsTotal);

            return {
                orderId: order.id,
                customerName: order.customerName || `Mesa ${t.number}`,
                waiterName: order.user?.name,
                subtotal: itemsSubtotal,
                serviceTax,
                totalAmount: totalWithTax,
                balanceDue,
                items: order.items,
                createdAt: order.createdAt
            };
        }).filter(tab => tab.items.length > 0 || tab.totalAmount > 0);

        const totalTableDue = tabs.reduce((acc, tab) => acc + tab.balanceDue, 0);

        return { 
            id: t.id, 
            number: t.number, 
            status: tabs.length > 0 ? 'occupied' : 'free', 
            totalAmount: totalTableDue,
            tabs, 
            items: tabs.flatMap(tab => tab.items)
        };
    });
  }

  /**
   * Realiza o checkout (fechamento) de um ou mais pedidos de uma mesa.
   */
  async checkout(tableId, restaurantId, { payments, orderIds }) {
    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table) throw new Error("Mesa não encontrada");

    const openOrders = await prisma.order.findMany({
        where: {
            restaurantId,
            tableNumber: table.number,
            status: { notIn: ['COMPLETED', 'CANCELED'] },
            id: orderIds && orderIds.length > 0 ? { in: orderIds } : undefined
        },
        include: { items: { include: { product: true } } }
    });

    if (openOrders.length === 0) throw new Error("Nenhum pedido aberto selecionado.");

    return await prisma.$transaction(async (tx) => {
        // 1. Finaliza pedidos
        await tx.order.updateMany({
            where: { id: { in: openOrders.map(o => o.id) } },
            data: { status: 'COMPLETED' }
        });

        // 2. Registra Pagamentos (vinculados ao primeiro pedido do lote)
        const mainOrderId = openOrders[0].id;
        for (const p of payments) {
            await tx.payment.create({
                data: { orderId: mainOrderId, amount: p.amount, method: p.method }
            });
        }

        // 3. Libera Mesa se não houver mais pedidos abertos
        const remainingOrders = await tx.order.count({
            where: {
                restaurantId,
                tableNumber: table.number,
                status: { notIn: ['COMPLETED', 'CANCELED'] },
                id: { notIn: openOrders.map(o => o.id) }
            }
        });

        if (remainingOrders === 0) {
            await tx.table.update({ where: { id: tableId }, data: { status: 'free' } });
        }

        // 4. Registro Financeiro
        const category = await FinancialService.getOrCreateVendasCategory(restaurantId, tx);

        const openSession = await tx.cashierSession.findFirst({
            where: { restaurantId, status: 'OPEN' }
        });

        if (payments.length > 0) {
            const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
            const names = openOrders.map(o => o.customerName).filter(Boolean).join(', ');
            const description = `Venda Mesa ${table.number}${names ? ': ' + names : ''}`;

            await tx.financialTransaction.create({
                data: {
                    description,
                    amount: totalPaid,
                    type: 'INCOME',
                    status: 'PAID',
                    dueDate: new Date(),
                    paymentDate: new Date(),
                    paymentMethod: payments[0]?.method || 'other',
                    restaurantId,
                    orderId: mainOrderId,
                    cashierId: openSession?.id || null,
                    categoryId: category.id
                }
            });
        }

        return { success: true, orders: openOrders };
    });
  }

  /**
   * Registra pagamento parcial de itens específicos
   */
  async processPartialItemPayment(tableId, restaurantId, { orderId, itemIds, payments, discount = 0, surcharge = 0 }) {
    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table) throw new Error("Mesa não encontrada");

    return await prisma.$transaction(async (tx) => {
        // 1. Marca itens como pagos
        await tx.orderItem.updateMany({
            where: { id: { in: itemIds }, orderId: orderId },
            data: { isPaid: true }
        });

        // 2. Registra os pagamentos
        const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);

        for (const p of payments) {
            await tx.payment.create({
                data: { orderId, amount: p.amount, method: p.method }
            });
        }

        // 3. Registro Financeiro com categoria correta
        const category = await FinancialService.getOrCreateVendasCategory(restaurantId, tx);

        const openSession = await tx.cashierSession.findFirst({
            where: { restaurantId, status: 'OPEN' }
        });

        await tx.financialTransaction.create({
            data: {
                description: `Pagto Parcial Mesa ${table.number} (Itens)`,
                amount: totalPaid,
                type: 'INCOME',
                status: 'PAID',
                dueDate: new Date(),
                paymentDate: new Date(),
                paymentMethod: payments[0]?.method || 'other',
                restaurantId,
                orderId,
                cashierId: openSession?.id || null,
                categoryId: category.id
            }
        });

        // 4. Verifica se TODOS os itens de TODOS os pedidos ativos desta mesa foram pagos
        const activeOrders = await tx.order.findMany({
            where: { 
                restaurantId, 
                tableNumber: table.number,
                status: { notIn: ['COMPLETED', 'CANCELED'] }
            }
        });

        let allTableItemsPaid = true;
        for (const order of activeOrders) {
            const unpaidItem = await tx.orderItem.findFirst({
                where: { orderId: order.id, isPaid: false }
            });
            if (unpaidItem) {
                allTableItemsPaid = false;
                break;
            }
        }

        // Se TUDO da mesa estiver pago, finaliza os pedidos e libera a mesa
        if (allTableItemsPaid && activeOrders.length > 0) {
            await tx.order.updateMany({
                where: { id: { in: activeOrders.map(o => o.id) } },
                data: { status: 'COMPLETED' }
            });
            await tx.table.update({ where: { id: tableId }, data: { status: 'free' } });
            return { finished: true };
        }

        return { finished: false };
    });
  }
}

module.exports = new TableService();