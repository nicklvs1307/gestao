/**
 * Utilitários para processamento de Produtos e Categorias
 */

/**
 * Campos escalares permitidos no create/update de Product.
 * Segurança: campos não listados são REJEITADOS, evitando que o body
 * injete campos indevidos (ex: restaurantId, id, createdAt, relações).
 *
 * Sync manual com schema.prisma → model Product.
 */
const PRODUCT_SCALAR_FIELDS = [
  'name',
  'description',
  'price',
  'costPrice',
  'imageUrl',
  'isFeatured',
  'isAvailable',
  'stock',
  'tags',
  'order',
  'productionArea',
  'saiposIntegrationCode',
  'integrationCode',
  'showInMenu',
  'isFlavor',
  'allowDelivery',
  'allowPos',
  'allowOnline',
  'ncm',
  'cfop',
  'cest',
  'measureUnit',
  'origin',
  'taxPercentage',
  'pizzaConfig',
  'addonGroupsOrder',
  'globalSizeId',
  'fichaTecnicaId',
];

/**
 * Extrai apenas os campos permitidos de um objeto.
 * @param {object} source - Objeto de origem (req.body)
 * @param {string[]} allowed - Lista de chaves permitidas
 * @returns {object} Novo objeto com apenas as chaves permitidas
 */
function pickProductFields(source, allowed = PRODUCT_SCALAR_FIELDS) {
  const result = {};
  for (const key of allowed) {
    if (key in source) {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Seleção de campos seguros para o cliente final (Cardápio Digital)
 * EXCLUI: costPrice, ingredients, ncm, cfop, cest, taxPercentage, averageCost, lastUnitCost
 */
const PUBLIC_PRODUCT_SELECT = {
  id: true,
  name: true,
  description: true,
  price: true,
  imageUrl: true,
  isFeatured: true,
  isAvailable: true,
  stock: true,
  tags: true,
  order: true,
  productionArea: true,
  showInMenu: true,
  isFlavor: true,
  allowDelivery: true,
  allowOnline: true,
  pizzaConfig: true,
  addonGroupsOrder: true,
  globalSizeId: true,
  categories: {
    select: {
      id: true,
      name: true
    }
  },
  sizes: {
    select: {
      id: true,
      name: true,
      price: true,
      order: true,
      globalSizeId: true
    },
    orderBy: { order: 'asc' }
  },
  addonGroups: {
    include: {
      addons: {
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          price: true,
          promoPrice: true,
          maxQuantity: true,
          order: true
        },
        orderBy: { order: 'asc' }
      }
    }
  },
  promotions: {
    where: {
      isActive: true,
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
    },
    select: {
      id: true,
      name: true,
      discountType: true,
      discountValue: true,
      productId: true,
      addonId: true,
      categoryId: true
    }
  },
  fichaTecnica: {
    select: {
      id: true,
      name: true,
      costPrice: true,
      yieldAmount: true,
      ingredients: {
        select: {
          quantity: true,
          ingredient: {
            select: { id: true, name: true, averageCost: true, unit: true }
          }
        }
      }
    }
  }
};

/**
 * Ordena os grupos de adicionais de um produto com base no array addonGroupsOrder
 */
function applyAddonGroupOrder(product) {
  if (!product || !product.addonGroups || !product.addonGroupsOrder || !Array.isArray(product.addonGroupsOrder)) {
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

module.exports = {
  PRODUCT_SCALAR_FIELDS,
  pickProductFields,
  PUBLIC_PRODUCT_SELECT,
  applyAddonGroupOrder
};
