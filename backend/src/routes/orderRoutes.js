const express = require('express');
const logger = require('../config/logger');
const router = express.Router();
const OrderController = require('../controllers/OrderController');
const { needsAdmin, needsAuth, checkPermission } = require('../middlewares/auth');
const prisma = require('../lib/prisma');

// Admin / POS Orders
router.post('/', needsAuth, checkPermission('orders:manage'), OrderController.createDeliveryOrder);
router.post('/transfer-table', needsAuth, checkPermission('orders:manage'), OrderController.transferTable);
router.post('/transfer-items', needsAuth, checkPermission('orders:manage'), OrderController.transferItems);
router.delete('/:orderId/items/:itemId', needsAuth, checkPermission('orders:cancel'), OrderController.removeItem);

router.get('/', needsAuth, checkPermission('orders:view'), OrderController.getOrders);

// SSE endpoint for real-time order updates
router.get('/events', needsAuth, checkPermission('orders:view'), OrderController.streamOrderEvents);

router.get('/:orderId', needsAuth, checkPermission('orders:view'), async (req, res) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: req.params.orderId, restaurantId: req.restaurantId },
            include: {
                items: { include: { product: { include: { categories: true } } } },
                deliveryOrder: { include: { customer: true, driver: { select: { id: true, name: true } } } },
                user: { select: { name: true } },
                payments: true
            }
        });
        if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });
        res.json(order);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Erro ao buscar pedido.' });
    }
});

router.put('/:orderId/status', needsAuth, checkPermission('orders:manage'), OrderController.updateStatus);
router.post('/:orderId/items', needsAuth, checkPermission('orders:manage'), OrderController.addItemsToOrder);
router.post('/:orderId/payments', needsAuth, checkPermission('orders:manage'), OrderController.addPayment);
router.delete('/payments/:paymentId', needsAuth, checkPermission('orders:manage'), OrderController.removePayment);
router.patch('/:orderId/customer', needsAuth, checkPermission('orders:manage'), OrderController.updateCustomer);
router.patch('/:orderId/financials', needsAuth, checkPermission('orders:manage'), OrderController.updateFinancials);
router.patch('/:orderId/payment-method', needsAuth, checkPermission('orders:manage'), OrderController.updatePaymentMethod);
router.patch('/:orderId/delivery-type', needsAuth, checkPermission('orders:manage'), OrderController.updateDeliveryType);
router.patch('/:orderId/printed', needsAuth, checkPermission('orders:manage'), OrderController.markAsPrinted);

// KDS
router.get('/kds/items', needsAuth, checkPermission('orders:view'), OrderController.getKdsItems);
router.put('/kds/items/:itemId/finish', needsAuth, checkPermission('orders:manage'), OrderController.finishKdsItem);

// Drivers Settlement
router.get('/drivers/settlement', needsAuth, checkPermission('delivery:manage'), OrderController.getDriverSettlement);
router.post('/drivers/settlement/pay', needsAuth, checkPermission('delivery:manage'), OrderController.payDriverSettlement);

// Client Order Tracking (Pública, mas com validação simples de telefone para segurança)
router.get('/delivery/status/:id', async (req, res) => {
    try {
        const { phone } = req.query; // Exige ?phone=123...
        
        const order = await prisma.order.findUnique({
            where: { id: req.params.id },
            include: {
                items: { include: { product: { select: { name: true, imageUrl: true } } } },
                deliveryOrder: { 
                    select: { 
                        name: true, phone: true, address: true, 
                        deliveryType: true, deliveryFee: true, status: true,
                        driver: { select: { name: true } } 
                    } 
                }
            }
        });

        if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });

        // Se for um pedido de delivery e o telefone for informado, validamos
        if (order.orderType === 'DELIVERY' && order.deliveryOrder?.phone) {
            const cleanProvided = (phone || '').replace(/\D/g, '');
            const cleanOriginal = order.deliveryOrder.phone.replace(/\D/g, '');
            
            // Permite acesso se o telefone bater ou se o usuário for admin logado
            if (cleanProvided !== cleanOriginal && !req.user) {
                return res.status(403).json({ error: 'Acesso negado. Telefone não confere.' });
            }
        }

        res.json(order);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Erro ao buscar status do pedido.' });
    }
});

module.exports = router;