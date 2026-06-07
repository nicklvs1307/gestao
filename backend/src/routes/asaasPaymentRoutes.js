const express = require('express');
const router = express.Router();
const AsaasPaymentController = require('../controllers/AsaasPaymentController');
const { needsAuth } = require('../middlewares/auth');

// Rotas autenticadas
router.use(needsAuth);

router.post('/asaas/pix/:orderId', AsaasPaymentController.generatePix);
router.get('/asaas/pix/:orderId/status', AsaasPaymentController.checkStatus);
router.post('/asaas/test-connection', AsaasPaymentController.testConnection);

module.exports = router;
