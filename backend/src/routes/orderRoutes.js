const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/OrderController');
const { needsAdmin, needsAuth, checkPermission } = require('../middlewares/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Admin / POS Orders
router.post('/', needsAuth, checkPermission('orders:manage'), OrderController.createDeliveryOrder);
router.post('/transfer-table', needsAuth, checkPermission('orders:manage'), OrderController.transferTable);
router.post('/transfer-items', needsAuth, checkPermission('orders:manage'), OrderController.transferItems);
router.delete('/:orderId/items/:itemId', needsAuth, checkPermission('orders:manage'), OrderController.removeItem);

router.get('/', needsAuth, checkPermission('orders:view'), async (req, res) => {
     try { 
        res.json(await prisma.order.findMany({ 
            where: { restaurantId: req.restaurantId }, 
            include: { 
                items: { include: { product: { include: { categories: true } } } },
                deliveryOrder: { include: { customer: true, driver: { select: { id: true, name: true } } } },
                user: { select: { name: true } }
            }, 
            orderBy: { createdAt: 'desc' } 
        })); 
    }
    catch (error) { 
        console.error("Erro ao buscar pedidos:", error);
        res.status(500).json({ error: 'Erro ao buscar pedidos.' }); 
    }
});

router.put('/:orderId/status', needsAuth, checkPermission('orders:manage'), OrderController.updateStatus);
router.patch('/:orderId/payment-method', needsAuth, checkPermission('orders:manage'), OrderController.updatePaymentMethod);
router.patch('/:orderId/delivery-type', needsAuth, checkPermission('orders:manage'), OrderController.updateDeliveryType);
router.patch('/:orderId/printed', needsAuth, checkPermission('orders:manage'), OrderController.markAsPrinted);

// KDS
router.get('/kds/items', needsAuth, checkPermission('orders:view'), OrderController.getKdsItems);
router.put('/kds/items/:itemId/finish', needsAuth, checkPermission('orders:manage'), OrderController.finishKdsItem);

// Drivers Settlement
router.get('/drivers/settlement', needsAuth, checkPermission('delivery:manage'), OrderController.getDriverSettlement);
router.post('/drivers/settlement/pay', needsAuth, checkPermission('delivery:manage'), OrderController.payDriverSettlement);

// Client Order Tracking
router.get('/delivery/status/:id', async (req, res) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: req.params.id },
            include: {
                items: { include: { product: true } },
                deliveryOrder: { include: { driver: { select: { name: true } } } }
            }
        });
        if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });
        res.json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar status do pedido.' });
    }
});

module.exports = router;