const prisma = require('../lib/prisma');
const CashierService = require('../services/CashierService');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');
const { CloseCashierSchema, OpenCashierSchema, CashierTransactionSchema } = require('../schemas/cashierSchema');

class CashierController {

  // GET /api/cashier/status
  getStatus = asyncHandler(async (req, res) => {
    const status = await CashierService.getActiveSessionStatus(req.restaurantId);
    res.json(status);
  });

  // POST /api/cashier/open
  open = asyncHandler(async (req, res) => {
    // Validação Manual para evitar erro de middleware
    const result = OpenCashierSchema.safeParse(req.body);
    if (!result.success) {
        throw new AppError(`Dados de abertura inválidos: ${result.error.issues.map(i => i.message).join(', ')}`, 400);
    }
    
    const session = await CashierService.openSession(req.restaurantId, req.user.id, result.data.initialAmount);
    res.status(201).json(session);
  });

  // POST /api/cashier/close
  close = asyncHandler(async (req, res) => {
    console.log('[CASHIER_CONTROLLER] Iniciando fechamento:', req.body);
    
    // Importação dinâmica para evitar dependência circular ou erro de carregamento
    const { CloseCashierSchema } = require('../schemas/cashierSchema');
    
    if (!CloseCashierSchema) {
        console.error('[CASHIER_CONTROLLER] ERRO: CloseCashierSchema está undefined!');
        throw new AppError("Erro interno ao carregar validador de caixa.", 500);
    }

    // Validação Manual e Segura
    const result = CloseCashierSchema.safeParse(req.body);
    
    if (!result.success) {
        console.error('[CASHIER_CONTROLLER] Erro de Validação Zod:', result.error.format());
        const errorMsg = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(' | ');
        throw new AppError(`Erro nos dados enviados: ${errorMsg}`, 400);
    }

    try {
        // Se validou, chama o serviço
        const session = await CashierService.closeSession(req.restaurantId, result.data);
        console.log('[CASHIER_CONTROLLER] Fechamento realizado com sucesso:', session.id);
        res.json(session);
    } catch (error) {
        console.error('[CASHIER_CONTROLLER] Erro no CashierService.closeSession:', error);
        throw error;
    }
  });

  // GET /api/cashier/summary
  getSummary = asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    const session = await prisma.cashierSession.findFirst({
      where: { restaurantId, status: 'OPEN' }
    });

    if (!session) {
      res.status(404);
      throw new AppError("Nenhum caixa aberto.", 404);
    }

    const restaurantPaymentMethods = await prisma.paymentMethod.findMany({
        where: { restaurantId, isActive: true }
    });

    const transactions = await prisma.financialTransaction.findMany({
      where: { cashierId: session.id, status: { not: 'CANCELED' } },
      orderBy: { createdAt: 'desc' }
    });

    const salesTransactions = transactions.filter(t => 
      t.type === 'INCOME' && !t.description.includes('[REFORÇO]') && !t.description.includes('[SANGRIA]')
    );

    const normalize = (str) => {
      if (!str) return '';
      return str.toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .trim();
    };

    const salesByMethod = salesTransactions.reduce((acc, curr) => {
      const rawMethod = normalize(curr.paymentMethod || 'other');
      
      const matchedMethod = restaurantPaymentMethods.find(m => {
        const normName = normalize(m.name);
        const normType = normalize(m.type);
        return normName === rawMethod || normType === rawMethod;
      });

      const key = matchedMethod ? normalize(matchedMethod.name) : rawMethod;
      acc[key] = (acc[key] || 0) + curr.amount;
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
    const result = CashierTransactionSchema.safeParse(req.body);
    if (!result.success) {
        throw new AppError("Dados de movimentação inválidos.", 400);
    }
    const { amount, type, description } = result.data;
    
    const session = await prisma.cashierSession.findFirst({
      where: { restaurantId: req.restaurantId, status: 'OPEN' }
    });

    if (!session) throw new AppError("Nenhum caixa aberto.", 400);

    const categoryName = type === 'INCOME' ? 'Reforço de Caixa' : 'Sangria de Caixa';
    let category = await prisma.transactionCategory.findFirst({
        where: { restaurantId: req.restaurantId, name: categoryName }
    });

    if (!category) {
        category = await prisma.transactionCategory.create({
            data: {
                name: categoryName,
                type: type,
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
        description: type === 'INCOME' ? `[REFORÇO] ${description}` : `[SANGRIA] ${description}`,
        amount: amount,
        type: type,
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

    if (!session) throw new AppError("Nenhum caixa aberto.", 404);

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

  // GET /api/cashier/pending-settlements
  getPendingSettlements = asyncHandler(async (req, res) => {
    const settlements = await CashierService.getPendingSettlements(req.restaurantId);
    res.json(settlements);
  });
}

module.exports = new CashierController();