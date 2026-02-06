const prisma = require('../lib/prisma');

class CashierService {
  /**
   * Busca a sessão ativa e calcula o saldo atual em dinheiro.
   */
  async getActiveSessionStatus(restaurantId) {
    const session = await prisma.cashierSession.findFirst({
      where: { restaurantId, status: 'OPEN' },
      include: { user: { select: { name: true } } }
    });

    if (!session) return { isOpen: false, session: null };

    const transactions = await prisma.financialTransaction.findMany({
      where: { cashierId: session.id, status: 'PAID' },
      select: { amount: true, type: true, paymentMethod: true }
    });

    const cashBalance = transactions.reduce((acc, t) => {
      if (t.paymentMethod === 'cash') {
        return t.type === 'INCOME' ? acc + t.amount : acc - t.amount;
      }
      return acc;
    }, session.initialAmount);

    return {
      isOpen: true,
      session: { ...session, cashBalance }
    };
  }

  /**
   * Abre uma nova sessão de caixa.
   */
  async openSession(restaurantId, userId, initialAmount) {
    const existing = await prisma.cashierSession.findFirst({
      where: { restaurantId, status: 'OPEN' }
    });

    if (existing) throw new Error("Já existe um caixa aberto para este restaurante.");

    return await prisma.cashierSession.create({
      data: {
        restaurantId,
        userId,
        initialAmount: parseFloat(initialAmount) || 0,
        status: 'OPEN',
        openedAt: new Date()
      }
    });
  }

  /**
   * Fecha a sessão atual.
   */
  async closeSession(restaurantId, { finalAmount, notes }) {
    const session = await prisma.cashierSession.findFirst({
      where: { restaurantId, status: 'OPEN' }
    });

    if (!session) throw new Error("Nenhum caixa aberto encontrado.");

    return await prisma.cashierSession.update({
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        finalAmount: parseFloat(finalAmount) || 0,
        notes
      }
    });
  }
}

module.exports = new CashierService();