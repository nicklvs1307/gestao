const prisma = require('../lib/prisma');
const asyncHandler = require('../middlewares/asyncHandler');

class StockLossController {
    
    // GET /api/stock/losses
    getAll = asyncHandler(async (req, res) => {
        const { startDate, endDate } = req.query;
        const where = { restaurantId: req.restaurantId };

        if (startDate && endDate) {
            where.lossDate = { gte: new Date(startDate), lte: new Date(endDate) };
        }

        const losses = await prisma.stockLoss.findMany({
            where,
            include: { 
                ingredient: true,
                user: { select: { name: true } } 
            },
            orderBy: { lossDate: 'desc' }
        });
        res.json(losses);
    });

    // POST /api/stock/losses
    create = asyncHandler(async (req, res) => {
        const { ingredientId, quantity, reason, notes } = req.body;
        const userId = req.user.id;

        if (!ingredientId || !quantity || !reason) {
            res.status(400);
            throw new Error('Dados incompletos.');
        }

        const result = await prisma.$transaction(async (tx) => {
            const ingredient = await tx.ingredient.findUnique({
                where: { id: ingredientId }
            });

            if (!ingredient) throw new Error('Insumo não encontrado.');

            const loss = await tx.stockLoss.create({
                data: {
                    restaurantId: req.restaurantId,
                    ingredientId,
                    userId,
                    quantity: parseFloat(quantity),
                    reason,
                    notes,
                    unitCostSnapshot: ingredient.lastUnitCost || 0,
                    lossDate: new Date()
                }
            });

            await tx.ingredient.update({
                where: { id: ingredientId },
                data: { stock: { decrement: parseFloat(quantity) } }
            });

            return loss;
        });

        res.status(201).json(result);
    });
}

module.exports = new StockLossController();