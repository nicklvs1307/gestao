const prisma = require('../lib/prisma');
const TableService = require('../services/TableService');
const asyncHandler = require('../middlewares/asyncHandler');
const { CreateTableSchema, TableCheckoutSchema, PartialPaymentSchema, TableRequestSchema } = require('../schemas/tableSchema');

class TableController {

  // GET /api/tables
  getTables = asyncHandler(async (req, res) => {
    const tables = await prisma.table.findMany({ 
        where: { restaurantId: req.restaurantId }, 
        orderBy: { number: 'asc' } 
    });
    res.json(tables);
  });

  // POST /api/tables
  createTable = asyncHandler(async (req, res) => {
    const validatedData = CreateTableSchema.parse(req.body);
    const table = await prisma.table.create({ 
        data: { ...validatedData, restaurantId: req.restaurantId } 
    });
    res.status(201).json(table);
  });

  // GET /api/tables/summary (PDV)
  getPosTablesSummary = asyncHandler(async (req, res) => {
    const summary = await TableService.getTablesSummary(req.restaurantId);
    res.json(summary);
  });

  // POST /api/tables/:tableId/checkout
  checkoutTable = asyncHandler(async (req, res) => {
    const { tableId } = req.params;
    const validatedData = TableCheckoutSchema.parse(req.body);

    const result = await TableService.checkout(tableId, req.restaurantId, validatedData);

    // Emissão Fiscal Automática (Background)
    this._triggerFiscalEmission(req.restaurantId, result.orders).catch(err => 
        console.error("[FISCAL] Checkout Error:", err.message)
    );

    res.json({ success: true });
  });

  // POST /api/tables/:tableId/partial-payment
  partialItemPayment = asyncHandler(async (req, res) => {
    const { tableId } = req.params;
    const validatedData = PartialPaymentSchema.parse(req.body);

    if (!validatedData.itemIds) {
        res.status(400);
        throw new Error("itemIds são obrigatórios para pagamento parcial de itens.");
    }

    await TableService.processPartialItemPayment(tableId, req.restaurantId, validatedData);
    res.json({ success: true });
  });

  // POST /api/tables/:tableId/partial-value-payment
  partialValuePayment = asyncHandler(async (req, res) => {
    const { tableId } = req.params;
    const { orderId, payments } = req.body; // TODO: Validar com Schema se necessário

    // Lógica simples mantida aqui ou movida para service se crescer
    await prisma.$transaction(async (tx) => {
        const table = await tx.table.findUnique({ where: { id: tableId } });
        const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);

        for (const p of payments) {
            await tx.payment.create({
                data: { orderId, amount: p.amount, method: p.method }
            });
        }

        const openSession = await tx.cashierSession.findFirst({
            where: { restaurantId: req.restaurantId, status: 'OPEN' }
        });

        if (openSession) {
            await tx.financialTransaction.create({
                data: {
                    description: `Pagto Parcial Mesa ${table.number} (Valor Avulso)`,
                    amount: totalPaid,
                    type: 'INCOME',
                    status: 'PAID',
                    dueDate: new Date(),
                    paymentDate: new Date(),
                    paymentMethod: payments[0]?.method || 'other',
                    restaurantId: req.restaurantId,
                    orderId,
                    cashierId: openSession.id
                }
            });
        }
    });

    res.json({ success: true });
  });

  // GET /api/tables/requests/pending
  getTableRequests = asyncHandler(async (req, res) => {
    const requests = await prisma.tableRequest.findMany({ 
        where: { restaurantId: req.restaurantId, status: 'PENDING' } 
    });
    res.json(requests);
  });

  // PUT /api/tables/requests/:id/resolve
  resolveTableRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { restaurantId } = req;
    
    const request = await prisma.tableRequest.findFirst({ where: { id, restaurantId } });
    if (!request) {
        res.status(404);
        throw new Error('Chamado não encontrado.');
    }

    const updated = await prisma.tableRequest.update({ 
        where: { id }, data: { status: 'DONE' } 
    });
    res.json({ success: true, updated });
  });

  // GET /api/client/table-info
  checkTableExists = asyncHandler(async (req, res) => {
    const { restaurantId, tableNumber } = req.query;
    if (!restaurantId || !tableNumber) {
        res.status(400);
        throw new Error("Dados incompletos");
    }

    const table = await prisma.table.findFirst({
        where: { restaurantId, number: parseInt(tableNumber) }
    });

    res.json({ exists: !!table, table });
  });

  // GET /api/client/order/table
  getClientTableOrder = asyncHandler(async (req, res) => {
    const { restaurantId, tableNumber } = req.query;
    if (!restaurantId || !tableNumber) {
        res.status(400);
        throw new Error("Dados incompletos");
    }

    const order = await prisma.order.findFirst({
        where: {
            restaurantId,
            tableNumber: parseInt(tableNumber),
            status: { notIn: ['COMPLETED', 'CANCELED'] }
        },
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' }
    });

    res.json(order || null);
  });

  // POST /api/client/table-requests
  createClientTableRequest = asyncHandler(async (req, res) => {
    const validatedData = TableRequestSchema.parse(req.body);
    
    const newRequest = await prisma.tableRequest.create({ 
        data: { 
            restaurantId: validatedData.restaurantId,
            tableNumber: validatedData.tableNumber,
            type: validatedData.type,
            status: 'PENDING'
        } 
    });
    res.status(201).json(newRequest); 
  });

  // Helper privado para emissão fiscal
  async _triggerFiscalEmission(restaurantId, orders) {
    const fiscalConfig = await prisma.restaurantFiscalConfig.findUnique({ where: { restaurantId } });
    if (fiscalConfig?.emissionMode === 'AUTOMATIC') {
        const FiscalService = require('../services/FiscalService');
        for (const order of orders) {
            await FiscalService.autorizarNfce(order, fiscalConfig, order.items);
        }
    }
  }
}

module.exports = new TableController();