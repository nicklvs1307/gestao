const prisma = require('../lib/prisma');
const asyncHandler = require('../middlewares/asyncHandler');

class StockHistoryController {
    
    // GET /api/stock/history
    getHistory = asyncHandler(async (req, res) => {
        const { startDate, endDate, ingredientId, type, page = 1, limit = 50 } = req.query;
        const restaurantId = req.restaurantId;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const moves = [];

        // 1. Entradas de Estoque (StockEntryItem)
        if (!type || type === 'ENTRY') {
            const entryWhere = {
                stockEntry: { restaurantId, status: 'CONFIRMED' }
            };
            if (ingredientId) entryWhere.ingredientId = ingredientId;
            if (startDate || endDate) {
                entryWhere.stockEntry.receivedAt = {};
                if (startDate) entryWhere.stockEntry.receivedAt.gte = new Date(startDate);
                if (endDate) entryWhere.stockEntry.receivedAt.lte = new Date(endDate);
            }

            const entries = await prisma.stockEntryItem.findMany({
                where: entryWhere,
                include: { 
                    ingredient: { select: { name: true, unit: true } },
                    stockEntry: { select: { receivedAt: true, invoiceNumber: true } }
                }
            });

            entries.forEach(e => moves.push({
                date: e.stockEntry.receivedAt,
                type: 'ENTRY',
                typeName: 'Entrada',
                ingredientId: e.ingredientId,
                ingredientName: e.ingredient.name,
                unit: e.ingredient.unit,
                quantity: e.quantity,
                unitCost: e.unitCost || 0,
                totalCost: (e.quantity * (e.unitCost || 0)),
                notes: `NF: ${e.stockEntry.invoiceNumber || 'S/N'}`,
                reference: e.stockEntryId
            }));
        }

        // 2. Perdas (StockLoss)
        if (!type || type === 'LOSS') {
            const lossWhere = { restaurantId };
            if (ingredientId) lossWhere.ingredientId = ingredientId;
            if (startDate || endDate) {
                lossWhere.lossDate = {};
                if (startDate) lossWhere.lossDate.gte = new Date(startDate);
                if (endDate) lossWhere.lossDate.lte = new Date(endDate);
            }

            const losses = await prisma.stockLoss.findMany({
                where: lossWhere,
                include: { ingredient: { select: { name: true, unit: true } } }
            });

            losses.forEach(l => moves.push({
                date: l.lossDate,
                type: 'LOSS',
                typeName: 'Perda',
                ingredientId: l.ingredientId,
                ingredientName: l.ingredient.name,
                unit: l.ingredient.unit,
                quantity: -l.quantity,
                unitCost: l.unitCostSnapshot || 0,
                totalCost: -(l.quantity * (l.unitCostSnapshot || 0)),
                notes: l.reason + (l.notes ? ` - ${l.notes}` : ''),
                reference: l.id
            }));
        }

        // 3. Produções (ProductionLog)
        if (!type || type === 'PRODUCTION') {
            const prodWhere = { restaurantId };
            if (ingredientId) prodWhere.ingredientId = ingredientId;
            if (startDate || endDate) {
                prodWhere.producedAt = {};
                if (startDate) prodWhere.producedAt.gte = new Date(startDate);
                if (endDate) prodWhere.producedAt.lte = new Date(endDate);
            }

            const productions = await prisma.productionLog.findMany({
                where: prodWhere,
                include: { ingredient: { select: { name: true, unit: true } } }
            });

            productions.forEach(p => moves.push({
                date: p.producedAt,
                type: 'PRODUCTION',
                typeName: 'Produção',
                ingredientId: p.ingredientId,
                ingredientName: p.ingredient.name,
                unit: p.ingredient.unit,
                quantity: p.quantity,
                unitCost: 0,
                totalCost: 0,
                notes: 'Produção interna',
                reference: p.id
            }));
        }

        // Ordenar por data desc
        moves.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Paginar
        const total = moves.length;
        const paginatedMoves = moves.slice(skip, skip + parseInt(limit));

        res.json({
            data: paginatedMoves,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    });
}

module.exports = new StockHistoryController();
