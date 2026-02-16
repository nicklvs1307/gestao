const prisma = require('../lib/prisma');
const asyncHandler = require('../middlewares/asyncHandler');
const { IngredientSchema } = require('../schemas/inventorySchema');

class IngredientController {
  
  // GET /api/ingredients
  getAll = asyncHandler(async (req, res) => {
    const ingredients = await prisma.ingredient.findMany({
      where: { restaurantId: req.restaurantId },
      orderBy: { name: 'asc' }
    });
    res.json(ingredients);
  });

  // POST /api/ingredients
  create = asyncHandler(async (req, res) => {
    const validatedData = IngredientSchema.parse(req.body);
    const newIngredient = await prisma.ingredient.create({
      data: {
        ...validatedData,
        stock: Number(validatedData.stock || 0),
        minStock: Number(validatedData.minStock || 0),
        averageCost: Number(validatedData.averageCost || 0),
        restaurantId: req.restaurantId
      }
    });
    res.status(201).json(newIngredient);
  });

  // PUT /api/ingredients/:id
  update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const validatedData = IngredientSchema.parse(req.body);
    const updated = await prisma.ingredient.update({
      where: { id },
      data: {
        ...validatedData,
        stock: Number(validatedData.stock || 0),
        minStock: Number(validatedData.minStock || 0),
        averageCost: Number(validatedData.averageCost || 0)
      }
    });
    res.json(updated);
  });

  // DELETE /api/ingredients/:id
  delete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.ingredient.delete({ where: { id } });
    res.status(204).send();
  });

  // === GRUPOS DE INGREDIENTES ===

  // GET /api/ingredients/groups
  getGroups = asyncHandler(async (req, res) => {
    const groups = await prisma.ingredientGroup.findMany({
      where: { restaurantId: req.restaurantId },
      orderBy: { name: 'asc' }
    });
    res.json(groups);
  });

  // POST /api/ingredients/groups
  createGroup = asyncHandler(async (req, res) => {
    const { name, parentId } = req.body;
    const newGroup = await prisma.ingredientGroup.create({
      data: {
        name,
        parentId,
        restaurantId: req.restaurantId
      }
    });
    res.status(201).json(newGroup);
  });

  // DELETE /api/ingredients/groups/:id
  deleteGroup = asyncHandler(async (req, res) => {
    const { id } = req.params;
    // Prisma cuidará da integridade ou podemos impedir se houver sub-itens
    await prisma.ingredientGroup.delete({ where: { id } });
    res.status(204).send();
  });

  // === RECEITAS DE INSUMOS BENEFICIADOS ===

  // GET /api/ingredients/:id/recipe
  getRecipe = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const recipe = await prisma.ingredientRecipe.findMany({
      where: { producedIngredientId: id },
      include: { componentIngredient: true }
    });
    res.json(recipe);
  });

  // POST /api/ingredients/:id/recipe
  saveRecipe = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { items, yieldAmount } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Limpa receita anterior
      await tx.ingredientRecipe.deleteMany({
        where: { producedIngredientId: id }
      });

      // Cria nova receita
      const created = await Promise.all(items.map(item => 
        tx.ingredientRecipe.create({
          data: {
            producedIngredientId: id,
            componentIngredientId: item.componentIngredientId,
            quantity: Number(item.quantity),
            yieldAmount: Number(yieldAmount || 1)
          }
        })
      ));

      return created;
    });

    res.json(result);
  });
}

module.exports = new IngredientController();