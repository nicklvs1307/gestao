const express = require('express');
const router = express.Router();
const TableController = require('../controllers/TableController');
const { needsAuth } = require('../middlewares/auth');

// Admin / POS
router.get('/', needsAuth, TableController.getTables);
router.post('/', needsAuth, TableController.createTable);
router.get('/summary', needsAuth, TableController.getPosTablesSummary);
router.post('/partial-payment-simple', needsAuth, TableController.partialPaymentSimple);
router.post('/:tableId/checkout', needsAuth, TableController.checkoutTable);
router.post('/:tableId/partial-payment', needsAuth, TableController.partialItemPayment);
router.post('/:tableId/partial-value-payment', needsAuth, TableController.partialValuePayment);

// Table Requests
router.get('/requests/pending', needsAuth, TableController.getTableRequests);
router.put('/requests/:id/resolve', needsAuth, TableController.resolveTableRequest);

// Client
router.get('/info', TableController.checkTableExists);
router.get('/order', TableController.getClientTableOrder);
router.post('/requests', TableController.createClientTableRequest);

module.exports = router;
