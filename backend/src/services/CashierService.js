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

    // Busca todas as transações da sessão
    const transactions = await prisma.financialTransaction.findMany({
      where: { cashierId: session.id, status: 'PAID' },
      select: { amount: true, type: true, paymentMethod: true, description: true }
    });

    // Calcula saldo em dinheiro (Dinheiro em mãos)
    const cashInHand = transactions.reduce((acc, t) => {
      if (t.paymentMethod === 'cash') {
        return t.type === 'INCOME' ? acc + t.amount : acc - t.amount;
      }
      return acc;
    }, session.initialAmount);

    // Resumo por método de pagamento
    const salesByMethod = transactions.reduce((acc, t) => {
      if (t.type === 'INCOME') {
        const method = t.paymentMethod || 'other';
        acc[method] = (acc[method] || 0) + t.amount;
      }
      return acc;
    }, {});

    // Sangrias e Reforços
    const adjustments = transactions.reduce((acc, t) => {
      if (t.description.includes('[SANGRIA]')) acc.sangria += t.amount;
      if (t.description.includes('[REFORÇO]')) acc.reforco += t.amount;
      return acc;
    }, { sangria: 0, reforco: 0 });

    // Busca acertos de entregadores pendentes do dia
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const pendingDriverSettlements = await prisma.deliveryOrder.findMany({
        where: {
            order: { restaurantId, createdAt: { gte: today, lte: endOfDay } },
            status: 'DELIVERED'
            // Assumindo que o acerto cria uma FinancialTransaction, poderíamos filtrar aqui
        },
        include: { order: true }
    });

    return {
      isOpen: true,
      session: { 
        ...session, 
        cashInHand, 
        salesByMethod, 
        adjustments,
        pendingDriverSettlementsCount: pendingDriverSettlements.length
      }
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
  async closeSession(restaurantId, { finalAmount, notes, closingDetails }) {
    const session = await prisma.cashierSession.findFirst({
      where: { restaurantId, status: 'OPEN' }
    });

    if (!session) throw new Error("Nenhum caixa aberto encontrado.");

    // Se houver detalhes, podemos salvar como JSON nas notas ou em um novo campo.
    // Como não quero mudar o schema agora, vou concatenar nas notas de forma estruturada
    let finalNotes = notes || '';
    if (closingDetails) {
        finalNotes += `\n\n[CONFERÊNCIA DETALHADA]:\n` + 
            Object.entries(closingDetails)
                .map(([method, value]) => `${method.toUpperCase()}: R$ ${parseFloat(value || 0).toFixed(2)}`)
                .join('\n');
    }

    return await prisma.cashierSession.update({
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        finalAmount: parseFloat(finalAmount) || 0,
        notes: finalNotes
      }
    });
  }
}

module.exports = new CashierService();