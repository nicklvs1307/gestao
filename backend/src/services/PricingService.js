const prisma = require('../lib/prisma');

class PricingService {
  /**
   * Calcula o preço unitário e total de um item, considerando regras de negócio,
   * tamanhos, pizzas (sabores) e adicionais.
   */
  async calculateItemPrice(productId, quantity, sizeId, addonsIds = []) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { 
        sizes: true, 
        categories: {
            include: {
                addonGroups: {
                    include: { addons: true }
                }
            }
        },
        addonGroups: { include: { addons: true } },
        promotions: {
            where: { isActive: true }
        }
      }
    });

    if (!product) throw new Error(`Produto não encontrado: ${productId}`);
    if (!product.isAvailable) throw new Error(`Produto indisponível: ${product.name}`);

    let unitPrice = product.price;
    let sizeName = null;
    let sizeObj = null;

    // 1. Definição de Preço Base por Tamanho
    if (sizeId) {
      const size = product.sizes.find(s => s.id === sizeId);
      if (!size) throw new Error(`Tamanho inválido para o produto ${product.name}`);
      
      unitPrice = size.price;
      sizeName = size.name;
      sizeObj = { 
        id: size.id, 
        name: size.name, 
        price: size.price, 
        saiposIntegrationCode: size.saiposIntegrationCode 
      };
    }

    // 2. Aplicação de Promoção
    const activePromotion = product.promotions?.[0];
    if (activePromotion) {
        if (activePromotion.discountType === 'percentage') {
            unitPrice = unitPrice * (1 - activePromotion.discountValue / 100);
        } else if (activePromotion.discountType === 'fixed_amount') {
            unitPrice = Math.max(0, unitPrice - activePromotion.discountValue);
        }
    }

    // 3. Cálculo de Adicionais (Unificado: Extras + Sabores como Opções)
    const { addonsTotal, addonsObjects } = await this._calculateAddonsPriceV2(product, addonsIds, sizeName);
    
    const finalUnitPrice = unitPrice + addonsTotal;
    const totalItemPrice = finalUnitPrice * quantity;

    return {
      product,
      unitPrice: finalUnitPrice, 
      basePrice: unitPrice,      
      totalPrice: totalItemPrice,
      sizeObj,
      addonsObjects
    };
  }

  /**
   * Cálculo de Adicionais Versão 2: Suporta regras de Sabores (Maior Valor / Média)
   * e herança de grupos via categorias.
   */
  async _calculateAddonsPriceV2(product, addonsIds, sizeName) {
    let addonsTotal = 0;
    const addonsObjects = [];

    if (!addonsIds || addonsIds.length === 0) {
      return { addonsTotal, addonsObjects };
    }

    // 1. Coletar grupos do Produto e das Categorias (Herança)
    const productGroups = product.addonGroups || [];
    const categoryGroups = (product.categories || []).flatMap(c => c.addonGroups || []);
    
    // De-duplicate por ID
    const allGroupsMap = new Map();
    [...categoryGroups, ...productGroups].forEach(g => allGroupsMap.set(g.id, g));
    const groups = Array.from(allGroupsMap.values());

    const counts = {};
    addonsIds.forEach(id => { counts[id] = (counts[id] || 0) + 1; });

    // 2. Processar cada grupo separadamente para aplicar as regras de sabor
    for (const group of groups) {
        const selectedAddonsInGroup = group.addons.filter(a => counts[a.id]);
        
        if (selectedAddonsInGroup.length === 0) continue;

        if (group.isFlavorGroup) {
            // Coleta os preços de cada seleção individual (considerando quantidade)
            const selectionPrices = [];
            selectedAddonsInGroup.forEach(addon => {
                const qty = counts[addon.id];
                for (let i = 0; i < qty; i++) {
                    selectionPrices.push(addon.price);
                }
            });

            if (selectionPrices.length > 0) {
                const rule = group.priceRule || 'higher';
                
                if (rule === 'average') {
                    const sum = selectionPrices.reduce((a, b) => a + b, 0);
                    addonsTotal += (sum / selectionPrices.length);
                } else {
                    // "higher" (Padrão Saipos/iFood)
                    addonsTotal += Math.max(...selectionPrices);
                }
            }
        } else {
            // Regra Normal: Somar todos os itens (Adicionais comuns)
            selectedAddonsInGroup.forEach(addon => {
                const qty = counts[addon.id];
                addonsTotal += (addon.price * qty);
            });
        }

        // Monta objetos para o retorno (metadados do pedido)
        selectedAddonsInGroup.forEach(addon => {
            addonsObjects.push({
                id: addon.id,
                name: addon.name,
                price: addon.price,
                quantity: counts[addon.id],
                groupName: group.name,
                isFlavor: group.isFlavorGroup
            });
        });
    }

    return { addonsTotal, addonsObjects };
  }
}

module.exports = new PricingService();