const prisma = require('../lib/prisma');
const InventoryService = require('../services/InventoryService');
const asyncHandler = require('../middlewares/asyncHandler');
const { CreateStockEntrySchema } = require('../schemas/inventorySchema');

class StockController {
    
    // GET /api/stock/entries
    getEntries = asyncHandler(async (req, res) => {
        const entries = await prisma.stockEntry.findMany({
            where: { restaurantId: req.restaurantId },
            include: { supplier: true, items: { include: { ingredient: true } } },
            orderBy: { receivedAt: 'desc' }
        });
        res.json(entries);
    });

    // POST /api/stock/entries
    createEntry = asyncHandler(async (req, res) => {
        const validatedData = CreateStockEntrySchema.parse(req.body);
        const totalAmount = validatedData.items.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);

        const newEntry = await prisma.stockEntry.create({
            data: {
                restaurantId: req.restaurantId,
                supplierId: validatedData.supplierId,
                invoiceNumber: validatedData.invoiceNumber,
                totalAmount,
                receivedAt: validatedData.receivedAt,
                status: 'PENDING',
                items: {
                    create: validatedData.items.map(i => ({
                        ingredientId: i.ingredientId,
                        quantity: i.quantity,
                        unitCost: i.unitCost,
                        batch: i.batch,
                        expirationDate: i.expirationDate
                    }))
                }
            },
            include: { items: true }
        });

        res.status(201).json(newEntry);
    });

    // PUT /api/stock/entries/:id/confirm
    confirmEntry = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const result = await prisma.$transaction(async (tx) => {
            return await InventoryService.confirmStockEntry(id, tx);
        });
        res.json(result);
    });

    // DELETE /api/stock/entries/:id
    deleteEntry = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const entry = await prisma.stockEntry.findUnique({ where: { id } });
        
        if (!entry) {
            res.status(404);
            throw new Error('Entrada não encontrada.');
        }
        if (entry.status === 'CONFIRMED') {
            res.status(400);
            throw new Error('Não é possível excluir uma entrada já confirmada.');
        }
        
        await prisma.stockEntry.delete({ where: { id } });
        res.status(204).send();
    });

    // POST /api/stock/audit
    auditInventory = asyncHandler(async (req, res) => {
        const { items } = req.body; 
        const { restaurantId } = req;
        const userId = req.user.id;

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
                    await tx.stockLoss.create({
                        data: {
                            restaurantId,
                            ingredientId: item.ingredientId,
                            userId,
                            quantity: Math.abs(diff),
                            reason: 'AUDIT_ADJUSTMENT',
                            notes: `Ajuste de Inventário. Anterior: ${ingredient.stock}`,
                            unitCostSnapshot: ingredient.lastUnitCost || 0
                        }
                    });
                } else {
                    await tx.stockEntry.create({
                        data: {
                            restaurantId,
                            status: 'CONFIRMED',
                            invoiceNumber: 'AJUSTE_BALANCO',
                            totalAmount: 0,
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

                await tx.ingredient.update({
                    where: { id: item.ingredientId },
                    data: { stock: parseFloat(item.physicalStock) }
                });

                auditLogs.push({ ingredientId: item.ingredientId, diff });
            }
            return auditLogs;
        });

        res.json({ success: true, adjustedItems: results.length });
    });
}

module.exports = new StockController();