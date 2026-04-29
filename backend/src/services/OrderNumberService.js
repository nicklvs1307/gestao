const prisma = require('../lib/prisma');
const logger = require('../config/logger');

/**
 * Serviço centralizado para numeração de pedidos do dia.
 * Use este serviço em todas as integrações (iFood, Uairango, PDV, App) para manter
 * consistência na numeração de pedidos DELIVERY e PICKUP.
 * 
 * Lógica:
 * - Verifica se existe sessão de caixa ABERTA
 * - Se houver: usa o openedAt do caixa como referência inicial
 * - Se não houver: usa 00:00 do dia atual
 * - Filtra apenas pedidos DELIVERY e PICKUP
 * - Usa SELECT FOR UPDATE para evitar race conditions
 */
class OrderNumberService {
  /**
   * Obtém o próximo número sequencial de pedido para o dia.
   * @param {string} restaurantId - ID do restaurante
   * @returns {Promise<number>} O próximo número sequencial
   */
  static async getNextDailyOrderNumber(restaurantId) {
    logger.info(`[ORDER NUMBER] Gerando próximo número para restaurante ${restaurantId}`);
    
    return await prisma.$transaction(async (tx) => {
      const openSession = await tx.cashierSession.findFirst({
        where: { restaurantId, status: 'OPEN' },
        orderBy: { openedAt: 'desc' }
      });

      const startTime = openSession ? new Date(openSession.openedAt) : new Date();
      if (!openSession) {
        startTime.setHours(0, 0, 0, 0);
      }

      const lastOrders = await tx.$queryRaw`
        SELECT "dailyOrderNumber" FROM "Order" 
        WHERE "restaurantId" = ${restaurantId} 
        AND "orderType" IN ('DELIVERY', 'PICKUP')
        AND "createdAt" >= ${startTime}
        ORDER BY "dailyOrderNumber" DESC 
        LIMIT 1 
        FOR UPDATE
      `;

      const lastOrderNumber = lastOrders[0]?.dailyOrderNumber || 0;
      const nextNumber = lastOrderNumber + 1;
      
      logger.info(`[ORDER_NUMBER] Último número: ${lastOrderNumber}, Próximo: ${nextNumber} (Base: ${startTime.toISOString()})`);
      
      return nextNumber;
    });
  }
}

module.exports = OrderNumberService;