const express = require('express');
const router = express.Router();
const FiscalController = require('../controllers/FiscalController');
const { needsAuth } = require('../middlewares/auth');
const multer = require('multer');

router.get('/config', needsAuth, FiscalController.getFiscalConfig);
router.post('/config', needsAuth, FiscalController.saveFiscalConfig);
router.post('/config/certificate', needsAuth, multer().single('certificate'), FiscalController.uploadCertificate);
router.get('/config/status', needsAuth, FiscalController.getCertificateStatus);
router.get('/invoices', needsAuth, FiscalController.getInvoices);
router.get('/invoices/:id', needsAuth, FiscalController.getInvoiceById);
router.post('/emit', needsAuth, FiscalController.emitInvoice);
router.post('/cancel', needsAuth, FiscalController.cancelInvoice);
router.get('/consult/:recibo', needsAuth, FiscalController.consultReceipt);
router.get('/export-monthly', needsAuth, FiscalController.exportMonthlyXmls);
router.get('/report-monthly', needsAuth, FiscalController.getMonthlyReport);
router.get('/pdf/:id', needsAuth, FiscalController.generatePdf);
router.get('/validate-cnpj/:cnpj', needsAuth, FiscalController.validateCnpj);
router.get('/search-cep/:cep', FiscalController.searchCep);

module.exports = router;