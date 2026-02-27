const prisma = require('../lib/prisma');

class PricingService {
  /**
   * Calcula o preço unitário e total de um item, considerando regras de negócio,
   * tamanhos, pizzas (sabores) e adicionais.
   */
  async calculateItemPrice(productId, quantity, sizeId, addonsIds = [], flavorIds = []) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { 
        sizes: true, 
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

    // 2. Lógica de Pizza (Multi-sabores via Produtos vinculados - Legado)
    const { finalBasePrice: pizzaBasePrice, flavorsObjects } = await this._calculatePizzaPrice(product, unitPrice, sizeName, flavorIds);
    unitPrice = pizzaBasePrice;

    // 3. Aplicação de Promoção
    const activePromotion = product.promotions?.[0];
    if (activePromotion) {
        if (activePromotion.discountType === 'percentage') {
            unitPrice = unitPrice * (1 - activePromotion.discountValue / 100);
        } else if (activePromotion.discountType === 'fixed_amount') {
            unitPrice = Math.max(0, unitPrice - activePromotion.discountValue);
        }
    }

    // 4. Cálculo de Adicionais (Unificado: Extras + Sabores como Opções)
    const { addonsTotal, addonsObjects } = await this._calculateAddonsPriceV2(product, addonsIds, sizeName);
    
    const finalUnitPrice = unitPrice + addonsTotal;
    const totalItemPrice = finalUnitPrice * quantity;

    return {
      product,
      unitPrice: finalUnitPrice, 
      basePrice: unitPrice,      
      totalPrice: totalItemPrice,
      sizeObj,
      addonsObjects,
      flavorsObjects
    };
  }

  /**
   * Cálculo de Adicionais Versão 2: Suporta regras de Sabores (Maior Valor / Média)
   */
  async _calculateAddonsPriceV2(product, addonsIds, sizeName) {
    let addonsTotal = 0;
    const addonsObjects = [];

    if (!addonsIds || addonsIds.length === 0) {
      return { addonsTotal, addonsObjects };
    }

    // Busca os grupos para saber quais são FlavorGroups
    const groups = await prisma.addonGroup.findMany({
        where: { products: { some: { id: product.id } } },
        include: { addons: true }
    });

    const counts = {};
    addonsIds.forEach(id => { counts[id] = (counts[id] || 0) + 1; });

    // Processar cada grupo separadamente para aplicar as regras de sabor
    for (const group of groups) {
        const selectedAddonsInGroup = group.addons.filter(a => counts[a.id]);
        
        if (selectedAddonsInGroup.length === 0) continue;

        if (group.isFlavorGroup) {
            // Regra de Pizza: Maior valor entre os selecionados
            // Nota: No modelo de Adicionais, o preço costuma ser absoluto ou incremental.
            // Para "Sabores como Adicionais", o preço do adicional costuma ser o preço do sabor.
            const prices = selectedAddonsInGroup.map(a => a.price);
            
            // Aqui pegamos o MAIOR preço do adicional e somamos (ou subtraímos a diferença do base)
            // Para simplificar padrão Saipos: o produto base tem preço 0 ou preço da massa, 
            // e o "Adicional Sabor" tem o preço real.
            const groupPrice = Math.max(...prices);
            addonsTotal += groupPrice;
        } else {
            // Regra Normal: Somar todos
            selectedAddonsInGroup.forEach(addon => {
                const qty = counts[addon.id];
                addonsTotal += (addon.price * qty);
            });
        }

        // Monta objetos para o retorno
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