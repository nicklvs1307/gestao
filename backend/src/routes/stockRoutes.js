const express = require('express');
const router = express.Router();
const StockController = require('../controllers/StockController');
const StockLossController = require('../controllers/StockLossController');
const { needsAuth, checkPermission } = require('../middlewares/auth');
const { checkModuleEnabled } = require('../middlewares/moduleGate');

router.use(needsAuth);
router.use(checkModuleEnabled('stock'));
router.use(checkPermission('stock:manage'));

// Stock Entries
router.get('/entries', StockController.getEntries);
router.post('/entries', StockController.createEntry);
router.put('/entries/:id/confirm', StockController.confirmEntry);
router.delete('/entries/:id', StockController.deleteEntry);
router.post('/audit', StockController.auditInventory); // Nova rota de balanço

// Stock Losses
router.get('/losses', StockLossController.getAll);
router.post('/losses', StockLossController.create);

module.exports = router;
