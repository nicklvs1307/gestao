const express = require('express');
const router = express.Router();
const CashierController = require('../controllers/CashierController');
const { needsAuth } = require('../middlewares/auth');

router.get('/status', needsAuth, CashierController.getStatus);
router.get('/summary', needsAuth, CashierController.getSummary);
router.get('/history', needsAuth, CashierController.getHistory);
router.get('/:sessionId/closing', needsAuth, CashierController.getClosing);
router.get('/orders', needsAuth, CashierController.getSessionOrders);
router.get('/pending-settlements', needsAuth, CashierController.getPendingSettlements);

// Validação agora é feita dentro do controller para maior robustez
router.post('/open', needsAuth, CashierController.open);
router.post('/close', needsAuth, CashierController.close);
router.post('/transaction', needsAuth, CashierController.addTransaction);

module.exports = router;