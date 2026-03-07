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
            order: { 
              restaurantId, 
              isSettled: false // FILTRO CORRETO AGORA
            },
            status: 'DELIVERED'
        }
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

    // --- BLOQUEIOS DE SEGURANÇA (ESTRITO ERP) ---

    // 1. Verificar Pedidos em Aberto (Cozinha/Produção/Entrega em curso)
    const activeOrders = await prisma.order.count({
        where: {
            restaurantId,
            status: { in: ['BUILDING', 'PENDING', 'PREPARING', 'READY', 'SHIPPED'] }
        }
    });

    if (activeOrders > 0) {
        throw new Error(`Não é possível fechar o caixa: Existem ${activeOrders} pedidos ainda em produção ou em trânsito.`);
    }

    // 2. Verificar Acertos de Motoboy Pendentes (Pedidos entregues mas não liquidados)
    const pendingDrivers = await prisma.deliveryOrder.count({
        where: {
            order: { restaurantId, isSettled: false },
            status: 'DELIVERED'
        }
    });

    if (pendingDrivers > 0) {
        throw new Error(`Não é possível fechar o caixa: Existem ${pendingDrivers} acertos de motoboy pendentes.`);
    }

    // 3. Verificar Mesas Abertas (Pedidos de mesa não finalizados)
    const openTables = await prisma.order.count({
        where: {
            restaurantId,
            orderType: 'TABLE',
            status: { notIn: ['COMPLETED', 'CANCELED'] }
        }
    });

    if (openTables > 0) {
        throw new Error(`Não é possível fechar o caixa: Existem ${openTables} mesas ainda abertas.`);
    }

    return await prisma.cashierSession.update({
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        finalAmount: parseFloat(finalAmount) || 0,
        notes: notes || '',
        closingDetails: closingDetails || {}
      }
    });
  }
}

module.exports = new CashierService();