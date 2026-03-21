/**
 * Utilitários para processamento de Produtos e Categorias
 */

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
  PUBLIC_PRODUCT_SELECT,
  applyAddonGroupOrder
};
