const prisma = require('../lib/prisma');
const asyncHandler = require('../middlewares/asyncHandler');
const { CreateGlobalSizeSchema, UpdateGlobalSizeSchema } = require('../schemas/globalSizeSchema');

class GlobalSizeController {
  
  // GET /api/global-sizes
  getAll = asyncHandler(async (req, res) => {
    const sizes = await prisma.globalSize.findMany({
      where: { restaurantId: req.restaurantId },
      orderBy: { name: 'asc' },
    });
    res.json(sizes);
  });

  // POST /api/global-sizes
  create = asyncHandler(async (req, res) => {
    const validatedData = CreateGlobalSizeSchema.parse(req.body);

    const size = await prisma.globalSize.create({
      data: {
        ...validatedData,
        restaurantId: req.restaurantId,
      },
    });
    res.status(201).json(size);
  });

  // PUT /api/global-sizes/:id
  update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const validatedData = UpdateGlobalSizeSchema.parse(req.body);

    const size = await prisma.globalSize.update({
      where: { id },
      data: validatedData,
    });
    res.json(size);
  });

  // DELETE /api/global-sizes/:id
  delete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.globalSize.delete({ where: { id } });
    res.status(204).send();
  });
}

module.exports = new GlobalSizeController();
