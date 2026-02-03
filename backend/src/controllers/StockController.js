const prisma = require('../lib/prisma');

const StockController = {
    // GET /api/stock/entries
    async getEntries(req, res) {
        try {
            const entries = await prisma.stockEntry.findMany({
                where: { restaurantId: req.restaurantId },
                include: { supplier: true, items: { include: { ingredient: true } } },
                orderBy: { receivedAt: 'desc' }
            });
            res.json(entries);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar entradas de estoque.' });
        }
    },

    // POST /api/stock/entries
    async createEntry(req, res) {
        try {
            const { supplierId, invoiceNumber, receivedAt, items, generateTransaction } = req.body;
            
            const totalAmount = items.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);

            const newEntry = await prisma.stockEntry.create({
                data: {
                    restaurantId: req.restaurantId,
                    supplierId,
                    invoiceNumber,
                    totalAmount,
                    receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
                    status: 'PENDING',
                    items: {
                        create: items.map(i => ({
                            ingredientId: i.ingredientId,
                            quantity: parseFloat(i.quantity),
                            unitCost: parseFloat(i.unitCost),
                            batch: i.batch || null,
                            expirationDate: i.expirationDate ? new Date(i.expirationDate) : null
                        }))
                    }
                },
                include: { items: true }
            });

            res.status(201).json(newEntry);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao registrar entrada.' });
        }
    },

    // PUT /api/stock/entries/:id/confirm
    async confirmEntry(req, res) {
        const { id } = req.params;
        try {
            const entry = await prisma.stockEntry.findUnique({
                where: { id },
                include: { items: true }
            });

            if (!entry) return res.status(404).json({ error: 'Entrada não encontrada.' });
            if (entry.status === 'CONFIRMED') return res.status(400).json({ error: 'Esta entrada já foi confirmada.' });

            await prisma.$transaction(async (tx) => {
                // 1. Atualizar estoque de cada ingrediente
                for (const item of entry.items) {
                    await tx.ingredient.update({
                        where: { id: item.ingredientId },
                        data: {
                            stock: { increment: item.quantity },
                            lastUnitCost: item.unitCost
                        }
                    });
                }

                // 2. Gerar Transação Financeira (Despesa)
                const transaction = await tx.financialTransaction.create({
                    data: {
                        description: `Compra NF #${entry.invoiceNumber || entry.id.slice(-4)}`,
                        amount: entry.totalAmount,
                        type: 'EXPENSE',
                        status: 'PENDING', // Fica a pagar
                        dueDate: new Date(),
                        restaurantId: entry.restaurantId,
                        supplierId: entry.supplierId
                    }
                });

                // 3. Confirmar a Entrada
                await tx.stockEntry.update({
                    where: { id },
                    data: { 
                        status: 'CONFIRMED',
                        transactionId: transaction.id
                    }
                });
            });

            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao confirmar entrada.' });
        }
    },

    // DELETE /api/stock/entries/:id
    async deleteEntry(req, res) {
        try {
            const entry = await prisma.stockEntry.findUnique({ where: { id: req.params.id } });
            if (entry.status === 'CONFIRMED') return res.status(400).json({ error: 'Não é possível excluir uma entrada já confirmada.' });
            
            await prisma.stockEntry.delete({ where: { id: req.params.id } });
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: 'Erro ao excluir entrada.' });
        }
    },

    // POST /api/stock/audit
    async auditInventory(req, res) {
        const { items } = req.body; // Array de { ingredientId, physicalStock }
        const { restaurantId } = req;
        const userId = req.user.id;

        try {
            const results = await prisma.$transaction(async (tx) => {
                const auditLogs = [];

                for (const item of items) {
                    const ingredient = await tx.ingredient.findUnique({
                        where: { id: item.ingredientId }
                    });

                    if (!ingredient) continue;

                    const diff = parseFloat(item.physicalStock) - ingredient.stock;

                    if (diff === 0) continue;

                    if (diff < 0) {
                        // Perda (Estoque físico menor que o sistema)
                        await tx.stockLoss.create({
                            data: {
                                restaurantId,
                                ingredientId: item.ingredientId,
                                userId,
                                quantity: Math.abs(diff),
                                reason: 'AUDIT_ADJUSTMENT',
                                notes: `Ajuste de Inventário (Balanço). Anterior: ${ingredient.stock}`,
                                unitCostSnapshot: ingredient.lastUnitCost || 0
                            }
                        });
                    } else {
                        // Sobra (Estoque físico maior que o sistema) - Criamos uma entrada de ajuste
                        await tx.stockEntry.create({
                            data: {
                                restaurantId,
                                status: 'CONFIRMED',
                                invoiceNumber: 'AJUSTE_BALANCO',
                                totalAmount: 0,
                                notes: `Ajuste de Inventário (Balanço). Anterior: ${ingredient.stock}`,
                                items: {
                                    create: {
                                        ingredientId: item.ingredientId,
                                        quantity: diff,
                                        unitCost: ingredient.lastUnitCost || 0
                                    }
                                }
                            }
                        });
                    }

                    // Atualiza o saldo final para bater com o físico
                    await tx.ingredient.update({
                        where: { id: item.ingredientId },
                        data: { stock: parseFloat(item.physicalStock) }
                    });

                    auditLogs.push({ ingredientId: item.ingredientId, diff });
                }
                return auditLogs;
            });

            res.json({ success: true, adjustedItems: results.length });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao processar balanço.' });
        }
    }
};

module.exports = StockController;
