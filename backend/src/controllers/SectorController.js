const prisma = require('../lib/prisma');
const asyncHandler = require('../middlewares/asyncHandler');

class SectorController {
  index = asyncHandler(async (req, res) => {
    const { restaurantId } = req;
    const sectors = await prisma.sector.findMany({
      where: { restaurantId },
      include: { _count: { select: { checklists: true, users: true } } },
      orderBy: { name: 'asc' }
    });
    res.json(sectors);
  });

  store = asyncHandler(async (req, res) => {
    const { restaurantId } = req;
    const { name, description } = req.body;
    
    const sector = await prisma.sector.create({
      data: { name, description, restaurantId }
    });
    res.status(201).json(sector);
  });

  update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const sector = await prisma.sector.update({
      where: { id },
      data: { name, description }
    });
    res.json(sector);
  });

  delete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.sector.delete({ where: { id } });
    res.json({ message: 'Setor excluído com sucesso.' });
  });
}

module.exports = new SectorController();
