const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const { PUBLIC_PRODUCT_SELECT, applyAddonGroupOrder, pickProductFields } = require('../utils/productUtils');

class ProductService {
  /**
   * Busca todos os produtos com suporte a filtros, paginação e segurança (isPublic)
   */
  async getAllProducts(restaurantId, query, isPublic = false) {
    const { categoryId, isAvailable, showInMenu, search, page = 1, limit = 1000 } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      restaurantId,
      ...(categoryId && { categories: { some: { id: categoryId } } }),
      ...(isAvailable !== undefined && { isAvailable: isAvailable === 'true' }),
      ...(showInMenu !== undefined && { showInMenu: showInMenu === 'true' }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const findOptions = {
      where,
      orderBy: { order: 'asc' },
      skip,
      take,
    };

    // Se for público (Cardápio Digital), usa o select seguro para evitar vazamento de custos
    if (isPublic) {
      findOptions.select = PUBLIC_PRODUCT_SELECT;
    } else {
      findOptions.include = {
        fichaTecnica: {
          include: {
            ingredients: { include: { ingredient: true } }
          }
        },
        ingredients: { include: { ingredient: true } },
        categories: { include: { addonGroups: { include: { addons: true } } } },
        sizes: true,
        addonGroups: { include: { addons: { orderBy: { order: 'asc' } } } },
        promotions: {
          where: {
            isActive: true,
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },
          },
        },
      };
    }

    let products = await prisma.product.findMany(findOptions);

    // Aplicar ordenação personalizada de grupos usando o utilitário central
    products = products.map(p => applyAddonGroupOrder(p));

    return products;
  }

  async getProductById(id, restaurantId, isPublic = false) {
    const findOptions = {
      where: { id, restaurantId }
    };

    if (isPublic) {
      findOptions.select = PUBLIC_PRODUCT_SELECT;
    } else {
      findOptions.include = {
        fichaTecnica: {
          include: {
            ingredients: { include: { ingredient: true } }
          }
        },
        ingredients: { include: { ingredient: true } },
        categories: { include: { addonGroups: { include: { addons: true } } } },
        sizes: true,
        addonGroups: { include: { addons: { orderBy: { order: 'asc' } } } },
        promotions: true,
      };
    }

    const product = await prisma.product.findFirst(findOptions);

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    return applyAddonGroupOrder(product);
  }

  async createProduct(data, restaurantId) {
    // Validação de Nome Único
    const existingProduct = await prisma.product.findFirst({
      where: { name: data.name, restaurantId },
    });

    if (existingProduct) {
      throw new AppError('Product with this name already exists in this restaurant', 400);
    }

    // Validação de Preço Zero sem tamanhos ou grupos obrigatórios
    const hasSizes = data.sizes && data.sizes.length > 0;
    const hasPrice = data.price && data.price > 0;
    const hasRequiredAddonGroups = data.addonGroups?.some(g => g.isRequired);
    
    if (!hasPrice && !hasSizes && !hasRequiredAddonGroups) {
      console.warn(`[PRODUCT_SERVICE] Produto "${data.name}" criado com preço zero. Considere adicionar preços base ou tamanhos.`);
    }

    // Whitelist: extrair apenas campos escalares permitidos (rejeita restaurantId, id, createdAt, relações)
    const scalarData = pickProductFields(data);

    const categoryIds = data.categoryIds || [];
    const sizes = data.sizes || [];
    const addonGroups = data.addonGroups || [];

    // Ordem dos grupos de adicionais
    const addonGroupsOrder = addonGroups.map(g => g.id);

    const product = await prisma.product.create({
      data: {
        ...scalarData,
        addonGroupsOrder,
        restaurantId,
        categories: {
          connect: categoryIds.map((id) => ({ id })),
        },
        sizes: {
          create: sizes,
        },
        addonGroups: {
          connect: addonGroups.map((group) => ({ id: group.id })),
        },
      },
      include: {
        categories: true,
        sizes: true,
        addonGroups: true,
        fichaTecnica: { include: { ingredients: { include: { ingredient: true } } } },
      },
    });

    return product;
  }

  async updateProduct(id, data, restaurantId) {
    const existingProduct = await this.getProductById(id, restaurantId);

    // Whitelist: extrair apenas campos escalares permitidos
    // Rejeita: restaurantId (vem do middleware), id, createdAt, updatedAt, relações
    const scalarData = pickProductFields(data);

    const categoryIds = data.categoryIds;
    const sizes = data.sizes;
    const addonGroups = data.addonGroups;

    // Validação de Preço Zero sem tamanhos ou grupos obrigatórios
    const hasSizes = sizes && sizes.length > 0;
    const hasPrice = scalarData.price && scalarData.price > 0;
    const hasRequiredAddonGroups = addonGroups?.some(g => g.isRequired);
    
    if (!hasPrice && !hasSizes && !hasRequiredAddonGroups) {
      console.warn(`[PRODUCT_SERVICE] Produto "${existingProduct.name}" atualizado com preço zero. Considere adicionar preços base ou tamanhos.`);
    }

    // Se addonGroups foi enviado, capturamos a ordem exata enviada pelo frontend
    let addonGroupsOrder = undefined;
    if (addonGroups) {
      addonGroupsOrder = addonGroups.map(g => g.id);
    }

    // Buscar sizes existentes para determinar o que fazer
    const existingSizes = await prisma.size.findMany({
      where: { productId: id }
    });
    const existingSizeIds = new Set(existingSizes.map(s => s.id));
    const newSizeIds = new Set(sizes?.filter(s => s.id).map(s => s.id) || []);
    const sizeIdsToDelete = [...existingSizeIds].filter(id => !newSizeIds.has(id));

    const product = await prisma.$transaction(async (tx) => {
      // Deletar sizes removidos
      if (sizeIdsToDelete.length > 0) {
        await tx.size.deleteMany({
          where: { id: { in: sizeIdsToDelete } }
        });
      }
      
      // Upsert cada size
      if (sizes && sizes.length > 0) {
        for (const size of sizes) {
          const sizeData = {
            name: size.name || 'Padrão',
            price: parseFloat(size.price) || 0,
            order: size.order || 0,
            globalSizeId: size.globalSizeId || null,
            saiposIntegrationCode: size.saiposIntegrationCode || null,
          };
          
          if (size.id && existingSizeIds.has(size.id)) {
            await tx.size.update({
              where: { id: size.id },
              data: sizeData
            });
          } else {
            await tx.size.create({
              data: {
                ...sizeData,
                product: { connect: { id } }
              }
            });
          }
        }
      }

      // Update do produto: apenas campos escalares da whitelist
      return await tx.product.update({
        where: { id },
        data: {
          ...scalarData,
          ...(addonGroupsOrder !== undefined && { addonGroupsOrder }),
          ...(categoryIds && {
            categories: { set: categoryIds.map((cid) => ({ id: cid })) },
          }),
          ...(addonGroups && {
            addonGroups: { set: addonGroups.map((g) => ({ id: g.id })) },
          }),
        },
        include: {
          sizes: true,
          categories: true,
          addonGroups: true,
          fichaTecnica: { include: { ingredients: { include: { ingredient: true } } } },
          ingredients: { include: { ingredient: true } },
        }
      });
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
        fichaTecnica: {
          include: {
            ingredients: {
              include: { ingredient: true },
            },
          },
        },
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    return products.map((p) => {
      // Prioridade 1: Ficha Técnica | Fallback: ProductIngredient
      const source = p.fichaTecnica?.ingredients || p.ingredients || [];
      const cost = source.reduce(
        (acc, link) => acc + (link.quantity * (link.ingredient?.averageCost || 0)),
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
