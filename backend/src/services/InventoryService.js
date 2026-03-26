const prisma = require('../lib/prisma');
const logger = require('../config/logger');

class InventoryService {
  /**
   * Processa a baixa de estoque de um pedido completo.
   */
  async processOrderStockDeduction(orderId, tx) {
    const orderWithItems = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: { include: { ingredients: true } } } } }
    });

    if (!orderWithItems) throw new Error("Pedido não encontrado para baixa de estoque.");

    for (const item of orderWithItems.items) {
        await this._deductItemStock(item, tx);
    }
  }

  /**
   * Confirma uma entrada de estoque, incrementando o saldo dos insumos e gerando financeiro.
   */
  async confirmStockEntry(entryId, tx) {
    const entry = await tx.stockEntry.findUnique({
      where: { id: entryId },
      include: { items: { include: { ingredient: true } } }
    });

    if (!entry) throw new Error('Entrada não encontrada.');
    if (entry.status === 'CONFIRMED') throw new Error('Esta entrada já foi confirmada.');

    // 1. Atualizar estoque de cada ingrediente e calcular Custo Médio
    for (const item of entry.items) {
      const ingredient = item.ingredient;
      const conversionFactor = item.conversionFactor || 1;
      const quantityToIncrement = item.quantity * conversionFactor;
      const newUnitCost = item.unitCost / conversionFactor;

      // Cálculo do Custo Médio Ponderado (CMP)
      // CMP = ((Estoque Atual * Custo Médio Atual) + (Nova Qtd * Novo Custo)) / (Estoque Total)
      let newAverageCost = newUnitCost;
      const currentStock = ingredient.stock || 0;
      const currentAverageCost = ingredient.averageCost || 0;

      if (currentStock > 0) {
        newAverageCost = ((currentStock * currentAverageCost) + (quantityToIncrement * newUnitCost)) / (currentStock + quantityToIncrement);
      } else if (currentStock < 0) {
        // Se o estoque estiver negativo, o novo custo médio é o custo da nova entrada
        newAverageCost = newUnitCost;
      }

      await tx.ingredient.update({
        where: { id: item.ingredientId },
        data: {
          stock: { increment: quantityToIncrement },
          lastUnitCost: newUnitCost,
          averageCost: newAverageCost
        }
      });
    }

    // 2. Gerar Transação Financeira (Despesa)
    const transaction = await tx.financialTransaction.create({
      data: {
        description: `Compra NF #${entry.invoiceNumber || entry.id.slice(-4)}`,
        amount: entry.totalAmount,
        type: 'EXPENSE',
        status: 'PENDING',
        dueDate: new Date(),
        restaurantId: entry.restaurantId,
        supplierId: entry.supplierId,
        stockEntry: { connect: { id: entryId } }
      }
    });

    // 3. Confirmar a Entrada
    await tx.stockEntry.update({
      where: { id: entryId },
      data: { status: 'CONFIRMED', transactionId: transaction.id }
    });

    return { success: true, transactionId: transaction.id };
  }

  /**
   * Processa a produção de um item beneficiado (Massa, Molho, etc)
   */
  async processProduction(restaurantId, { ingredientId, quantity }, tx) {
    const ingredient = await tx.ingredient.findUnique({
      where: { id: ingredientId },
      include: { 
        recipe: { include: { componentIngredient: true } },
        restaurant: true 
      }
    });

    if (!ingredient || !ingredient.isProduced) throw new Error('Este item não é um produto beneficiado.');
    if (!ingredient.recipe || ingredient.recipe.length === 0) throw new Error('Este item não possui receita cadastrada.');

    let totalProductionCost = 0;

    // Baixa insumos da receita e calcula custo de produção
    for (const item of ingredient.recipe) {
      const needed = item.quantity * quantity;
      if (item.componentIngredient.stock < needed) {
        throw new Error(`Estoque insuficiente de ${item.componentIngredient.name}.`);
      }

      totalProductionCost += (item.quantity * (item.componentIngredient.averageCost || 0));

      await tx.ingredient.update({
        where: { id: item.componentIngredientId },
        data: { stock: { decrement: needed } }
      });
    }

    // Custo unitário da produção
    const unitProductionCost = totalProductionCost / (ingredient.yieldAmount || 1);

    // Atualiza custo médio do item produzido
    const currentStock = ingredient.stock || 0;
    const currentAverageCost = ingredient.averageCost || 0;
    const newAverageCost = currentStock > 0 
      ? ((currentStock * currentAverageCost) + (quantity * unitProductionCost)) / (currentStock + quantity)
      : unitProductionCost;

    // Incrementa produto final
    await tx.ingredient.update({
      where: { id: ingredientId },
      data: { 
        stock: { increment: quantity },
        lastUnitCost: unitProductionCost,
        averageCost: newAverageCost
      }
    });

    // Registra Log
    return await tx.productionLog.create({
      data: { restaurantId, ingredientId, quantity, producedAt: new Date() }
    });
  }

  /**
   * Baixa o estoque de um único item (Produto + Adicionais)
   */
  async _deductItemStock(item, tx) {
    const { product, quantity, addonsJson } = item;

    // 1. Baixa Insumos do Produto Principal
    if (product.ingredients && product.ingredients.length > 0) {
      for (const recipeItem of product.ingredients) {
        await tx.ingredient.update({
          where: { id: recipeItem.ingredientId },
          data: { stock: { decrement: recipeItem.quantity * quantity } }
        });
      }
    } else {
      // Se não tem ficha técnica, baixa o estoque do produto diretamente
      await tx.product.update({
        where: { id: product.id },
        data: { stock: { decrement: quantity } }
      });
    }

    // 2. Baixa Insumos dos Adicionais/Complementos (Processa JSON do pedido)
    if (addonsJson) {
      try {
        const addons = JSON.parse(addonsJson);
        if (addons.length > 0) {
          // Batch fetch all addons at once to avoid N+1 query
          const addonIds = addons.map(a => a.id);
          const addonsWithIngredients = await tx.addon.findMany({
            where: { id: { in: addonIds } },
            include: { ingredients: true }
          });
          const addonMap = new Map(addonsWithIngredients.map(a => [a.id, a]));

          for (const addon of addons) {
            const addonWithIngredients = addonMap.get(addon.id);
            if (addonWithIngredients && addonWithIngredients.ingredients.length > 0) {
              for (const addonIng of addonWithIngredients.ingredients) {
                await tx.ingredient.update({
                  where: { id: addonIng.ingredientId },
                  data: { stock: { decrement: (addonIng.quantity * (addon.quantity || 1)) * quantity } }
                });
              }
            }
          }
        }
      } catch (e) {
        logger.error("Erro ao processar baixa de estoque de adicionais:", e);
      }
    }
  }
}

module.exports = new InventoryService();