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

    const products = await prisma.product.findMany({
      where,
      include: {
        categories: true,
        sizes: true,
        addonGroups: {
          include: {
            addons: true,
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

    return products;
  }

  async getProductById(id, restaurantId) {
    const product = await prisma.product.findFirst({
      where: { id, restaurantId },
      include: {
        categories: true,
        sizes: true,
        addonGroups: {
          include: {
            addons: true,
          },
        },
        promotions: true,
      },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    return product;
  }

  async createProduct(data, restaurantId) {
    // Validação de Nome Único (Regra de Negócio)
    const existingProduct = await prisma.product.findFirst({
      where: { name: data.name, restaurantId },
    });

    if (existingProduct) {
      throw new AppError('Product with this name already exists in this restaurant', 400);
    }

    // Preparar dados para criação (tratando relacionamentos)
    const { 
      categoryIds = [], 
      sizes = [], 
      addonGroups = [], 
      ingredients = [],
      ...productData 
    } = data;

    const product = await prisma.product.create({
      data: {
        ...productData,
        restaurantId,
        categories: {
          connect: categoryIds.map((id) => ({ id })), // Conecta categorias existentes
        },
        sizes: {
          create: sizes, // Cria tamanhos aninhados
        },
        addonGroups: {
          create: (addonGroups || []).map((group) => ({
            ...group,
            restaurantId, // Garante vínculo com o restaurante
            addons: {
              create: group.addons || [],
            },
          })),
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
    // Verificar se existe
    await this.getProductById(id, restaurantId);

    const { 
      categoryIds, 
      sizes, 
      addonGroups, 
      ingredients, // Extrair para evitar erro de validação Prisma
      ...productData 
    } = data;

    // Atualização Complexa (Prisma transaction implícita)
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...productData,
        ...(categoryIds && {
          categories: {
            set: categoryIds.map((cid) => ({ id: cid })), // Substitui todas as categorias
          },
        }),
        // Nota: Atualizar nested relations (sizes, addons, ingredients) requer lógica de diff
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

  // Lógica de Reordenação de Produtos
  async reorderProducts(products, restaurantId) {
    const transactions = products.map((p) =>
      prisma.product.update({
        where: { id: p.id, restaurantId },
        data: { order: p.order },
      })
    );
    return await prisma.$transaction(transactions);
  }

  // Análise de Precificação Simples
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
