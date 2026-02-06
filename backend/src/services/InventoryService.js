const prisma = require('../lib/prisma');

class InventoryService {
  /**
   * Processa a baixa de estoque de um pedido completo.
   * Suporta produtos simples (estoque direto) e compostos (ficha técnica).
   * 
   * @param {string} orderId - ID do pedido
   * @param {Object} tx - Cliente Prisma Transacional (Obrigatório)
   */
  async processOrderStockDeduction(orderId, tx) {
    // Busca o pedido com todas as informações necessárias para explodir a árvore de produtos
    const orderWithItems = await tx.order.findUnique({
        where: { id: orderId },
        include: { 
            items: { 
                include: { 
                    product: { 
                        include: { ingredients: true } 
                    } 
                } 
            } 
        }
    });

    if (!orderWithItems) throw new Error("Pedido não encontrado para baixa de estoque.");

    for (const item of orderWithItems.items) {
        await this._deductItemStock(item, tx);
    }
  }

  /**
   * Baixa o estoque de um único item (Recursivo se necessário no futuro)
   */
  async _deductItemStock(item, tx) {
    const { product, quantity } = item;

    // Caso 1: Produto com Ficha Técnica (Ingredients)
    // Baixa os insumos proporcionalmente
    if (product.ingredients && product.ingredients.length > 0) {
        for (const recipeItem of product.ingredients) {
            const quantityToDeduct = recipeItem.quantity * quantity;
            
            await tx.ingredient.update({
                where: { id: recipeItem.ingredientId },
                data: { stock: { decrement: quantityToDeduct } }
            });
        }
    } 
    // Caso 2: Produto de Revenda (Estoque direto no produto)
    else {
        await tx.product.update({
            where: { id: product.id },
            data: { stock: { decrement: quantity } }
        });
    }
  }
}

module.exports = new InventoryService();