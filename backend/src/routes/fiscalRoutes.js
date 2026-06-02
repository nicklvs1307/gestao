const express = require('express');
const router = express.Router();
const FiscalController = require('../controllers/FiscalController');
const FiscalQueueController = require('../controllers/FiscalQueueController');
const { needsAuth } = require('../middlewares/auth');
const { checkModuleEnabled } = require('../middlewares/moduleGate');
const multer = require('multer');

router.use(needsAuth);
router.use(checkModuleEnabled('fiscal'));

// Configuração
router.get('/config', FiscalController.getFiscalConfig);
router.post('/config', FiscalController.saveFiscalConfig);
router.post('/config/certificate', multer().single('certificate'), FiscalController.uploadCertificate);
router.get('/config/status', FiscalController.getCertificateStatus);

// Notas Fiscais
router.get('/invoices', FiscalController.getInvoices);
router.get('/invoices/:id', FiscalController.getInvoiceById);
router.post('/invoices/emit', FiscalController.emitInvoice);
router.post('/invoices/cancel', FiscalController.cancelInvoice);
router.post('/invoices/inutilize', FiscalController.inutilizeInvoice);
router.post('/invoices/carta-correcao', FiscalController.sendCartaCorrecao);

// Legacy routes (mantidas para compatibilidade)
router.post('/emit', FiscalController.emitInvoice);
router.post('/cancel', FiscalController.cancelInvoice);

// Consultas e Relatórios
router.get('/consult/:recibo', FiscalController.consultReceipt);
router.get('/invoices/export/:month/:year', FiscalController.exportMonthlyXmls);
router.get('/reports/monthly', FiscalController.getMonthlyReport);
router.get('/invoices/:id/pdf', FiscalController.generatePdf);

// Utilidades
router.get('/validate-cnpj/:cnpj', FiscalController.validateCnpj);
router.get('/cep/:cep', FiscalController.searchCep);
router.get('/rate-limit/status', FiscalController.getRateLimitStatus);

// Fila de Retry
router.get('/queue/status', FiscalQueueController.getQueueStatus);
router.post('/queue/retry', FiscalQueueController.retryManually);

module.exports = router;