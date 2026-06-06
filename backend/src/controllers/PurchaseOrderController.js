const prisma = require('../lib/prisma');
const asyncHandler = require('../middlewares/asyncHandler');

class PurchaseOrderController {
    
    // GET /api/stock/purchase-orders
    getAll = asyncHandler(async (req, res) => {
        const { status, supplierId, page = 1, limit = 50 } = req.query;
        const restaurantId = req.restaurantId;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = { restaurantId };
        if (status) where.status = status;
        if (supplierId) where.supplierId = supplierId;

        const [orders, total] = await Promise.all([
            prisma.purchaseOrder.findMany({
                where,
                include: {
                    supplier: { select: { name: true } },
                    items: { include: { ingredient: { select: { name: true, unit: true } } } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.purchaseOrder.count({ where })
        ]);

        res.json({
            data: orders,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) }
        });
    });

    // GET /api/stock/purchase-orders/:id
    getById = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const order = await prisma.purchaseOrder.findFirst({
            where: { id, restaurantId: req.restaurantId },
            include: {
                supplier: true,
                items: { include: { ingredient: true } }
            }
        });

        if (!order) {
            res.status(404);
            throw new Error('Ordem de compra não encontrada.');
        }

        res.json(order);
    });

    // POST /api/stock/purchase-orders
    create = asyncHandler(async (req, res) => {
        const { supplierId, expectedDate, notes, items } = req.body;

        if (!items || items.length === 0) {
            res.status(400);
            throw new Error('Adicione pelo menos 1 item.');
        }

        const totalAmount = items.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);

        const order = await prisma.purchaseOrder.create({
            data: {
                restaurantId: req.restaurantId,
                supplierId,
                expectedDate: expectedDate ? new Date(expectedDate) : null,
                notes,
                totalAmount,
                status: 'DRAFT',
                items: {
                    create: items.map(item => ({
                        ingredientId: item.ingredientId,
                        quantity: item.quantity,
                        unitCost: item.unitCost
                    }))
                }
            },
            include: { items: true }
        });

        res.status(201).json(order);
    });

    // PUT /api/stock/purchase-orders/:id
    update = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { supplierId, expectedDate, notes, items } = req.body;

        const existing = await prisma.purchaseOrder.findFirst({
            where: { id, restaurantId: req.restaurantId }
        });

        if (!existing) {
            res.status(404);
            throw new Error('Ordem de compra não encontrada.');
        }

        if (existing.status !== 'DRAFT') {
            res.status(400);
            throw new Error('Só é possível editar ordens em rascunho (DRAFT).');
        }

        const totalAmount = items ? items.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0) : existing.totalAmount;

        const order = await prisma.$transaction(async (tx) => {
            // Deletar itens antigos e recriar
            if (items) {
                await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
            }

            return await tx.purchaseOrder.update({
                where: { id },
                data: {
                    supplierId,
                    expectedDate: expectedDate ? new Date(expectedDate) : null,
                    notes,
                    totalAmount,
                    items: items ? {
                        create: items.map(item => ({
                            ingredientId: item.ingredientId,
                            quantity: item.quantity,
                            unitCost: item.unitCost
                        }))
                    } : undefined
                },
                include: { items: true }
            });
        });

        res.json(order);
    });

    // DELETE /api/stock/purchase-orders/:id
    delete = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const existing = await prisma.purchaseOrder.findFirst({
            where: { id, restaurantId: req.restaurantId }
        });

        if (!existing) {
            res.status(404);
            throw new Error('Ordem de compra não encontrada.');
        }

        if (existing.status !== 'DRAFT') {
            res.status(400);
            throw new Error('Só é possível excluir ordens em rascunho (DRAFT).');
        }

        await prisma.purchaseOrder.delete({ where: { id } });
        res.status(204).send();
    });

    // PUT /api/stock/purchase-orders/:id/send
    send = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const order = await prisma.purchaseOrder.findFirst({
            where: { id, restaurantId: req.restaurantId }
        });

        if (!order) {
            res.status(404);
            throw new Error('Ordem de compra não encontrada.');
        }

        if (order.status !== 'DRAFT') {
            res.status(400);
            throw new Error('Só é possível enviar ordens em rascunho.');
        }

        const updated = await prisma.purchaseOrder.update({
            where: { id },
            data: { status: 'SENT' }
        });

        res.json(updated);
    });

    // PUT /api/stock/purchase-orders/:id/receive
    receive = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { items } = req.body; // [{ itemId, receivedQty }]

        const order = await prisma.purchaseOrder.findFirst({
            where: { id, restaurantId: req.restaurantId },
            include: { items: true }
        });

        if (!order) {
            res.status(404);
            throw new Error('Ordem de compra não encontrada.');
        }

        if (!['SENT', 'PARTIAL'].includes(order.status)) {
            res.status(400);
            throw new Error('Só é possível receber ordens enviadas ou parcialmente recebidas.');
        }

        const updatedOrder = await prisma.$transaction(async (tx) => {
            // Atualizar receivedQty de cada item
            for (const item of items) {
                await tx.purchaseOrderItem.update({
                    where: { id: item.itemId },
                    data: { receivedQty: item.receivedQty }
                });
            }

            // Recalcular status
            const updatedItems = await tx.purchaseOrderItem.findMany({
                where: { purchaseOrderId: id }
            });

            const allReceived = updatedItems.every(i => i.receivedQty >= i.quantity);
            const someReceived = updatedItems.some(i => i.receivedQty > 0);
            const newStatus = allReceived ? 'RECEIVED' : (someReceived ? 'PARTIAL' : order.status);

            return await tx.purchaseOrder.update({
                where: { id },
                data: { status: newStatus },
                include: { items: { include: { ingredient: true } } }
            });
        });

        res.json(updatedOrder);
    });

    // PUT /api/stock/purchase-orders/:id/cancel
    cancel = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const order = await prisma.purchaseOrder.findFirst({
            where: { id, restaurantId: req.restaurantId }
        });

        if (!order) {
            res.status(404);
            throw new Error('Ordem de compra não encontrada.');
        }

        if (order.status === 'RECEIVED') {
            res.status(400);
            throw new Error('Não é possível cancelar uma ordem já recebida.');
        }

        const updated = await prisma.purchaseOrder.update({
            where: { id },
            data: { status: 'CANCELED' }
        });

        res.json(updated);
    });
}

module.exports = new PurchaseOrderController();
