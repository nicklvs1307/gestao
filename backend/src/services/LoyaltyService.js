const prisma = require('../lib/prisma');

class LoyaltyService {
  /**
   * Processa a pontuação e cashback de fidelidade.
   * 
   * @param {Object} order - Objeto do pedido (com total e relacionamentos)
   * @param {Object} tx - Cliente Prisma Transacional
   */
  async processLoyaltyRewards(order, tx) {
    const restaurant = await tx.restaurant.findUnique({
        where: { id: order.restaurantId },
        select: { settings: true }
    });

    // Se fidelidade não estiver ativa, ignora
    if (!restaurant?.settings?.loyaltyEnabled) return;

    // Tenta identificar o cliente
    let customerId = order.deliveryOrder?.customerId;

    // Fallback: Tenta buscar pelo telefone se não houver vínculo direto
    // Nota: Em um sistema ideal, o customerId já deveria estar no Order desde o início.
    if (!customerId && order.deliveryOrder?.phone) {
         const cleanPhone = order.deliveryOrder.phone.replace(/\D/g, '');
         const customer = await tx.customer.findFirst({ 
             where: { phone: cleanPhone, restaurantId: order.restaurantId } 
         });
         customerId = customer?.id;
    }

    if (!customerId) return; // Se não achou cliente, não pontua

    // Cálculo das recompensas
    const pointsToCredit = Math.floor(order.total * (restaurant.settings.pointsPerReal || 0));
    const cashbackToCredit = order.total * ((restaurant.settings.cashbackPercentage || 0) / 100);

    if (pointsToCredit > 0 || cashbackToCredit > 0) {
        await tx.customer.update({
            where: { id: customerId },
            data: { 
                loyaltyPoints: { increment: pointsToCredit }, 
                cashbackBalance: { increment: cashbackToCredit } 
            }
        });
    }
  }
}

module.exports = new LoyaltyService();