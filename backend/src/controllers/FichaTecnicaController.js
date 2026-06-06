const { PrismaClient } = require('@prisma/client');
const { FichaTecnicaSchema } = require('../schemas/inventorySchema');

const prisma = new PrismaClient();

// Helper: calcular custo da ficha técnica
function calcFichaCost(ingredients) {
  if (!Array.isArray(ingredients)) return 0;
  return ingredients.reduce((sum, item) => {
    const cost = item.ingredient?.averageCost || 0;
    return sum + (cost * (Number(item.quantity) || 0));
  }, 0);
}

// GET /fichas-tecnicas
async function getAll(req, res) {
  try {
    const { restaurantId } = req.user;
    const { search } = req.query;

    const where = { restaurantId };
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const fichasTecnicas = await prisma.fichaTecnica.findMany({
      where,
      include: {
        ingredients: {
          include: {
            ingredient: {
              select: { id: true, name: true, averageCost: true, unit: true }
            }
          }
        },
        _count: {
          select: { products: true, addons: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ fichasTecnicas });
  } catch (error) {
    console.error('Erro ao listar fichas técnicas:', error);
    res.status(500).json({ error: 'Erro ao listar fichas técnicas' });
  }
}

// GET /fichas-tecnicas/:id
async function getById(req, res) {
  try {
    const { id } = req.params;
    const { restaurantId } = req.user;

    const ficha = await prisma.fichaTecnica.findFirst({
      where: { id, restaurantId },
      include: {
        ingredients: {
          include: {
            ingredient: {
              select: { id: true, name: true, averageCost: true, unit: true, lastUnitCost: true }
            }
          }
        },
        products: {
          select: { id: true, name: true, price: true, costPrice: true }
        },
        addons: {
          select: { id: true, name: true, price: true, costPrice: true }
        }
      }
    });

    if (!ficha) {
      return res.status(404).json({ error: 'Ficha técnica não encontrada' });
    }

    res.json(ficha);
  } catch (error) {
    console.error('Erro ao buscar ficha técnica:', error);
    res.status(500).json({ error: 'Erro ao buscar ficha técnica' });
  }
}

// POST /fichas-tecnicas
async function create(req, res) {
  try {
    const { restaurantId } = req.user;
    const parsed = FichaTecnicaSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { name, description, yieldAmount, ingredients } = parsed.data;

    // Buscar averageCost de cada ingrediente para calcular o custo
    const ingredientIds = ingredients.map(i => i.ingredientId);
    const ingredientRecords = await prisma.ingredient.findMany({
      where: { id: { in: ingredientIds } },
      select: { id: true, averageCost: true }
    });

    const costMap = {};
    ingredientRecords.forEach(ing => {
      costMap[ing.id] = ing.averageCost || 0;
    });

    const costPrice = ingredients.reduce((sum, item) => {
      return sum + ((costMap[item.ingredientId] || 0) * item.quantity);
    }, 0);

    const ficha = await prisma.fichaTecnica.create({
      data: {
        name,
        description,
        yieldAmount: yieldAmount || 1,
        costPrice,
        restaurantId,
        ingredients: {
          create: ingredients.map(item => ({
            quantity: item.quantity,
            ingredientId: item.ingredientId
          }))
        }
      },
      include: {
        ingredients: {
          include: {
            ingredient: {
              select: { id: true, name: true, averageCost: true, unit: true }
            }
          }
        },
        _count: {
          select: { products: true, addons: true }
        }
      }
    });

    res.status(201).json(ficha);
  } catch (error) {
    console.error('Erro ao criar ficha técnica:', error);
    res.status(500).json({ error: 'Erro ao criar ficha técnica' });
  }
}

// PUT /fichas-tecnicas/:id
async function update(req, res) {
  try {
    const { id } = req.params;
    const { restaurantId } = req.user;
    const parsed = FichaTecnicaSchema.partial().safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const existing = await prisma.fichaTecnica.findFirst({
      where: { id, restaurantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Ficha técnica não encontrada' });
    }

    const { name, description, yieldAmount, ingredients } = parsed.data;

    // Se ingredientes foram fornecidos, recalcula custo
    let costPrice = existing.costPrice;
    if (ingredients) {
      const ingredientIds = ingredients.map(i => i.ingredientId);
      const ingredientRecords = await prisma.ingredient.findMany({
        where: { id: { in: ingredientIds } },
        select: { id: true, averageCost: true }
      });

      const costMap = {};
      ingredientRecords.forEach(ing => {
        costMap[ing.id] = ing.averageCost || 0;
      });

      costPrice = ingredients.reduce((sum, item) => {
        return sum + ((costMap[item.ingredientId] || 0) * item.quantity);
      }, 0);
    }

    const ficha = await prisma.fichaTecnica.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(yieldAmount !== undefined && { yieldAmount }),
        costPrice,
        ...(ingredients && {
          ingredients: {
            deleteMany: {},
            create: ingredients.map(item => ({
              quantity: item.quantity,
              ingredientId: item.ingredientId
            }))
          }
        })
      },
      include: {
        ingredients: {
          include: {
            ingredient: {
              select: { id: true, name: true, averageCost: true, unit: true }
            }
          }
        },
        _count: {
          select: { products: true, addons: true }
        }
      }
    });

    res.json(ficha);
  } catch (error) {
    console.error('Erro ao atualizar ficha técnica:', error);
    res.status(500).json({ error: 'Erro ao atualizar ficha técnica' });
  }
}

// DELETE /fichas-tecnicas/:id
async function remove(req, res) {
  try {
    const { id } = req.params;
    const { restaurantId } = req.user;

    const ficha = await prisma.fichaTecnica.findFirst({
      where: { id, restaurantId },
      include: {
        _count: {
          select: { products: true, addons: true }
        }
      }
    });

    if (!ficha) {
      return res.status(404).json({ error: 'Ficha técnica não encontrada' });
    }

    if (ficha._count.products > 0 || ficha._count.addons > 0) {
      return res.status(409).json({
        error: `Ficha técnica vinculada a ${ficha._count.products} produto(s) e ${ficha._count.addons} adicional(is). Desvincule antes de deletar.`
      });
    }

    await prisma.fichaTecnica.delete({ where: { id } });

    res.json({ message: 'Ficha técnica deletada' });
  } catch (error) {
    console.error('Erro ao deletar ficha técnica:', error);
    res.status(500).json({ error: 'Erro ao deletar ficha técnica' });
  }
}

// POST /fichas-tecnicas/:id/duplicate
async function duplicate(req, res) {
  try {
    const { id } = req.params;
    const { restaurantId } = req.user;
    const { name } = req.body;

    const original = await prisma.fichaTecnica.findFirst({
      where: { id, restaurantId },
      include: {
        ingredients: {
          select: { quantity: true, ingredientId: true }
        }
      }
    });

    if (!original) {
      return res.status(404).json({ error: 'Ficha técnica não encontrada' });
    }

    const ficha = await prisma.fichaTecnica.create({
      data: {
        name: name || `${original.name} (Cópia)`,
        description: original.description,
        yieldAmount: original.yieldAmount,
        costPrice: original.costPrice,
        restaurantId,
        ingredients: {
          create: original.ingredients.map(ing => ({
            quantity: ing.quantity,
            ingredientId: ing.ingredientId
          }))
        }
      },
      include: {
        ingredients: {
          include: {
            ingredient: {
              select: { id: true, name: true, averageCost: true, unit: true }
            }
          }
        },
        _count: {
          select: { products: true, addons: true }
        }
      }
    });

    res.status(201).json(ficha);
  } catch (error) {
    console.error('Erro ao duplicar ficha técnica:', error);
    res.status(500).json({ error: 'Erro ao duplicar ficha técnica' });
  }
}

// PUT /fichas-tecnicas/:id/link-product/:productId
async function linkProduct(req, res) {
  try {
    const { id, productId } = req.params;
    const { restaurantId } = req.user;

    const ficha = await prisma.fichaTecnica.findFirst({
      where: { id, restaurantId }
    });

    if (!ficha) {
      return res.status(404).json({ error: 'Ficha técnica não encontrada' });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, restaurantId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Desvincular ficha anterior do produto (se houver)
    if (product.fichaTecnicaId && product.fichaTecnicaId !== id) {
      await prisma.product.update({
        where: { id: productId },
        data: { fichaTecnicaId: id }
      });
    } else {
      await prisma.product.update({
        where: { id: productId },
        data: { fichaTecnicaId: id }
      });
    }

    res.json({ message: 'Ficha vinculada ao produto' });
  } catch (error) {
    console.error('Erro ao vincular ficha ao produto:', error);
    res.status(500).json({ error: 'Erro ao vincular ficha ao produto' });
  }
}

// PUT /fichas-tecnicas/:id/link-addon/:addonId
async function linkAddon(req, res) {
  try {
    const { id, addonId } = req.params;
    const { restaurantId } = req.user;

    const ficha = await prisma.fichaTecnica.findFirst({
      where: { id, restaurantId }
    });

    if (!ficha) {
      return res.status(404).json({ error: 'Ficha técnica não encontrada' });
    }

    const addon = await prisma.addon.findFirst({
      where: { id: addonId, addonGroup: { restaurant: { id: restaurantId } } }
    });

    if (!addon) {
      return res.status(404).json({ error: 'Adicional não encontrado' });
    }

    await prisma.addon.update({
      where: { id: addonId },
      data: { fichaTecnicaId: id }
    });

    res.json({ message: 'Ficha vinculada ao adicional' });
  } catch (error) {
    console.error('Erro ao vincular ficha ao adicional:', error);
    res.status(500).json({ error: 'Erro ao vincular ficha ao adicional' });
  }
}

// PUT /fichas-tecnicas/:id/unlink-product/:productId
async function unlinkProduct(req, res) {
  try {
    const { id, productId } = req.params;
    const { restaurantId } = req.user;

    const product = await prisma.product.findFirst({
      where: { id: productId, restaurantId, fichaTecnicaId: id }
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado ou não vinculado a esta ficha' });
    }

    await prisma.product.update({
      where: { id: productId },
      data: { fichaTecnicaId: null }
    });

    res.json({ message: 'Ficha desvinculada do produto' });
  } catch (error) {
    console.error('Erro ao desvincular ficha do produto:', error);
    res.status(500).json({ error: 'Erro ao desvincular ficha do produto' });
  }
}

// PUT /fichas-tecnicas/:id/unlink-addon/:addonId
async function unlinkAddon(req, res) {
  try {
    const { id, addonId } = req.params;
    const { restaurantId } = req.user;

    const addon = await prisma.addon.findFirst({
      where: { id: addonId, addonGroup: { restaurant: { id: restaurantId } }, fichaTecnicaId: id }
    });

    if (!addon) {
      return res.status(404).json({ error: 'Adicional não encontrado ou não vinculado a esta ficha' });
    }

    await prisma.addon.update({
      where: { id: addonId },
      data: { fichaTecnicaId: null }
    });

    res.json({ message: 'Ficha desvinculada do adicional' });
  } catch (error) {
    console.error('Erro ao desvincular ficha do adicional:', error);
    res.status(500).json({ error: 'Erro ao desvincular ficha do adicional' });
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  duplicate,
  linkProduct,
  linkAddon,
  unlinkProduct,
  unlinkAddon
};
