const express = require('express');
const router = express.Router();
const StockController = require('../controllers/StockController');
const StockLossController = require('../controllers/StockLossController');
const StockHistoryController = require('../controllers/StockHistoryController');
const ShoppingListController = require('../controllers/ShoppingListController');
const StockMoveController = require('../controllers/StockMoveController');
const { needsAuth, checkPermission } = require('../middlewares/auth');
const { checkModuleEnabled } = require('../middlewares/moduleGate');

router.use(needsAuth);
router.use(checkModuleEnabled('stock'));
router.use(checkPermission('stock:manage'));

// === Stock Entries (Notas de Entrada) ===
router.get('/entries', StockController.getEntries);
router.post('/entries', StockController.createEntry);
router.put('/entries/:id/confirm', StockController.confirmEntry);
router.delete('/entries/:id', StockController.deleteEntry);

// === Audit / Balanço ===
router.post('/audit', StockController.auditInventory);

// === Stock Losses (Perdas) ===
router.get('/losses', StockLossController.getAll);
router.post('/losses', StockLossController.create);

// === Stock History (Histórico de Posição) ===
router.get('/history', StockHistoryController.getHistory);

// === Shopping List (Lista de Compras) ===
router.get('/shopping-list', ShoppingListController.getShoppingList);
router.post('/shopping-list/export', ShoppingListController.exportCSV);

// === Stock Moves (Movimentações) ===
router.get('/moves', StockMoveController.getMoves);

module.exports = router;
