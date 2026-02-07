const prisma = require('../lib/prisma');
const InventoryService = require('../services/InventoryService');
const asyncHandler = require('../middlewares/asyncHandler');
const { ProductionSchema, SaveRecipeSchema } = require('../schemas/inventorySchema');

class ProductionController {
    
    // GET /api/production/history
    getHistory = asyncHandler(async (req, res) => {
        const logs = await prisma.productionLog.findMany({
            where: { restaurantId: req.restaurantId },
            include: { ingredient: true },
            orderBy: { producedAt: 'desc' },
            take: 50
        });
        res.json(logs);
    });

    // POST /api/production/produce
    produce = asyncHandler(async (req, res) => {
        const validatedData = ProductionSchema.parse(req.body);
        
        const result = await prisma.$transaction(async (tx) => {
            return await InventoryService.processProduction(req.restaurantId, validatedData, tx);
        });

        res.status(201).json(result);
    });

    // GET /api/production/recipes (Moved from ingredients logic)
    getRecipes = asyncHandler(async (req, res) => {
        const ingredients = await prisma.ingredient.findMany({
            where: { 
                restaurantId: req.restaurantId,
                isProduced: true
            },
            include: { 
                recipe: { include: { componentIngredient: true } } 
            },
            orderBy: { name: 'asc' }
        });
        res.json(ingredients);
    });

    // POST /api/production/:id/recipe
    saveRecipe = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const validatedData = SaveRecipeSchema.parse(req.body);

        await prisma.$transaction(async (tx) => {
            await tx.ingredientRecipe.deleteMany({
                where: { producedIngredientId: id }
            });

            await tx.ingredientRecipe.createMany({
                data: validatedData.items.map(item => ({
                    producedIngredientId: id,
                    componentIngredientId: item.componentIngredientId,
                    quantity: item.quantity
                }))
            });

            await tx.ingredient.update({
                where: { id },
                data: { isProduced: true }
            });
        });

        res.json({ success: true });
    });
}

module.exports = new ProductionController();