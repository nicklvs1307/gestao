const prisma = require('../lib/prisma');

const ProductionController = {
    // GET /api/production/history
    async getHistory(req, res) {
        try {
            const logs = await prisma.productionLog.findMany({
                where: { restaurantId: req.restaurantId },
                include: { ingredient: true },
                orderBy: { producedAt: 'desc' },
                take: 50
            });
            res.json(logs);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar histórico de produção.' });
        }
    },

    // POST /api/production
    async produce(req, res) {
        const { ingredientId, quantity } = req.body;
        const restaurantId = req.restaurantId;

        try {
            const result = await prisma.$transaction(async (tx) => {
                // 1. Busca o ingrediente e sua receita
                const ingredient = await tx.ingredient.findUnique({
                    where: { id: ingredientId },
                    include: { recipe: { include: { componentIngredient: true } } }
                });

                if (!ingredient || !ingredient.isProduced) {
                    throw new Error('Este item não é um produto beneficiado.');
                }

                if (!ingredient.recipe || ingredient.recipe.length === 0) {
                    throw new Error('Este item não possui receita de produção cadastrada.');
                }

                // 2. Verifica estoque e dá baixa nos componentes
                for (const item of ingredient.recipe) {
                    const needed = item.quantity * quantity;
                    if (item.componentIngredient.stock < needed) {
                        throw new Error(`Estoque insuficiente de ${item.componentIngredient.name}. Necessário: ${needed}${item.componentIngredient.unit}, Disponível: ${item.componentIngredient.stock}${item.componentIngredient.unit}`);
                    }

                    await tx.ingredient.update({
                        where: { id: item.componentIngredientId },
                        data: { stock: { decrement: needed } }
                    });
                }

                // 3. Aumenta o estoque do item produzido
                const updatedIngredient = await tx.ingredient.update({
                    where: { id: ingredientId },
                    data: { stock: { increment: quantity } }
                });

                // 4. Registra no log
                const log = await tx.productionLog.create({
                    data: {
                        restaurantId,
                        ingredientId,
                        quantity,
                        producedAt: new Date()
                    }
                });

                return { updatedIngredient, log };
            });

            res.status(201).json(result);
        } catch (error) {
            console.error(error);
            res.status(400).json({ error: error.message });
        }
    },

    // GET /api/ingredients/recipes
    async getRecipes(req, res) {
        try {
            const ingredients = await prisma.ingredient.findMany({
                where: { 
                    restaurantId: req.restaurantId,
                    isProduced: true
                },
                include: { 
                    recipe: { 
                        include: { componentIngredient: true } 
                    } 
                },
                orderBy: { name: 'asc' }
            });
            res.json(ingredients);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar receitas.' });
        }
    },

    // POST /api/ingredients/:id/recipe
    async saveRecipe(req, res) {
        const { id } = req.params;
        const { items } = req.body; // Array de { componentIngredientId, quantity }

        try {
            await prisma.$transaction(async (tx) => {
                // Limpa receita anterior
                await tx.ingredientRecipe.deleteMany({
                    where: { producedIngredientId: id }
                });

                // Cria a nova
                if (items && items.length > 0) {
                    await tx.ingredientRecipe.createMany({
                        data: items.map(item => ({
                            producedIngredientId: id,
                            componentIngredientId: item.componentIngredientId,
                            quantity: item.quantity
                        }))
                    });
                }

                // Marca ingrediente como produzido
                await tx.ingredient.update({
                    where: { id },
                    data: { isProduced: true }
                });
            });

            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao salvar receita.' });
        }
    }
};

module.exports = ProductionController;