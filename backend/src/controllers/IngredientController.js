const prisma = require('../lib/prisma');

const IngredientController = {
    // GET /api/ingredients
    async getAll(req, res) {
        try {
            const ingredients = await prisma.ingredient.findMany({
                where: { restaurantId: req.restaurantId },
                orderBy: { name: 'asc' }
            });
            res.json(ingredients);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar insumos.' });
        }
    },

    // POST /api/ingredients
    async create(req, res) {
        try {
            const { name, unit, stock, minStock, group } = req.body;
            const newIngredient = await prisma.ingredient.create({
                data: {
                    name,
                    unit,
                    group,
                    stock: parseFloat(stock) || 0,
                    minStock: parseFloat(minStock) || 0,
                    restaurantId: req.restaurantId
                }
            });
            res.status(201).json(newIngredient);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao criar insumo.' });
        }
    },

    // PUT /api/ingredients/:id
    async update(req, res) {
        try {
            const { id } = req.params;
            const { name, unit, stock, minStock, group } = req.body;
            const updated = await prisma.ingredient.update({
                where: { id },
                data: {
                    name,
                    unit,
                    group,
                    stock: parseFloat(stock),
                    minStock: parseFloat(minStock)
                }
            });
            res.json(updated);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao atualizar insumo.' });
        }
    },

    // DELETE /api/ingredients/:id
    async delete(req, res) {
        try {
            await prisma.ingredient.delete({ where: { id: req.params.id } });
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: 'Erro ao excluir insumo.' });
        }
    }
};

module.exports = IngredientController;
