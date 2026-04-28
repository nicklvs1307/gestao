const logger = require('../config/logger');
const prisma = require('../lib/prisma');

class PricingService {
  /**
   * Calcula o custo real de um produto baseado na sua ficha técnica (ingredientes).
   */
  async calculateProductCost(productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        ingredients: {
          include: { ingredient: true }
        }
      }
    });

    if (!product) return 0;

    // Soma o custo de cada ingrediente (Quantidade * Custo Médio)
    const cost = product.ingredients.reduce((acc, pi) => {
      const ingredientCost = pi.ingredient.averageCost || 0;
      return acc + (pi.quantity * ingredientCost);
    }, 0);

    return cost;
  }

  /**
   * Calcula o custo real de um adicional baseado na sua ficha técnica.
   */
  async calculateAddonCost(addonId) {
    const addon = await prisma.addon.findUnique({
      where: { id: addonId },
      include: {
        ingredients: {
          include: { ingredient: true }
        }
      }
    });

    if (!addon) return 0;

    const cost = addon.ingredients.reduce((acc, ai) => {
      const ingredientCost = ai.ingredient.averageCost || 0;
      return acc + (ai.quantity * ingredientCost);
    }, 0);

    return cost;
  }

  /**
   * Calcula o preço unitário e total de um item...
   */
  async calculateItemPrice(productId, quantity, sizeId, addonsIds) {
    logger.info(`[PRICING] calculateItemPrice chamado para productId=${productId}, quantity=${quantity}, sizeId=${sizeId}, addonsIds=${JSON.stringify(addonsIds)}`);
    
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
    logger.info(`[PRICING] Calculando adicionais para produto: ${product.name} (IDs: ${JSON.stringify(addonsIds)})`);
    let addonsTotal = 0;
    const addonsObjects = [];

    logger.info(`[PRICING] addonsIds é array? ${Array.isArray(addonsIds)}, length: ${addonsIds?.length}`);

    if (!addonsIds || addonsIds.length === 0) {
      logger.info(`[PRICING] Nenhum ID de adicional recebido.`);
      return { addonsTotal, addonsObjects };
    }

    // 1. Coletar grupos do Produto e das Categorias (Herança)
    const productGroups = product.addonGroups || [];
    const categoryGroups = (product.categories || []).flatMap(c => c.addonGroups || []);
    
    // De-duplicate por ID
    const allGroupsMap = new Map();
    [...categoryGroups, ...productGroups].forEach(g => allGroupsMap.set(g.id, g));
    const groups = Array.from(allGroupsMap.values());
    logger.info(`[PRICING] Grupos encontrados para este produto: ${groups.map(g => g.name).join(', ')}`);

    const counts = {};
    addonsIds.forEach(id => { 
        if (id) counts[id] = (counts[id] || 0) + 1; 
    });

    // 2. Processar cada grupo separadamente para aplicar as regras de sabor
    for (const group of groups) {
        const selectedAddonsInGroup = group.addons.filter(a => counts[a.id]);
        
        if (selectedAddonsInGroup.length === 0) {
            logger.info(`[PRICING] Grupo "${group.name}" não tem nenhum dos itens selecionados.`);
            continue;
        }

        logger.info(`[PRICING] Itens encontrados no grupo "${group.name}": ${selectedAddonsInGroup.map(a => a.name).join(', ')}`);

        if (group.isFlavorGroup) {
            logger.info(`[PRICING] Processando como GRUPO DE SABOR (Regra: ${group.priceRule || 'higher'})`);
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
            logger.info(`[PRICING] Processando como GRUPO DE ADICIONAIS COMUNS`);
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
                isFlavor: group.isFlavorGroup,
                saiposIntegrationCode: addon.saiposIntegrationCode || null
            });
        });
    }

    logger.info(`[PRICING] Total de adicionais calculado: ${addonsTotal}`);
    return { addonsTotal, addonsObjects };
  }
}

module.exports = new PricingService();