const prisma = require('../lib/prisma');
const asyncHandler = require('../middlewares/asyncHandler');
const { PUBLIC_PRODUCT_SELECT, applyAddonGroupOrder } = require('../utils/productUtils');

class CategoryController {
  getCategoriesHierarchy = asyncHandler(async (req, res) => {
    const categories = await prisma.category.findMany({
      where: { restaurantId: req.restaurantId },
      include: {
        products: {
            include: {
                sizes: true,
                addonGroups: {
                    orderBy: { order: 'asc' },
                    include: {
                        addons: { orderBy: { order: 'asc' } }
                    }
                },
                promotions: true
            },
            orderBy: { order: 'asc' }
        },
        addonGroups: { orderBy: { order: 'asc' } }
      },
      orderBy: { order: 'asc' }
    });
    res.json(categories);
  });

  getCategoriesFlat = asyncHandler(async (req, res) => {
    const categories = await prisma.category.findMany({
      where: { restaurantId: req.restaurantId },
      orderBy: { order: 'asc' }
    });
    res.json(categories);
  });

  // ROTA CLIENTE (Segura)
  getClientCategories = asyncHandler(async (req, res) => {
    const { restaurantId } = req.params;
    const categories = await prisma.category.findMany({
      where: { 
        restaurantId,
        isActive: true
      },
      include: {
        addonGroups: {
          orderBy: { order: 'asc' },
          include: {
            addons: { 
              select: {
                id: true, name: true, price: true, maxQuantity: true, order: true
              },
              orderBy: { order: 'asc' } 
            }
          }
        },
        products: {
          where: { isAvailable: true, showInMenu: true },
          select: PUBLIC_PRODUCT_SELECT, // Segurança: Não vaza custos/NCM
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { order: 'asc' }
    });

    // Usa o utilitário centralizado para ordenação
    const sortedCategories = categories.map(category => {
        if (category.products) {
            category.products = category.products.map(product => applyAddonGroupOrder(product));
        }
        return category;
    });

    res.json(sortedCategories);
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
      res.status(404);
      throw new Error('Categoria não encontrada');
    }
    res.json(category);
  });

  createCategory = asyncHandler(async (req, res) => {
    const { addonGroups, ...rest } = req.body;
    const category = await prisma.category.create({
      data: {
        ...rest,
        restaurant: { connect: { id: req.restaurantId } },
        ...(addonGroups && Array.isArray(addonGroups) && addonGroups.length > 0
          ? { addonGroups: { connect: addonGroups.map(id => ({ id })) } }
          : {})
      }
    });
    res.status(201).json(category);
  });

  updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { addonGroups, ...rest } = req.body;
    const category = await prisma.category.update({
      where: { id },
      data: {
        ...rest,
        ...(addonGroups !== undefined && Array.isArray(addonGroups)
          ? { addonGroups: { set: addonGroups.map(id => ({ id })) } }
          : {})
      }
    });
    res.json(category);
  });

  deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.category.delete({ where: { id } });
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
