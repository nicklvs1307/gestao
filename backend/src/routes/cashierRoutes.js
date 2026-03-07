const express = require('express');
const router = express.Router();
const CashierController = require('../controllers/CashierController');
const { needsAuth } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { OpenCashierSchema, CloseCashierSchema, CashierTransactionSchema } = require('../schemas/cashierSchema');

router.get('/status', needsAuth, CashierController.getStatus);
router.get('/summary', needsAuth, CashierController.getSummary);
router.get('/history', needsAuth, CashierController.getHistory);
router.get('/orders', needsAuth, CashierController.getSessionOrders);

router.post('/open', needsAuth, validate(OpenCashierSchema), CashierController.open);
router.post('/close', needsAuth, validate(CloseCashierSchema), CashierController.close);
router.post('/transaction', needsAuth, validate(CashierTransactionSchema), CashierController.addTransaction);

module.exports = router;
