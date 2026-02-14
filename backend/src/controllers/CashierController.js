const prisma = require('../lib/prisma');
const CashierService = require('../services/CashierService');
const asyncHandler = require('../middlewares/asyncHandler');
const { OpenCashierSchema, CloseCashierSchema, CashierTransactionSchema } = require('../schemas/cashierSchema');

class CashierController {

  // GET /api/cashier/status
  getStatus = asyncHandler(async (req, res) => {
    const status = await CashierService.getActiveSessionStatus(req.restaurantId);
    res.json(status);
  });

  // POST /api/cashier/open
  open = asyncHandler(async (req, res) => {
    const validatedData = OpenCashierSchema.parse(req.body);
    const session = await CashierService.openSession(req.restaurantId, req.user.id, validatedData.initialAmount);
    res.status(201).json(session);
  });

  // POST /api/cashier/close
  close = asyncHandler(async (req, res) => {
    const validatedData = CloseCashierSchema.parse(req.body);
    const session = await CashierService.closeSession(req.restaurantId, validatedData);
    res.json(session);
  });

  // GET /api/cashier/summary
  getSummary = asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    const session = await prisma.cashierSession.findFirst({
      where: { restaurantId, status: 'OPEN' }
    });

    if (!session) {
      res.status(404);
      throw new Error("Nenhum caixa aberto.");
    }

    // Busca formas de pagamento cadastradas
    const restaurantPaymentMethods = await prisma.paymentMethod.findMany({
        where: { restaurantId, isActive: true }
    });

    const transactions = await prisma.financialTransaction.findMany({
      where: { cashierId: session.id, status: { not: 'CANCELED' } },
      orderBy: { createdAt: 'desc' }
    });

    // Filtra apenas vendas
    const salesTransactions = transactions.filter(t => 
      t.type === 'INCOME' && !t.description.includes('[REFORÇO]') && !t.description.includes('[SANGRIA]')
    );

    const salesByMethod = salesTransactions.reduce((acc, curr) => {
      const method = curr.paymentMethod || 'other';
      if (!acc[method]) acc[method] = 0;
      acc[method] += curr.amount;
      return acc;
    }, {});

    const adjustments = transactions.reduce((acc, t) => {
      if (t.description.includes('[SANGRIA]')) acc.sangria += t.amount;
      if (t.description.includes('[REFORÇO]')) acc.reforco += t.amount;
      return acc;
    }, { sangria: 0, reforco: 0 });

    const totalSales = Object.values(salesByMethod).reduce((a, b) => a + b, 0);

    res.json({
      sessionId: session.id,
      openedAt: session.openedAt,
      initialAmount: session.initialAmount,
      totalSales,
      salesByMethod,
      adjustments,
      transactions,
      availableMethods: restaurantPaymentMethods
    });
  });

  // POST /api/cashier/transaction (Sangria/Reforço)
  addTransaction = asyncHandler(async (req, res) => {
    const validatedData = CashierTransactionSchema.parse(req.body);
    
    const session = await prisma.cashierSession.findFirst({
      where: { restaurantId: req.restaurantId, status: 'OPEN' }
    });

    if (!session) {
      res.status(400);
      throw new Error("Nenhum caixa aberto para esta operação.");
    }

    // Busca ou cria categoria para ajustes de caixa
    const categoryName = validatedData.type === 'INCOME' ? 'Reforço de Caixa' : 'Sangria de Caixa';
    let category = await prisma.transactionCategory.findFirst({
        where: { restaurantId: req.restaurantId, name: categoryName }
    });

    if (!category) {
        category = await prisma.transactionCategory.create({
            data: {
                name: categoryName,
                type: validatedData.type,
                isSystem: true,
                restaurantId: req.restaurantId
            }
        });
    }

    const transaction = await prisma.financialTransaction.create({
      data: {
        restaurantId: req.restaurantId,
        cashierId: session.id,
        categoryId: category.id,
        description: validatedData.type === 'INCOME' ? `[REFORÇO] ${validatedData.description}` : `[SANGRIA] ${validatedData.description}`,
        amount: validatedData.amount,
        type: validatedData.type,
        status: 'PAID',
        dueDate: new Date(),
        paymentDate: new Date(),
        paymentMethod: 'cash'
      }
    });

    res.status(201).json(transaction);
  });

  // GET /api/cashier/history
  getHistory = asyncHandler(async (req, res) => {
    const sessions = await prisma.cashierSession.findMany({
      where: { restaurantId: req.restaurantId },
      orderBy: { openedAt: 'desc' },
      take: 20,
      include: { user: { select: { name: true } } }
    });
    res.json(sessions);
  });

  // GET /api/cashier/orders
  getSessionOrders = asyncHandler(async (req, res) => {
    const session = await prisma.cashierSession.findFirst({
      where: { restaurantId: req.restaurantId, status: 'OPEN' }
    });

    if (!session) {
      res.status(404);
      throw new Error("Nenhum caixa aberto.");
    }

    // Busca pedidos que possuem transações financeiras vinculadas a este caixa
    // OU pedidos criados durante esta sessão
    // OU pedidos que foram atualizados (ex: finalizados) durante esta sessão
    const orders = await prisma.order.findMany({
      where: { 
        restaurantId: req.restaurantId,
        OR: [
            { financialTransaction: { some: { cashierId: session.id } } },
            { createdAt: { gte: session.openedAt } },
            { updatedAt: { gte: session.openedAt }, status: 'COMPLETED' }
        ]
      },
      include: {
        items: { include: { product: true } },
        deliveryOrder: true,
        payments: true,
        user: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  });
}

module.exports = new CashierController();