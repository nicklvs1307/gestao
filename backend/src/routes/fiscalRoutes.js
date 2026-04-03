const express = require('express');
const router = express.Router();
const FiscalController = require('../controllers/FiscalController');
const { needsAuth } = require('../middlewares/auth');
const { checkModuleEnabled } = require('../middlewares/moduleGate');
const multer = require('multer');

router.use(needsAuth);
router.use(checkModuleEnabled('fiscal'));

router.get('/config', FiscalController.getFiscalConfig);
router.post('/config', FiscalController.saveFiscalConfig);
router.post('/config/certificate', multer().single('certificate'), FiscalController.uploadCertificate);
router.get('/config/status', FiscalController.getCertificateStatus);
router.get('/invoices', FiscalController.getInvoices);
router.get('/invoices/:id', FiscalController.getInvoiceById);
router.post('/emit', FiscalController.emitInvoice);
router.post('/cancel', FiscalController.cancelInvoice);
router.get('/consult/:recibo', FiscalController.consultReceipt);
router.get('/export-monthly', FiscalController.exportMonthlyXmls);
router.get('/report-monthly', FiscalController.getMonthlyReport);
router.get('/pdf/:id', FiscalController.generatePdf);
router.get('/validate-cnpj/:cnpj', FiscalController.validateCnpj);
router.get('/search-cep/:cep', FiscalController.searchCep);

module.exports = router;