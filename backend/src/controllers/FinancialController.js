const prisma = require('../lib/prisma');
const FinancialService = require('../services/FinancialService');
const asyncHandler = require('../middlewares/asyncHandler');
const { CreateTransactionSchema, TransferSchema, SupplierSchema } = require('../schemas/FinancialSchema');

class FinancialController {

  // === SUPPLIERS ===

  getSuppliers = asyncHandler(async (req, res) => {
    const suppliers = await prisma.supplier.findMany({
      where: { restaurantId: req.restaurantId },
      orderBy: { name: 'asc' }
    });
    res.json(suppliers);
  });

  createSupplier = asyncHandler(async (req, res) => {
    const validatedData = SupplierSchema.parse(req.body);
    const supplier = await prisma.supplier.create({
      data: {
        ...validatedData,
        restaurant: { connect: { id: req.restaurantId } }
      }
    });
    res.status(201).json(supplier);
  });

  updateSupplier = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const validatedData = SupplierSchema.parse(req.body);
    const supplier = await prisma.supplier.update({
      where: { id },
      data: validatedData
    });
    res.json(supplier);
  });

  deleteSupplier = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.supplier.delete({ where: { id } });
    res.status(204).send();
  });

  // === CATEGORIES ===

  getCategories = asyncHandler(async (req, res) => {
    const categories = await prisma.transactionCategory.findMany({
      where: { restaurantId: req.restaurantId },
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  });

  createCategory = asyncHandler(async (req, res) => {
    const { name, type } = req.body;
    const category = await prisma.transactionCategory.create({
      data: { name, type, restaurant: { connect: { id: req.restaurantId } } }
    });
    res.status(201).json(category);
  });

  // === TRANSACTIONS ===

  getTransactions = asyncHandler(async (req, res) => {
    const { startDate, endDate, status, type } = req.query;
    const where = { restaurantId: req.restaurantId };
    
    if (startDate && endDate) {
      where.dueDate = { gte: new Date(startDate), lte: new Date(endDate) };
    }
    
    if (status) where.status = status;
    if (type) where.type = type;

    const transactions = await prisma.financialTransaction.findMany({
      where,
      include: {
        category: true,
        supplier: true,
        order: { include: { invoice: true } }
      },
      orderBy: { dueDate: 'asc' }
    });
    
    const summary = transactions.reduce((acc, t) => {
        if (t.type === 'INCOME') acc.totalIncome += t.amount;
        if (t.type === 'EXPENSE') acc.totalExpense += t.amount;
        return acc;
    }, { totalIncome: 0, totalExpense: 0 });

    res.json({ transactions, summary });
  });

  createTransaction = asyncHandler(async (req, res) => {
    const validatedData = CreateTransactionSchema.parse(req.body);
    const transaction = await FinancialService.createTransaction(req.restaurantId, validatedData);
    res.status(201).json(transaction);
  });

  updateTransaction = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const validatedData = CreateTransactionSchema.parse(req.body);
    const transaction = await FinancialService.updateTransaction(id, validatedData);
    res.json(transaction);
  });

  deleteTransaction = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.$transaction(async (tx) => {
      const t = await tx.financialTransaction.findUnique({ where: { id } });
      if (t && t.status === 'PAID' && t.bankAccountId) {
        const reverseAdjustment = t.type === 'INCOME' ? -t.amount : t.amount;
        await tx.bankAccount.update({
          where: { id: t.bankAccountId },
          data: { balance: { increment: reverseAdjustment } }
        });
      }
      await tx.financialTransaction.delete({ where: { id } });
    });
    res.status(204).send();
  });

  createTransfer = asyncHandler(async (req, res) => {
    const validatedData = TransferSchema.parse(req.body);
    const result = await FinancialService.createTransfer(req.restaurantId, validatedData);
    res.status(201).json(result);
  });

  // Mantido aqui para simplicidade, mas delegando a lógica para o Service se necessário no futuro
  syncRecurring = asyncHandler(async (req, res) => {
    // Logica de sync mantida conforme original, mas agora sob asyncHandler
    const restaurantId = req.restaurantId;
    const activeRecurring = await prisma.financialTransaction.findMany({
        where: {
            restaurantId,
            isRecurring: true,
            parentTransactionId: null,
            OR: [{ recurrenceEndDate: null }, { recurrenceEndDate: { gte: new Date() } }]
        },
        include: { childTransactions: { orderBy: { dueDate: 'desc' }, take: 1 } }
    });

    const generated = [];
    const limitDate = new Date(); limitDate.setDate(limitDate.getDate() + 45);

    for (const t of activeRecurring) {
        let lastDate = t.childTransactions.length > 0 ? t.childTransactions[0].dueDate : t.dueDate;
        let nextDate = new Date(lastDate);
        let safety = 0;

        while (nextDate < limitDate && safety < 12) {
            if (t.recurrenceFrequency === 'WEEKLY') nextDate.setDate(nextDate.getDate() + 7);
            else if (t.recurrenceFrequency === 'MONTHLY') nextDate.setMonth(nextDate.getMonth() + 1);
            else if (t.recurrenceFrequency === 'YEARLY') nextDate.setFullYear(nextDate.getFullYear() + 1);
            else break;

            if (t.recurrenceEndDate && nextDate > t.recurrenceEndDate) break;

            if (nextDate <= limitDate && nextDate > lastDate) {
                 const newTrans = await prisma.financialTransaction.create({
                     data: {
                         description: t.description, amount: t.amount, type: t.type, status: 'PENDING',
                         dueDate: new Date(nextDate), restaurantId: t.restaurantId,
                         categoryId: t.categoryId, supplierId: t.supplierId, bankAccountId: t.bankAccountId,
                         isRecurring: false, parentTransactionId: t.id
                     }
                 });
                 generated.push(newTrans);
                 lastDate = new Date(nextDate);
            } else if (nextDate > limitDate) break;
            safety++;
        }
    }
    res.json({ generatedCount: generated.length, generated });
  });
}

module.exports = new FinancialController();