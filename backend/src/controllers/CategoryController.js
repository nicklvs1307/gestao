const prisma = require('../lib/prisma');
const asyncHandler = require('../middlewares/asyncHandler');
const { CreateCategorySchema, UpdateCategorySchema, ReorderCategoriesSchema } = require('../schemas/categorySchema');

class CategoryController {
  // Buscar todas as categorias com produtos
  getCategories = asyncHandler(async (req, res) => {
    const categories = await prisma.category.findMany({
      where: { restaurantId: req.restaurantId },
      include: {
        products: {
            include: {
                sizes: true,
                addonGroups: {
                    include: {
                        addons: true
                    }
                },
                promotions: true
            },
            orderBy: { order: 'asc' }
        },
        addonGroups: true
      },
      orderBy: { order: 'asc' }
    });
    res.json(categories);
  });

  // Buscar categorias "flat" (sem aninhamento profundo para seletores)
  getFlatCategories = asyncHandler(async (req, res) => {
    const categories = await prisma.category.findMany({
      where: { restaurantId: req.restaurantId },
      orderBy: { order: 'asc' }
    });
    res.json(categories);
  });

  createCategory = asyncHandler(async (req, res) => {
    const { 
        name, description, cuisineType, order, saiposIntegrationCode, 
        isActive, allowDelivery, allowPos, allowOnline,
        availableDays, startTime, endTime 
    } = req.body;

    const category = await prisma.category.create({
      data: {
        name,
        description,
        cuisineType,
        order: order || 0,
        saiposIntegrationCode,
        isActive: isActive !== undefined ? isActive : true,
        allowDelivery: allowDelivery !== undefined ? allowDelivery : true,
        allowPos: allowPos !== undefined ? allowPos : true,
        allowOnline: allowOnline !== undefined ? allowOnline : true,
        availableDays,
        startTime,
        endTime,
        restaurant: { connect: { id: req.restaurantId } }
      }
    });
    res.status(201).json(category);
  });

  getCategoryById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: true,
        addonGroups: true
      }
    });
    if (!category) {
      return res.status(404).json({ message: 'Categoria não encontrada' });
    }
    res.json(category);
  });

  updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { 
        name, description, cuisineType, order, saiposIntegrationCode, 
        isActive, allowDelivery, allowPos, allowOnline,
        availableDays, startTime, endTime 
    } = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        description,
        cuisineType,
        order,
        saiposIntegrationCode,
        isActive,
        allowDelivery,
        allowPos,
        allowOnline,
        availableDays,
        startTime,
        endTime
      }
    });
    res.json(category);
  });

  deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.category.delete({
      where: { id }
    });
    res.status(204).send();
  });

  reorderCategories = asyncHandler(async (req, res) => {
    const { items } = req.body;
    
    await prisma.$transaction(
        items.map(item => 
            prisma.category.update({
                where: { id: item.id },
                data: { order: item.order }
            })
        )
    );
    res.json({ success: true });
  });
}

module.exports = new CategoryController();
