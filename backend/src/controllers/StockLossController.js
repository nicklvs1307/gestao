const prisma = require('../lib/prisma');

const StockLossController = {
    // GET /api/stock/losses
    async getAll(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const where = { restaurantId: req.restaurantId };

            if (startDate && endDate) {
                where.lossDate = {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                };
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
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao buscar perdas.' });
        }
    },

    // POST /api/stock/losses
    async create(req, res) {
        const { ingredientId, quantity, reason, notes } = req.body;
        const userId = req.user.id;

        if (!ingredientId || !quantity || !reason) {
            return res.status(400).json({ error: 'Dados incompletos.' });
        }

        try {
            const result = await prisma.$transaction(async (tx) => {
                // 1. Busca o insumo para pegar o custo atual e validar
                const ingredient = await tx.ingredient.findUnique({
                    where: { id: ingredientId }
                });

                if (!ingredient) throw new Error('Insumo não encontrado.');

                // 2. Registra a Perda
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

                // 3. Baixa no Estoque
                await tx.ingredient.update({
                    where: { id: ingredientId },
                    data: {
                        stock: { decrement: parseFloat(quantity) }
                    }
                });

                return loss;
            });

            res.status(201).json(result);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message || 'Erro ao registrar perda.' });
        }
    }
};

module.exports = StockLossController;