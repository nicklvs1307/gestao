const express = require('express');
const router = express.Router();
const DriverController = require('../controllers/DriverController');
const { needsAuth } = require('../middlewares/auth');

// Rotas exclusivas para o App do Entregador
router.get('/orders', needsAuth, DriverController.getAvailableOrders);
router.patch('/orders/:orderId/status', needsAuth, DriverController.updateOrderStatus);

module.exports = router;
