const prisma = require('../lib/prisma');
const asyncHandler = require('../middlewares/asyncHandler');

class ShoppingListController {
    
    // GET /api/stock/shopping-list
    getShoppingList = asyncHandler(async (req, res) => {
        const { multiplier = 2 } = req.query;
        const restaurantId = req.restaurantId;
        const mult = parseFloat(multiplier) || 2;

        const ingredients = await prisma.ingredient.findMany({
            where: {
                restaurantId,
                controlStock: true,
                stock: { lte: prisma.raw('"minStock"') }
            },
            include: {
                group: { select: { name: true } },
                suppliers: {
                    include: { supplier: { select: { name: true, phone: true } } },
                    take: 1
                }
            },
            orderBy: { name: 'asc' }
        });

        // Filtrar manualmente onde stock <= minStock
        const belowMinStock = ingredients.filter(i => (i.stock || 0) <= (i.minStock || 0));

        const shoppingItems = belowMinStock.map(i => {
            const minStock = i.minStock || 0;
            const suggestedQty = Math.max(0, (minStock * mult) - (i.stock || 0));
            const avgCost = i.averageCost || i.lastUnitCost || 0;
            const supplier = i.suppliers?.[0]?.supplier || null;

            return {
                ingredientId: i.id,
                name: i.name,
                unit: i.unit,
                group: i.group?.name || null,
                currentStock: i.stock || 0,
                minStock,
                suggestedQty,
                estimatedCost: suggestedQty * avgCost,
                avgCostPerUnit: avgCost,
                supplier: supplier ? {
                    name: supplier.name,
                    phone: supplier.phone
                } : null
            };
        });

        const totalEstimatedCost = shoppingItems.reduce((acc, item) => acc + item.estimatedCost, 0);

        res.json({
            items: shoppingItems,
            summary: {
                totalItems: shoppingItems.length,
                totalEstimatedCost,
                multiplier: mult
            }
        });
    });

    // POST /api/stock/shopping-list/export
    exportCSV = asyncHandler(async (req, res) => {
        const { multiplier = 2 } = req.body;
        const restaurantId = req.restaurantId;

        const ingredients = await prisma.ingredient.findMany({
            where: { restaurantId, controlStock: true },
            include: {
                suppliers: {
                    include: { supplier: { select: { name: true } } },
                    take: 1
                }
            }
        });

        const belowMinStock = ingredients.filter(i => (i.stock || 0) <= (i.minStock || 0));
        const mult = parseFloat(multiplier) || 2;

        const csvRows = ['Ingrediente,Unidade,Estoque Atual,Estoque Mínimo,Quantidade Sugerida,Custo Estimado,Fornecedor'];

        belowMinStock.forEach(i => {
            const suggestedQty = Math.max(0, ((i.minStock || 0) * mult) - (i.stock || 0));
            const cost = suggestedQty * (i.averageCost || i.lastUnitCost || 0);
            const supplier = i.suppliers?.[0]?.supplier?.name || '';
            csvRows.push(`"${i.name}","${i.unit}",${i.stock || 0},${i.minStock || 0},${suggestedQty.toFixed(2)},${cost.toFixed(2)},"${supplier}"`);
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=lista-compras.csv');
        res.send('\uFEFF' + csvRows.join('\n'));
    });
}

module.exports = new ShoppingListController();
