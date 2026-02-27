const prisma = require('../lib/prisma');
const asyncHandler = require('../middlewares/asyncHandler');
const { CreateProductSchema, UpdateProductSchema } = require('../schemas/productSchema');

class ProductController {
  
  // GET /api/products
  getProducts = asyncHandler(async (req, res) => {
    const products = await prisma.product.findMany({
      where: { restaurantId: req.restaurantId },
      include: { 
        categories: {
          include: { 
            addonGroups: { 
              include: { addons: { orderBy: { order: 'asc' } } },
              orderBy: { order: 'asc' }
            } 
          }
        }, 
        sizes: { include: { globalSize: true }, orderBy: { order: 'asc' } }, 
        addonGroups: { 
          include: { addons: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' }
        },
        ingredients: { include: { ingredient: true } }
      },
      orderBy: { order: 'asc' },
    });
    res.json(products);
  });

  // GET /api/products/:id
  getProductById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { 
        categories: {
            include: {
                addonGroups: {
                    include: { addons: true }
                }
            }
        }, 
        sizes: { include: { globalSize: true }, orderBy: { order: 'asc' } }, 
        addonGroups: { 
          include: { addons: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' }
        },
        ingredients: { include: { ingredient: true } }
      },
    });
    
    if (!product) {
      res.status(404);
      throw new Error('Produto não encontrado');
    }
    
    res.json(product);
  });

  // GET /api/client/products/:restaurantId
  getClientProducts = asyncHandler(async (req, res) => {
    const { restaurantId } = req.params;
    const products = await prisma.product.findMany({ 
      where: { restaurantId, isAvailable: true }, 
      include: { 
        categories: {
          include: { 
            addonGroups: { 
              include: { addons: { orderBy: { order: 'asc' } } },
              orderBy: { order: 'asc' }
            } 
          }
        }, 
        sizes: { include: { globalSize: true }, orderBy: { order: 'asc' } }, 
        addonGroups: { 
          include: { addons: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' }
        },
        promotions: {
            where: { isActive: true }
        }
      }, 
      orderBy: { order: 'asc' } 
    });
    res.json(products);
  });

  // POST /api/products
  createProduct = asyncHandler(async (req, res) => {
    const validatedData = CreateProductSchema.parse(req.body);
    const { categoryId, categoryIds, sizes, addonGroups, ingredients, ...rest } = validatedData;
    
    // Normaliza categorias
    const finalCategoryIds = categoryIds || (categoryId ? [categoryId] : []);

    const newProduct = await prisma.product.create({
      data: {
        ...rest,
        restaurantId: req.restaurantId,
        categories: { 
          connect: finalCategoryIds.map(id => ({ id })) 
        },
        sizes: { 
          create: sizes.map(s => ({ 
            name: s.name, 
            price: s.price, 
            order: s.order, 
            globalSizeId: s.globalSizeId,
            saiposIntegrationCode: s.saiposIntegrationCode 
          })) 
        },
        addonGroups: { 
          connect: addonGroups.map(g => ({ id: g.id }))
        },
        ingredients: { 
          create: ingredients.map(i => ({ 
            ingredientId: i.ingredientId, 
            quantity: i.quantity 
          })) 
        }
      },
      include: { categories: true, sizes: true, addonGroups: { include: { addons: true } }, ingredients: true },
    });
    
    res.status(201).json(newProduct);
  });

  // PUT /api/products/:id
  updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const validatedData = UpdateProductSchema.parse(req.body);

    const { categoryId, categoryIds, sizes, addonGroups, ingredients, ...productData } = validatedData;
    
    // Preparar atualização de categorias
    const categoryUpdate = {};
    if (categoryIds || categoryId) {
        const finalIds = categoryIds || (categoryId ? [categoryId] : []);
        categoryUpdate.set = finalIds.filter(id => id && id.length > 0).map(id => ({ id }));
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...productData,
        categories: categoryUpdate,
        sizes: { 
          deleteMany: {}, 
          create: sizes?.filter(s => s.name).map(s => {
            const price = parseFloat(s.price);
            return { 
              name: s.name, 
              price: isNaN(price) ? 0 : price, 
              order: parseInt(s.order) || 0, 
              globalSizeId: (s.globalSizeId && s.globalSizeId.trim() !== "") ? s.globalSizeId : null,
              saiposIntegrationCode: s.saiposIntegrationCode || null
            };
          }) || [] 
        },
        addonGroups: { 
          set: addonGroups?.map(g => ({ id: g.id })) || []
        },
        ingredients: { 
          deleteMany: {}, 
          create: ingredients?.map(i => ({ 
            ingredientId: i.ingredientId, 
            quantity: Number(i.quantity) || 0 
          })) || [] 
        }
      },
      include: { categories: true, sizes: true, addonGroups: { include: { addons: true } }, ingredients: true },
    });

    res.json(updatedProduct);
  });

  // DELETE /api/products/:id
  deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.product.delete({ where: { id } }); 
    res.status(204).send();
  });

  // POST /api/products/upload
  uploadImage = asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400);
      throw new Error('Nenhum arquivo enviado.');
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  });

  // GET /api/products/pricing-analysis
  getPricingAnalysis = asyncHandler(async (req, res) => {
    const products = await prisma.product.findMany({
      where: { restaurantId: req.restaurantId },
      include: {
        ingredients: { include: { ingredient: true } },
        categories: true
      }
    });

    const analysis = products.map(product => {
      let totalCost = 0;
      product.ingredients.forEach(pi => {
        totalCost += (pi.ingredient.lastUnitCost || 0) * pi.quantity;
      });

      const profit = product.price - totalCost;
      const margin = product.price > 0 ? (profit / product.price) * 100 : 0;

      return {
        id: product.id,
        name: product.name,
        category: product.categories?.[0]?.name || 'S/ Cat',
        sellingPrice: product.price,
        totalCost,
        profit,
        margin,
        isWarning: margin < 60
      };
    });

    res.json(analysis);
  });

  // PATCH /api/products/reorder
  reorderProducts = asyncHandler(async (req, res) => {
    const { items } = req.body; // TODO: Validar com Zod se necessário
    await prisma.$transaction(
      items.map(item => 
        prisma.product.update({
          where: { id: item.id },
          data: { order: item.order }
        })
      )
    );
    res.json({ success: true });
  });
}

module.exports = new ProductController();