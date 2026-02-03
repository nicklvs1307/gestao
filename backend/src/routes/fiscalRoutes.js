const express = require('express');
const router = express.Router();
const FiscalController = require('../controllers/FiscalController');
const { needsAuth } = require('../middlewares/auth');
const multer = require('multer');

router.get('/config', needsAuth, FiscalController.getFiscalConfig);
router.post('/config', needsAuth, FiscalController.saveFiscalConfig);
router.post('/config/certificate', needsAuth, multer().single('certificate'), FiscalController.uploadCertificate);
router.get('/invoices', needsAuth, FiscalController.getInvoices);
router.post('/emit', needsAuth, FiscalController.emitInvoice);

module.exports = router;
