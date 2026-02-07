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

    const transactions = await prisma.financialTransaction.findMany({
      where: { cashierId: session.id, status: { not: 'CANCELED' } },
      orderBy: { createdAt: 'desc' }
    });

    const salesByMethod = transactions.reduce((acc, curr) => {
      const method = curr.paymentMethod || 'outros';
      if (!acc[method]) acc[method] = 0;
      acc[method] += curr.amount;
      return acc;
    }, {});

    const totalSales = Object.values(salesByMethod).reduce((a, b) => a + b, 0);

    res.json({
      sessionId: session.id,
      openedAt: session.openedAt,
      initialAmount: session.initialAmount,
      totalSales,
      salesByMethod,
      transactions
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

    const transaction = await prisma.financialTransaction.create({
      data: {
        restaurantId: req.restaurantId,
        cashierId: session.id,
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
}

module.exports = new CashierController();