const prisma = require('../lib/prisma');

const getTables = async (req, res) => {
    try { res.json(await prisma.table.findMany({ where: { restaurantId: req.restaurantId }, orderBy: { number: 'asc' } })); }
    catch (error) { res.status(500).json({ error: 'Erro ao buscar mesas.' }); }
};

const createTable = async (req, res) => {
    try { res.status(201).json(await prisma.table.create({ data: { ...req.body, restaurantId: req.restaurantId } })); }
    catch (error) { res.status(500).json({ error: 'Erro ao criar mesa.' }); }
};

const getPosTablesSummary = async (req, res) => {
    try {
        const tables = await prisma.table.findMany({ where: { restaurantId: req.restaurantId }, orderBy: { number: 'asc' } });
        
        // Busca pedidos abertos
        const activeOrders = await prisma.order.findMany({ 
            where: { 
                restaurantId: req.restaurantId, 
                status: { notIn: ['COMPLETED', 'CANCELED'] },
                orderType: 'TABLE'
            }, 
            include: { 
                items: { 
                    where: { isPaid: false },
                    include: { product: true } 
                },
                payments: true, // Incluir pagamentos já realizados
                user: { select: { name: true } }
            } 
        });

        const summary = tables.map(t => {
            const tableOrders = activeOrders.filter(o => o.tableNumber === t.number);
            
            // Agrupar itens por pedido (Comanda)
            const tabs = tableOrders.map(order => {
                const itemsTotal = order.items.reduce((acc, item) => acc + (item.priceAtTime * item.quantity), 0);
                const paymentsTotal = order.payments.reduce((acc, p) => acc + p.amount, 0);
                const balanceDue = Math.max(0, itemsTotal - paymentsTotal);

                return {
                    orderId: order.id,
                    customerName: order.customerName || `Mesa ${t.number}`,
                    waiterName: order.user?.name,
                    totalAmount: itemsTotal,
                    balanceDue: balanceDue, // Saldo que falta pagar nesta comanda
                    items: order.items,
                    createdAt: order.createdAt
                };
            }).filter(tab => tab.items.length > 0 || tab.totalAmount > 0);

            const totalTableDue = tabs.reduce((acc, tab) => acc + tab.balanceDue, 0);

            return { 
                id: t.id, 
                number: t.number, 
                status: tabs.length > 0 ? 'occupied' : 'free', 
                totalAmount: totalTableDue, // Agora mostra o que FALTA pagar na mesa
                tabs: tabs, 
                items: tabs.flatMap(tab => tab.items)
            };
        });
        res.json(summary);
    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: 'Erro no resumo das mesas.' }); 
    }
};

const partialValuePayment = async (req, res) => {
    const { tableId } = req.params;
    const { orderId, payments } = req.body; // orderId da comanda específica

    try {
        const table = await prisma.table.findUnique({ where: { id: tableId } });
        if (!table) return res.status(404).json({ error: "Mesa não encontrada" });

        await prisma.$transaction(async (tx) => {
            const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);

            // 1. Registra os pagamentos
            for (const p of payments) {
                await tx.payment.create({
                    data: {
                        orderId: orderId,
                        amount: p.amount,
                        method: p.method
                    }
                });
            }

            // 2. Registra no caixa
            const openSession = await tx.cashierSession.findFirst({
                where: { restaurantId: req.restaurantId, status: 'OPEN' }
            });

            if (openSession) {
                await tx.financialTransaction.create({
                    data: {
                        description: `Pagto Parcial Mesa ${table.number} (Valor Avulso)`,
                        amount: totalPaid,
                        type: 'INCOME',
                        status: 'PAID',
                        dueDate: new Date(),
                        paymentDate: new Date(),
                        paymentMethod: payments[0]?.method || 'other',
                        restaurantId: req.restaurantId,
                        orderId: orderId,
                        cashierId: openSession.id
                    }
                });
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error("Erro no pagamento parcial por valor:", error);
        res.status(500).json({ error: "Erro ao processar pagamento." });
    }
};

const partialItemPayment = async (req, res) => {
    const { tableId } = req.params;
    const { itemIds, payments } = req.body; // itemIds = IDs dos OrderItems sendo pagos agora

    try {
        if (!itemIds || itemIds.length === 0) return res.status(400).json({ error: "Nenhum item selecionado." });

        const table = await prisma.table.findUnique({ where: { id: tableId } });
        if (!table) return res.status(404).json({ error: "Mesa não encontrada" });

        await prisma.$transaction(async (tx) => {
            // 1. Marca os itens selecionados como pagos
            await tx.orderItem.updateMany({
                where: { id: { in: itemIds } },
                data: { isPaid: true }
            });

            // 2. Registra os pagamentos vinculados ao pedido do primeiro item
            const firstItem = await tx.orderItem.findUnique({ where: { id: itemIds[0] } });
            
            for (const p of payments) {
                await tx.payment.create({
                    data: {
                        orderId: firstItem.orderId,
                        amount: p.amount,
                        method: p.method
                    }
                });
            }

            // 3. Registra no caixa
            const openSession = await tx.cashierSession.findFirst({
                where: { restaurantId: req.restaurantId, status: 'OPEN' }
            });

            if (openSession) {
                const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
                await tx.financialTransaction.create({
                    data: {
                        description: `Pagamento Parcial Mesa ${table.number}`,
                        amount: totalPaid,
                        type: 'INCOME',
                        status: 'PAID',
                        dueDate: new Date(),
                        paymentDate: new Date(),
                        paymentMethod: payments[0]?.method || 'other',
                        restaurantId: req.restaurantId,
                        cashierId: openSession.id
                    }
                });
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error("Erro no pagamento parcial:", error);
        res.status(500).json({ error: "Erro ao processar pagamento parcial." });
    }
};

const getTableRequests = async (req, res) => {
    try { res.json(await prisma.tableRequest.findMany({ where: { restaurantId: req.restaurantId, status: 'PENDING' } })); }
    catch (error) { res.status(500).json({ error: 'Erro nos chamados.' }); }
};

const resolveTableRequest = async (req, res) => {
    const { id } = req.params;
    const { restaurantId } = req;
    
    try { 
        // Primeiro verificamos se o chamado pertence ao restaurante
        const request = await prisma.tableRequest.findFirst({
            where: { id, restaurantId }
        });

        if (!request) {
            return res.status(404).json({ error: 'Chamado não encontrado ou não pertence a este restaurante.' });
        }

        const updated = await prisma.tableRequest.update({ 
            where: { id: id }, 
            data: { status: 'DONE' } 
        });

        res.json({ success: true, updated });
    } catch (error) { 
        console.error("Erro ao resolver chamado:", error);
        res.status(500).json({ error: 'Erro ao resolver chamado.' }); 
    }
};

const checkTableExists = async (req, res) => {
    try {
        const { restaurantId, tableNumber } = req.query;
        if (!restaurantId || !tableNumber) return res.status(400).json({ error: "Dados incompletos" });

        const table = await prisma.table.findFirst({
            where: { 
                restaurantId: restaurantId,
                number: parseInt(tableNumber)
            }
        });

        if (table) {
            res.json({ exists: true, table });
        } else {
            res.json({ exists: false });
        }
    } catch (error) { res.status(500).json({ error: 'Erro ao verificar mesa.' }); }
};

const getClientTableOrder = async (req, res) => {
    try {
        const { restaurantId, tableNumber } = req.query;
        if (!restaurantId || !tableNumber) return res.status(400).json({ error: "Dados incompletos" });

        const order = await prisma.order.findFirst({
            where: {
                restaurantId: restaurantId,
                tableNumber: parseInt(tableNumber),
                status: { notIn: ['COMPLETED', 'CANCELED'] }
            },
            include: {
                items: {
                    include: { product: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(order || null);
    } catch (error) { res.status(500).json({ error: 'Erro ao buscar pedido da mesa.' }); }
};

const createClientTableRequest = async (req, res) => {
    try { 
        const { restaurantId, tableNumber, type } = req.body;
        const newRequest = await prisma.tableRequest.create({ 
            data: { 
                restaurantId,
                tableNumber: parseInt(tableNumber),
                type,
                status: 'PENDING'
            } 
        });
        res.status(201).json(newRequest); 
    }
    catch (error) { 
        console.error("Erro ao criar chamado:", error);
        res.status(500).json({ error: 'Erro ao criar chamado.' }); 
    }
};

const checkoutTable = async (req, res) => {
    const { tableId } = req.params;
    const { payments, orderIds } = req.body; // orderIds agora é opcional para fechar apenas algumas comandas

    try {
        const table = await prisma.table.findUnique({ where: { id: tableId } });
        if (!table) return res.status(404).json({ error: "Mesa não encontrada" });

        // Busca pedidos abertos. Se orderIds for enviado, filtra por eles.
        const openOrders = await prisma.order.findMany({
            where: {
                restaurantId: req.restaurantId,
                tableNumber: table.number,
                status: { notIn: ['COMPLETED', 'CANCELED'] },
                id: orderIds && orderIds.length > 0 ? { in: orderIds } : undefined
            }
        });

        if (openOrders.length === 0) return res.status(400).json({ error: "Nenhum pedido aberto selecionado para esta mesa." });

        // Transação para finalizar
        await prisma.$transaction(async (tx) => {
            // 1. Finaliza os pedidos selecionados
            await tx.order.updateMany({
                where: { id: { in: openOrders.map(o => o.id) } },
                data: { status: 'COMPLETED' }
            });

            // 2. Registra os pagamentos vinculados ao primeiro pedido do lote
            const mainOrderId = openOrders[0].id;
            for (const p of payments) {
                await tx.payment.create({
                    data: {
                        orderId: mainOrderId,
                        amount: p.amount,
                        method: p.method
                    }
                });
            }

            // 3. Verifica se ainda existem outros pedidos abertos na mesa
            const remainingOrders = await tx.order.count({
                where: {
                    restaurantId: req.restaurantId,
                    tableNumber: table.number,
                    status: { notIn: ['COMPLETED', 'CANCELED'] }
                }
            });

            // 4. SÓ LIBERA A MESA SE NÃO HOUVER MAIS NADA ABERTO
            if (remainingOrders === 0) {
                await tx.table.update({
                    where: { id: tableId },
                    data: { status: 'free' }
                });
            }

            // 5. Registra no caixa
            const openSession = await tx.cashierSession.findFirst({
                where: { restaurantId: req.restaurantId, status: 'OPEN' }
            });

            if (openSession && payments.length > 0) {
                const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
                
                // Melhorar descrição: incluir nomes das comandas fechadas
                const names = openOrders.map(o => o.customerName).filter(Boolean).join(', ');
                const description = `Venda Mesa ${table.number}${names ? ': ' + names : ''}`;

                await tx.financialTransaction.create({
                    data: {
                        description: description,
                        amount: totalPaid,
                        type: 'INCOME',
                        status: 'PAID',
                        dueDate: new Date(),
                        paymentDate: new Date(),
                        paymentMethod: payments[0]?.method || 'other',
                        restaurantId: req.restaurantId,
                        orderId: mainOrderId, // Vincula para fins fiscais
                        cashierId: openSession.id
                    }
                });
            }
        });

        // 6. EMISSÃO AUTOMÁTICA (FORA DA TRANSAÇÃO PARA NÃO TRAVAR O BANCO)
        try {
            const fiscalConfig = await prisma.restaurantFiscalConfig.findUnique({
                where: { restaurantId: req.restaurantId }
            });

            if (fiscalConfig && fiscalConfig.emissionMode === 'AUTOMATIC') {
                const FiscalService = require('../services/FiscalService');
                for (const order of openOrders) {
                    const fullOrder = await prisma.order.findUnique({
                        where: { id: order.id },
                        include: { items: { include: { product: true } } }
                    });
                    await FiscalService.autorizarNfce(fullOrder, fiscalConfig, fullOrder.items);
                }
            }
        } catch (e) {
            console.error("[FISCAL] Erro na emissão automática via Checkout:", e.message);
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Erro no checkout:", error);
        res.status(500).json({ error: "Erro ao fechar conta." });
    }
};

module.exports = {
    getTables,
    createTable,
    getPosTablesSummary,
    getTableRequests,
    resolveTableRequest,
    checkTableExists,
    getClientTableOrder,
    createClientTableRequest,
    checkoutTable,
    partialItemPayment,
    partialValuePayment
};
