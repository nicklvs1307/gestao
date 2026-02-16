const prisma = require('../lib/prisma');

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
      include: { items: true }
    });

    if (!entry) throw new Error('Entrada não encontrada.');
    if (entry.status === 'CONFIRMED') throw new Error('Esta entrada já foi confirmada.');

    // 1. Atualizar estoque de cada ingrediente
    for (const item of entry.items) {
      // Aplica fator de conversão se existir (ex: Compra 1 CX com Fator 12 -> Incrementa 12 no estoque)
      const conversionFactor = item.conversionFactor || 1;
      const quantityToIncrement = item.quantity * conversionFactor;

      await tx.ingredient.update({
        where: { id: item.ingredientId },
        data: {
          stock: { increment: quantityToIncrement },
          lastUnitCost: item.unitCost / conversionFactor // O custo unitário real é dividido pelo fator
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
      include: { recipe: { include: { componentIngredient: true } } }
    });

    if (!ingredient || !ingredient.isProduced) throw new Error('Este item não é um produto beneficiado.');
    if (!ingredient.recipe || ingredient.recipe.length === 0) throw new Error('Este item não possui receita cadastrada.');

    // Baixa insumos da receita
    for (const item of ingredient.recipe) {
      const needed = item.quantity * quantity;
      if (item.componentIngredient.stock < needed) {
        throw new Error(`Estoque insuficiente de ${item.componentIngredient.name}.`);
      }

      await tx.ingredient.update({
        where: { id: item.componentIngredientId },
        data: { stock: { decrement: needed } }
      });
    }

    // Incrementa produto final
    await tx.ingredient.update({
      where: { id: ingredientId },
      data: { stock: { increment: quantity } }
    });

    // Registra Log
    return await tx.productionLog.create({
      data: { restaurantId, ingredientId, quantity, producedAt: new Date() }
    });
  }

  /**
   * Baixa o estoque de um único item
   */
  async _deductItemStock(item, tx) {
    const { product, quantity } = item;

    if (product.ingredients && product.ingredients.length > 0) {
      for (const recipeItem of product.ingredients) {
        await tx.ingredient.update({
          where: { id: recipeItem.ingredientId },
          data: { stock: { decrement: recipeItem.quantity * quantity } }
        });
      }
    } else {
      await tx.product.update({
        where: { id: product.id },
        data: { stock: { decrement: quantity } }
      });
    }
  }
}

module.exports = new InventoryService();