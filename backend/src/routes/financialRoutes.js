const express = require('express');
const router = express.Router();
const FinancialController = require('../controllers/FinancialController');
const BankAccountController = require('../controllers/BankAccountController');
const { needsAuth, checkPermission } = require('../middlewares/auth');

// Proteção global do módulo para quem tem pelo menos visualização
router.use(needsAuth);
router.use(checkPermission('financial:view'));

// Suppliers
router.get('/suppliers', FinancialController.getSuppliers);
router.post('/suppliers', checkPermission('financial:manage'), FinancialController.createSupplier);
router.put('/suppliers/:id', checkPermission('financial:manage'), FinancialController.updateSupplier);
router.delete('/suppliers/:id', checkPermission('financial:manage'), FinancialController.deleteSupplier);

// Categories
router.get('/categories', FinancialController.getCategories);
router.post('/categories', checkPermission('financial:manage'), FinancialController.createCategory);

// Transactions
router.get('/transactions', FinancialController.getTransactions);
router.post('/transactions', checkPermission('financial:manage'), FinancialController.createTransaction);
router.post('/transactions/transfer', checkPermission('financial:manage'), FinancialController.createTransfer);
router.post('/transactions/sync-recurring', checkPermission('financial:manage'), FinancialController.syncRecurring);
router.put('/transactions/:id', checkPermission('financial:manage'), FinancialController.updateTransaction);
router.delete('/transactions/:id', checkPermission('financial:manage'), FinancialController.deleteTransaction);

// Bank Accounts
router.get('/bank-accounts', BankAccountController.index);
router.post('/bank-accounts', checkPermission('financial:manage'), BankAccountController.store);
router.put('/bank-accounts/:id', checkPermission('financial:manage'), BankAccountController.update);
router.delete('/bank-accounts/:id', checkPermission('financial:manage'), BankAccountController.delete);

module.exports = router;
