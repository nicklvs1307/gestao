const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const AppError = require('../utils/AppError');

class ProductService {
  async getAllProducts(restaurantId, query) {
    const { categoryId, isAvailable, showInMenu, search } = query;

    const where = {
      restaurantId,
      ...(categoryId && { categories: { some: { id: categoryId } } }), // Filtro Many-to-Many
      ...(isAvailable !== undefined && { isAvailable: isAvailable === 'true' }),
      ...(showInMenu !== undefined && { showInMenu: showInMenu === 'true' }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    let products = await prisma.product.findMany({
      where,
      include: {
        categories: {
          include: {
            addonGroups: {
              include: {
                addons: { orderBy: { order: 'asc' } }
              }
            }
          }
        },
        sizes: true,
        addonGroups: {
          include: {
            addons: {
              orderBy: { order: 'asc' }
            },
          },
        },
        promotions: {
          where: {
            isActive: true,
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Aplicar ordenação personalizada de grupos se existir o campo addonGroupsOrder
    products = products.map(p => this._applyAddonGroupOrder(p));

    return products;
  }

  async getProductById(id, restaurantId) {
    const product = await prisma.product.findFirst({
      where: { id, restaurantId },
      include: {
        categories: {
          include: {
            addonGroups: {
              include: {
                addons: { orderBy: { order: 'asc' } }
              }
            }
          }
        },
        sizes: true,
        addonGroups: {
          include: {
            addons: {
              orderBy: { order: 'asc' }
            },
          },
        },
        promotions: true,
      },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    return this._applyAddonGroupOrder(product);
  }

  _applyAddonGroupOrder(product) {
    if (!product.addonGroupsOrder || !Array.isArray(product.addonGroupsOrder)) {
      return product;
    }

    const orderMap = new Map();
    product.addonGroupsOrder.forEach((id, index) => orderMap.set(id, index));

    product.addonGroups.sort((a, b) => {
      const orderA = orderMap.has(a.id) ? orderMap.get(a.id) : 999;
      const orderB = orderMap.has(b.id) ? orderMap.get(b.id) : 999;
      return orderA - orderB;
    });

    return product;
  }

  async createProduct(data, restaurantId) {
    // Validação de Nome Único
    const existingProduct = await prisma.product.findFirst({
      where: { name: data.name, restaurantId },
    });

    if (existingProduct) {
      throw new AppError('Product with this name already exists in this restaurant', 400);
    }

    const { 
      categoryIds = [], 
      sizes = [], 
      addonGroups = [], 
      ingredients = [],
      promotions,
      ...productData 
    } = data;

    // Se addonGroups foi enviado, salvamos a ordem dos IDs
    const addonGroupsOrder = (addonGroups || []).map(g => g.id);

    const product = await prisma.product.create({
      data: {
        ...productData,
        addonGroupsOrder,
        restaurantId,
        categories: {
          connect: (categoryIds || []).map((id) => ({ id })),
        },
        sizes: {
          create: sizes || [],
        },
        addonGroups: {
          connect: (addonGroups || []).map((group) => ({ id: group.id })),
        },
        ingredients: {
          create: (ingredients || []).map((ing) => ({
            quantity: ing.quantity,
            ingredient: { connect: { id: ing.ingredientId } }
          })),
        },
      },
      include: {
        categories: true,
        sizes: true,
        addonGroups: true,
      },
    });

    return product;
  }

  async updateProduct(id, data, restaurantId) {
    await this.getProductById(id, restaurantId);

    const { 
      id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      categoryIds, 
      sizes, 
      addonGroups, 
      ingredients,
      promotions,
      ...productData 
    } = data;

    // Se addonGroups foi enviado, capturamos a ordem exata enviada pelo frontend
    let addonGroupsOrder = undefined;
    if (addonGroups) {
      addonGroupsOrder = addonGroups.map(g => g.id);
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...productData,
        ...(addonGroupsOrder !== undefined && { addonGroupsOrder }),
        ...(categoryIds && {
          categories: {
            set: categoryIds.map((cid) => ({ id: cid })),
          },
        }),
        ...(addonGroups && {
          addonGroups: {
            set: addonGroups.map((g) => ({ id: g.id })),
          },
        }),
      },
    });

    return product;
  }

  async deleteProduct(id, restaurantId) {
    await this.getProductById(id, restaurantId);
    await prisma.product.delete({
      where: { id },
    });
  }

  async reorderProducts(products, restaurantId) {
    const transactions = products.map((p) =>
      prisma.product.update({
        where: { id: p.id, restaurantId },
        data: { order: p.order },
      })
    );
    return await prisma.$transaction(transactions);
  }

  async getPricingAnalysis(restaurantId) {
    const products = await prisma.product.findMany({
      where: { restaurantId },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    return products.map((p) => {
      const cost = p.ingredients.reduce(
        (acc, i) => acc + (i.quantity * (i.ingredient.averageCost || 0)),
        0
      );
      const margin = p.price > 0 ? ((p.price - cost) / p.price) * 100 : 0;
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        cost,
        margin: Math.round(margin * 100) / 100,
      };
    });
  }
}

module.exports = new ProductService();
