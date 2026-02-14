const express = require('express');
const router = express.Router();
const DriverController = require('../controllers/DriverController');
const { needsAuth, checkPermission } = require('../middlewares/auth');

// Rotas exclusivas para o App do Entregador
router.get('/orders', needsAuth, checkPermission('delivery:manage'), DriverController.getAvailableOrders);
router.get('/history', needsAuth, checkPermission('delivery:manage'), DriverController.getHistory);
router.patch('/orders/:orderId/status', needsAuth, checkPermission('delivery:manage'), DriverController.updateOrderStatus);
router.patch('/orders/:orderId/payment-method', needsAuth, checkPermission('delivery:manage'), DriverController.updatePaymentMethod);

module.exports = router;
