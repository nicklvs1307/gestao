const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const CashierService = require('../services/CashierService');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');
const { CloseCashierSchema, OpenCashierSchema, CashierTransactionSchema } = require('../schemas/cashierSchema');
const CASHIER_CONSTANTS = require('../constants/cashier');

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
    logger.info('[CASHIER_CONTROLLER] Iniciando fechamento:', req.body);
    
    // Validação Manual e Segura
    const result = CloseCashierSchema.safeParse(req.body);
    
    if (!result.success) {
        logger.error('[CASHIER_CONTROLLER] Erro de Validação Zod:', result.error.format());
        const errorMsg = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(' | ');
        throw new AppError(`Erro nos dados enviados: ${errorMsg}`, 400);
    }

    try {
        // Se validou, chama o serviço
        const session = await CashierService.closeSession(req.restaurantId, result.data);
        logger.info('[CASHIER_CONTROLLER] Fechamento realizado com sucesso:', session.id);
        res.json(session);
    } catch (error) {
        logger.error('[CASHIER_CONTROLLER] Erro no CashierService.closeSession:', error);
        throw error;
    }
  });

  // GET /api/cashier/summary
  getSummary = asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    const session = await prisma.cashierSession.findFirst({
      where: { restaurantId, status: CASHIER_CONSTANTS.STATUS.OPEN }
    });

    if (!session) {
      res.status(404);
      throw new AppError("Nenhum caixa aberto.", 404);
    }

    const restaurantPaymentMethods = await prisma.paymentMethod.findMany({
        where: { restaurantId, isActive: true }
    });

    const transactions = await prisma.financialTransaction.findMany({
      where: { 
        cashierId: session.id, 
        status: 'PAID',
        // Excluir transações de pedidos cancelados
        order: { status: { not: 'CANCELED' } }
      },
      include: { 
        order: { 
          select: { 
            id: true, 
            status: true, 
            dailyOrderNumber: true, 
            total: true,
            createdAt: true 
          } 
        } 
      },
      orderBy: { createdAt: 'desc' }
    });

    const salesTransactions = transactions.filter(t => 
      t.type === 'INCOME' && 
      !t.description.includes(CASHIER_CONSTANTS.TRANSACTION_PREFIXES.REFORCO) && 
      !t.description.includes(CASHIER_CONSTANTS.TRANSACTION_PREFIXES.SANGRIA) &&
      !t.description.includes('ENTRADA ACERTO') // Exclui entradas de acerto de entregadores
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
      if (t.description.includes(CASHIER_CONSTANTS.TRANSACTION_PREFIXES.SANGRIA)) acc.sangria += t.amount;
      if (t.description.includes(CASHIER_CONSTANTS.TRANSACTION_PREFIXES.REFORCO)) acc.reforco += t.amount;
      return acc;
    }, { sangria: 0, reforco: 0 });

    const totalSales = Object.values(salesByMethod).reduce((a, b) => a + b, 0);

    // Breakdown por forma de pagamento com detalhes dos pedidos
    const breakdownByMethod = {};
    salesTransactions.forEach(t => {
      const rawMethod = normalize(t.paymentMethod || 'other');
      const matchedMethod = restaurantPaymentMethods.find(m => {
        const normName = normalize(m.name);
        const normType = normalize(m.type);
        return normName === rawMethod || normType === rawMethod;
      });
      const key = matchedMethod ? normalize(matchedMethod.name) : rawMethod;
      
      if (!breakdownByMethod[key]) {
        breakdownByMethod[key] = {
          total: 0,
          transactions: []
        };
      }
      
      breakdownByMethod[key].total += t.amount;
      breakdownByMethod[key].transactions.push({
        id: t.id,
        amount: t.amount,
        orderId: t.order?.id,
        orderNumber: t.order?.dailyOrderNumber,
        orderTotal: t.order?.total,
        description: t.description,
        createdAt: t.createdAt
      });
    });

    res.json({
      sessionId: session.id,
      openedAt: session.openedAt,
      initialAmount: session.initialAmount,
      totalSales,
      salesByMethod,
      breakdownByMethod,
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
      where: { restaurantId: req.restaurantId, status: CASHIER_CONSTANTS.STATUS.OPEN }
    });

    if (!session) throw new AppError("Nenhum caixa aberto.", 400);

    const categoryName = type === 'INCOME' ? CASHIER_CONSTANTS.CATEGORIES.REFORCO : CASHIER_CONSTANTS.CATEGORIES.SANGRIA;
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
        description: type === 'INCOME' ? `${CASHIER_CONSTANTS.TRANSACTION_PREFIXES.REFORCO} ${description}` : `${CASHIER_CONSTANTS.TRANSACTION_PREFIXES.SANGRIA} ${description}`,
        amount: amount,
        type: type,
        status: 'PAID',
        dueDate: new Date(),
        paymentDate: new Date(),
        paymentMethod: CASHIER_CONSTANTS.METHODS.CASH
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

  // GET /api/cashier/:sessionId/closing
  getClosing = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const restaurantId = req.restaurantId;

    const session = await prisma.cashierSession.findFirst({
      where: { id: sessionId, restaurantId }
    });

    if (!session) {
      throw new AppError("Sessão de caixa não encontrada.", 404);
    }

    const restaurantPaymentMethods = await prisma.paymentMethod.findMany({
      where: { restaurantId, isActive: true }
    });

    const transactions = await prisma.financialTransaction.findMany({
      where: { 
        cashierId: session.id, 
        status: 'PAID'
      },
      include: { 
        order: { 
          select: { 
            id: true, 
            status: true, 
            dailyOrderNumber: true, 
            total: true,
            createdAt: true,
            items: {
              include: {
                product: { select: { name: true } }
              }
            }
          } 
        } 
      },
      orderBy: { createdAt: 'desc' }
    });

    const normalize = (str) => {
      if (!str) return '';
      return str.toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .trim();
    };

    const salesTransactions = transactions.filter(t => 
      t.type === 'INCOME' && 
      !t.description.includes(CASHIER_CONSTANTS.TRANSACTION_PREFIXES.REFORCO) && 
      !t.description.includes(CASHIER_CONSTANTS.TRANSACTION_PREFIXES.SANGRIA) &&
      !t.description.includes('ENTRADA ACERTO')
    );

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

    const totalSales = Object.values(salesByMethod).reduce((a, b) => a + b, 0);

    const adjustments = transactions.reduce((acc, t) => {
      if (t.description.includes(CASHIER_CONSTANTS.TRANSACTION_PREFIXES.SANGRIA)) acc.sangria += t.amount;
      if (t.description.includes(CASHIER_CONSTANTS.TRANSACTION_PREFIXES.REFORCO)) acc.reforco += t.amount;
      return acc;
    }, { sangria: 0, reforco: 0 });

    const expectedAmount = session.initialAmount + totalSales + adjustments.reforco - adjustments.sangria;

    res.json({
      sessionId: session.id,
      status: session.status,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      initialAmount: session.initialAmount,
      finalAmount: session.finalAmount,
      expectedAmount,
      difference: session.difference,
      notes: session.notes,
      closingDetails: session.closingDetails,
      cashLeftover: session.cashLeftover,
      safeEntryAmount: session.safeEntryAmount,
      totalSales,
      salesByMethod,
      adjustments,
      transactions: transactions.map(t => ({
        id: t.id,
        amount: t.amount,
        type: t.type,
        paymentMethod: t.paymentMethod,
        description: t.description,
        orderId: t.order?.id,
        orderNumber: t.order?.dailyOrderNumber,
        createdAt: t.createdAt
      })),
      salesTransactions: salesTransactions.map(t => ({
        id: t.id,
        amount: t.amount,
        paymentMethod: t.paymentMethod,
        orderId: t.order?.id,
        orderNumber: t.order?.dailyOrderNumber,
        orderTotal: t.order?.total,
        createdAt: t.createdAt
      })),
      availableMethods: restaurantPaymentMethods
    });
  });

  // GET /api/cashier/orders
  getSessionOrders = asyncHandler(async (req, res) => {
    const session = await prisma.cashierSession.findFirst({
      where: { restaurantId: req.restaurantId, status: CASHIER_CONSTANTS.STATUS.OPEN }
    });

    if (!session) throw new AppError("Nenhum caixa aberto.", 404);

    const orders = await this.getOrdersBySessionId(req.restaurantId, session.id);
    res.json(orders);
  });

  // GET /api/cashier/:sessionId/orders - buscar pedidos de sessão específica (aberta ou fechada)
  getSessionOrdersById = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const restaurantId = req.restaurantId;

    const session = await prisma.cashierSession.findFirst({
      where: { id: sessionId, restaurantId }
    });

    if (!session) throw new AppError("Sessão de caixa não encontrada.", 404);

    const orders = await this.getOrdersBySessionId(restaurantId, session.id);
    res.json(orders);
  });

  getOrdersBySessionId = async (restaurantId, sessionId) => {
    return await prisma.order.findMany({
      where: { 
        restaurantId,
        OR: [
          { financialTransaction: { some: { cashierId: sessionId } } },
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
  };

  // GET /api/cashier/pending-settlements
  getPendingSettlements = asyncHandler(async (req, res) => {
    const settlements = await CashierService.getPendingSettlements(req.restaurantId);
    res.json(settlements);
  });
}

module.exports = new CashierController();