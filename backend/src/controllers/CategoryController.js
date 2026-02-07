const prisma = require('../lib/prisma');
const asyncHandler = require('../middlewares/asyncHandler');
const { CreateCategorySchema, UpdateCategorySchema, ReorderCategoriesSchema } = require('../schemas/categorySchema');

class CategoryController {
  
  // GET /api/categories (Flat)
  getCategoriesFlat = asyncHandler(async (req, res) => {
    const categories = await prisma.category.findMany({ 
        where: { restaurantId: req.restaurantId }, 
        orderBy: { name: 'asc' } 
    });
    res.json(categories);
  });

  // GET /api/categories/hierarchy
  getCategoriesHierarchy = asyncHandler(async (req, res) => {
    const categories = await prisma.category.findMany({ 
        where: { restaurantId: req.restaurantId, parentId: null }, 
        include: { 
            subCategories: { orderBy: { order: 'asc' } } 
        }, 
        orderBy: { order: 'asc' } 
    });
    res.json(categories);
  });

  // GET /api/client/categories/:restaurantId
  getClientCategories = asyncHandler(async (req, res) => {
    const { restaurantId } = req.params;
    const categories = await prisma.category.findMany({ 
        where: { restaurantId }, 
        orderBy: { order: 'asc' } 
    }); 
    res.json(categories);
  });

  // POST /api/categories
  createCategory = asyncHandler(async (req, res) => {
    const validatedData = CreateCategorySchema.parse(req.body);
    const { parentId, ...rest } = validatedData;

    const data = { 
        ...rest, 
        restaurant: { connect: { id: req.restaurantId } } 
    };
    
    if (parentId) {
        data.parent = { connect: { id: parentId } };
    }

    const category = await prisma.category.create({ data });
    res.status(201).json(category);
  });

  // PUT /api/categories/:id
  updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const validatedData = UpdateCategorySchema.parse(req.body);
    const { parentId, ...rest } = validatedData;

    const data = { ...rest };
    
    // Se parentId vier null explicitamente, desconecta. Se vier string, conecta.
    if (parentId !== undefined) {
        data.parentId = parentId;
    }

    const category = await prisma.category.update({ 
        where: { id }, 
        data 
    });
    res.json(category);
  });

  // DELETE /api/categories/:id
  deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.category.delete({ where: { id } }); 
    res.status(204).send();
  });

  // PATCH /api/categories/reorder
  reorderCategories = asyncHandler(async (req, res) => {
    const validatedData = ReorderCategoriesSchema.parse(req.body);
    
    await prisma.$transaction(
        validatedData.items.map(item => 
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