const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CashierController = {
  // GET /api/cashier/status
  async getStatus(req, res) {
    try {
      const restaurantId = req.restaurantId;
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));

      // Busca uma sessão ABERTA para este restaurante
      // Idealmente, um usuário só pode ter um caixa aberto, ou o restaurante tem caixas físicos.
      // Aqui vamos assumir um caixa por usuário ou geral do restaurante. 
      // Para simplificar o PDV, vamos pegar a última sessão aberta do usuário logado.
      
      const session = await prisma.cashierSession.findFirst({
        where: {
          restaurantId: restaurantId,
          status: 'OPEN'
        },
        include: {
          user: {
            select: { name: true }
          }
        }
      });

      if (session) {
        // Calcular saldo em dinheiro (Dinheiro inicial + entradas em dinheiro - saídas em dinheiro)
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

        return res.json({ 
            isOpen: true, 
            session: {
                ...session,
                cashBalance
            } 
        });
      }

      return res.json({ isOpen: false, session: null });

    } catch (error) {
      console.error("Erro ao buscar status do caixa:", error);
      return res.status(500).json({ error: "Erro interno ao buscar status do caixa." });
    }
  },

  // POST /api/cashier/open
  async open(req, res) {
    try {
      const restaurantId = req.restaurantId;
      const { initialAmount } = req.body;
      const userId = req.user.id;

      // Verifica se já tem caixa aberto
      const existingSession = await prisma.cashierSession.findFirst({
        where: {
          restaurantId,
          status: 'OPEN'
        }
      });

      if (existingSession) {
        return res.status(400).json({ error: "Você já possui um caixa aberto." });
      }

      const newSession = await prisma.cashierSession.create({
        data: {
          restaurantId,
          userId,
          initialAmount: parseFloat(initialAmount) || 0,
          status: 'OPEN',
          openedAt: new Date()
        }
      });

      return res.status(201).json(newSession);

    } catch (error) {
      console.error("Erro ao abrir caixa:", error);
      return res.status(500).json({ error: "Erro ao abrir caixa." });
    }
  },

  // POST /api/cashier/close
  async close(req, res) {
    try {
      const restaurantId = req.restaurantId;
      const userId = req.user.id;
      const { finalAmount, notes } = req.body;

      const session = await prisma.cashierSession.findFirst({
        where: {
          restaurantId,
          status: 'OPEN'
        }
      });

      if (!session) {
        return res.status(400).json({ error: "Nenhum caixa aberto encontrado para fechar." });
      }

      const closedSession = await prisma.cashierSession.update({
        where: { id: session.id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          finalAmount: parseFloat(finalAmount) || 0,
          notes: notes
        }
      });

      return res.json(closedSession);

    } catch (error) {
      console.error("Erro ao fechar caixa:", error);
      return res.status(500).json({ error: "Erro ao fechar caixa." });
    }
  },

  // GET /api/cashier/summary
  // Retorna o resumo atual do caixa (quanto vendeu até agora) para conferência antes de fechar
  async getSummary(req, res) {
    try {
      const restaurantId = req.restaurantId;

      const session = await prisma.cashierSession.findFirst({
        where: {
          restaurantId,
          status: 'OPEN'
        }
      });

      if (!session) {
        return res.status(404).json({ error: "Nenhum caixa aberto." });
      }

      // Buscar transações financeiras vinculadas a este caixa
      let transactions = await prisma.financialTransaction.findMany({
        where: {
          cashierId: session.id,
          status: { not: 'CANCELED' }
        },
        orderBy: { createdAt: 'desc' }
      });

      // FALLBACK: Se não houver transações vinculadas, buscar Orders do período
      if (transactions.length === 0) {
        const orders = await prisma.order.findMany({
          where: {
            restaurantId,
            status: 'COMPLETED',
            createdAt: { gte: session.openedAt }
          },
          include: { payments: true }
        });

        // Simular transações para o resumo
        transactions = orders.map(o => ({
          id: o.id,
          description: `Pedido #${o.dailyOrderNumber || o.id.slice(-4)}`,
          amount: o.total,
          type: 'INCOME',
          paymentMethod: o.payments?.[0]?.method || 'other',
          createdAt: o.createdAt
        }));
      }
      
      // Agrupar por método de pagamento
      const salesByMethod = transactions.reduce((acc, curr) => {
        const method = curr.paymentMethod || 'outros';
        if (!acc[method]) acc[method] = 0;
        acc[method] += curr.amount;
        return acc;
      }, {});

      const totalSales = Object.values(salesByMethod).reduce((a, b) => a + b, 0);

      return res.json({
        sessionId: session.id,
        openedAt: session.openedAt,
        initialAmount: session.initialAmount,
        totalSales: totalSales,
        salesByMethod: salesByMethod,
        transactions: transactions
      });

    } catch (error) {
      console.error("Erro ao buscar resumo do caixa:", error);
      return res.status(500).json({ error: "Erro ao buscar resumo." });
    }
  },

  // POST /api/cashier/transaction
  // Registra uma sangria ou reforço
  async addTransaction(req, res) {
    try {
      const restaurantId = req.restaurantId;
      const userId = req.user.id;
      const { description, amount, type } = req.body; // type: 'INCOME' (Reforço) ou 'EXPENSE' (Sangria)

      const session = await prisma.cashierSession.findFirst({
        where: { restaurantId, status: 'OPEN' }
      });

      if (!session) {
        return res.status(400).json({ error: "Nenhum caixa aberto para esta operação." });
      }

      const transaction = await prisma.financialTransaction.create({
        data: {
          restaurantId,
          cashierId: session.id,
          description: type === 'INCOME' ? `[REFORÇO] ${description}` : `[SANGRIA] ${description}`,
          amount: parseFloat(amount),
          type,
          status: 'PAID',
          dueDate: new Date(),
          paymentDate: new Date(),
          paymentMethod: 'cash'
        }
      });

      return res.status(201).json(transaction);
    } catch (error) {
      console.error("Erro ao registrar movimentação de caixa:", error);
      return res.status(500).json({ error: "Erro ao registrar movimentação." });
    }
  },

  // GET /api/cashier/history
  async getHistory(req, res) {
    try {
      const restaurantId = req.restaurantId;
      const sessions = await prisma.cashierSession.findMany({
        where: { restaurantId },
        orderBy: { openedAt: 'desc' },
        take: 20,
        include: {
          user: { select: { name: true } }
        }
      });
      return res.json(sessions);
    } catch (error) {
      console.error("Erro ao buscar histórico de caixas:", error);
      return res.status(500).json({ error: "Erro ao buscar histórico." });
    }
  }
};

module.exports = CashierController;
