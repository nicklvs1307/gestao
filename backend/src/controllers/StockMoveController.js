const prisma = require('../lib/prisma');
const asyncHandler = require('../middlewares/asyncHandler');

class StockMoveController {
    
    // GET /api/stock/moves
    getMoves = asyncHandler(async (req, res) => {
        const { startDate, endDate, ingredientId, type, page = 1, limit = 50 } = req.query;
        const restaurantId = req.restaurantId;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const allMoves = [];

        // 1. Entradas confirmadas
        if (!type || type === 'ENTRY') {
            const entryWhere = { stockEntry: { restaurantId, status: 'CONFIRMED' } };
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
                    stockEntry: { select: { receivedAt: true, invoiceNumber: true, supplier: { select: { name: true } } } }
                }
            });

            entries.forEach(e => allMoves.push({
                date: e.stockEntry.receivedAt,
                type: 'ENTRY',
                typeName: 'Entrada',
                ingredientName: e.ingredient.name,
                unit: e.ingredient.unit,
                quantity: e.quantity,
                unitCost: e.unitCost || 0,
                totalCost: e.quantity * (e.unitCost || 0),
                description: `NF ${e.stockEntry.invoiceNumber || 'S/N'}`,
                party: e.stockEntry.supplier?.name || '-'
            }));
        }

        // 2. Perdas
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
                include: {
                    ingredient: { select: { name: true, unit: true } },
                    user: { select: { name: true } }
                }
            });

            losses.forEach(l => allMoves.push({
                date: l.lossDate,
                type: 'LOSS',
                typeName: 'Perda',
                ingredientName: l.ingredient.name,
                unit: l.ingredient.unit,
                quantity: -l.quantity,
                unitCost: l.unitCostSnapshot || 0,
                totalCost: -(l.quantity * (l.unitCostSnapshot || 0)),
                description: l.reason,
                party: l.user?.name || '-'
            }));
        }

        // 3. Produções
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

            productions.forEach(p => allMoves.push({
                date: p.producedAt,
                type: 'PRODUCTION',
                typeName: 'Produção',
                ingredientName: p.ingredient.name,
                unit: p.ingredient.unit,
                quantity: p.quantity,
                unitCost: 0,
                totalCost: 0,
                description: 'Produção interna',
                party: '-'
            }));
        }

        // Ordenar
        allMoves.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Summary
        const totalEntries = allMoves.filter(m => m.type === 'ENTRY').reduce((acc, m) => acc + m.totalCost, 0);
        const totalLosses = allMoves.filter(m => m.type === 'LOSS').reduce((acc, m) => acc + Math.abs(m.totalCost), 0);
        const totalProductions = allMoves.filter(m => m.type === 'PRODUCTION').length;

        // Paginar
        const total = allMoves.length;
        const paginatedMoves = allMoves.slice(skip, skip + parseInt(limit));

        res.json({
            moves: paginatedMoves,
            summary: {
                totalEntries,
                totalLosses,
                totalProductions,
                netVariation: totalEntries - totalLosses
            },
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    });
}

module.exports = new StockMoveController();
