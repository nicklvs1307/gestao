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
      data: validatedData
    });
    res.json(updated);
  });

  // DELETE /api/ingredients/:id
  delete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.ingredient.delete({ where: { id } });
    res.status(204).send();
  });
}

module.exports = new IngredientController();