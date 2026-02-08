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

    // 2. Lógica de Pizza (Multi-sabores)
    const { finalBasePrice, flavorsObjects } = await this._calculatePizzaPrice(product, unitPrice, sizeName, flavorIds);
    unitPrice = finalBasePrice;

    // 3. Aplicação de Promoção
    const activePromotion = product.promotions?.[0]; // Pega a primeira ativa
    if (activePromotion) {
        if (activePromotion.discountType === 'percentage') {
            unitPrice = unitPrice * (1 - activePromotion.discountValue / 100);
        } else if (activePromotion.discountType === 'fixed_amount') {
            unitPrice = Math.max(0, unitPrice - activePromotion.discountValue);
        }
    }

    // 4. Cálculo de Adicionais
    const { addonsTotal, addonsObjects } = this._calculateAddonsPrice(product, addonsIds);
    
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
   * Lógica específica para cálculo de preços de Pizza com múltiplos sabores
   */
  async _calculatePizzaPrice(product, currentPrice, sizeName, flavorIds) {
    const flavorsObjects = [];
    let finalBasePrice = currentPrice;

    if (!flavorIds || flavorIds.length === 0) {
      return { finalBasePrice, flavorsObjects };
    }

    const flavors = await prisma.product.findMany({
      where: { id: { in: flavorIds } },
      include: { sizes: true }
    });

    if (flavors.length === 0) return { finalBasePrice, flavorsObjects };

    // Determinar o preço de cada sabor (considerando o tamanho selecionado, se houver)
    const flavorPrices = flavors.map(f => {
      if (sizeName) {
         const s = f.sizes.find(sz => sz.name === sizeName);
         return s ? s.price : f.price;
      }
      return f.price;
    });

    // Aplicar regra de preço da Pizza (Média ou Maior Valor)
    if (product.pizzaConfig) {
        const priceRule = product.pizzaConfig.priceRule || 'higher';
        let calculatedPrice = 0;

        if (priceRule === 'higher') {
          calculatedPrice = Math.max(...flavorPrices);
        } else if (priceRule === 'average') {
          calculatedPrice = flavorPrices.reduce((a, b) => a + b, 0) / flavorPrices.length;
        }

        if (calculatedPrice > 0) {
            finalBasePrice = calculatedPrice;
        }
    }

    // Montar objetos de visualização
    flavors.forEach(f => {
        flavorsObjects.push({ 
          id: f.id, 
          name: f.name, 
          price: sizeName ? (f.sizes.find(sz => sz.name === sizeName)?.price || f.price) : f.price 
        });
    });

    return { finalBasePrice, flavorsObjects };
  }

  /**
   * Lógica para somar adicionais e validar quantidades
   */
  _calculateAddonsPrice(product, addonsIds) {
    let addonsTotal = 0;
    const addonsObjects = [];

    if (!addonsIds || addonsIds.length === 0) {
      return { addonsTotal, addonsObjects };
    }

    const allProductAddons = product.addonGroups.flatMap(g => g.addons);
    const counts = {};
    
    addonsIds.forEach(id => {
      counts[id] = (counts[id] || 0) + 1;
    });

    for (const [addonId, qty] of Object.entries(counts)) {
        const addon = allProductAddons.find(a => a.id === addonId);
        
        // Fail-fast: Se o adicional não pertence ao produto, erro imediato.
        if (!addon) throw new Error(`Adicional inválido (ID: ${addonId}) para o produto ${product.name}`);
        
        // TODO: Aqui poderíamos validar 'maxQuantity' definido no AddonGroup se necessário
        
        addonsTotal += (addon.price * qty);
        addonsObjects.push({ 
            id: addon.id, 
            name: addon.name, 
            price: addon.price, 
            quantity: qty,
            saiposIntegrationCode: addon.saiposIntegrationCode 
        });
    }

    return { addonsTotal, addonsObjects };
  }
}

module.exports = new PricingService();