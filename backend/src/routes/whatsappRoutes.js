const express = require('express');
const router = express.Router();
const WhatsAppController = require('../controllers/WhatsAppController');
const { authenticateToken } = require('../middlewares/auth');

// Rotas protegidas (Painel Admin)
router.post('/connect', authenticateToken, WhatsAppController.connect);
router.get('/qrcode', authenticateToken, WhatsAppController.getQrCode);
router.get('/status', authenticateToken, WhatsAppController.status);
router.get('/settings', authenticateToken, WhatsAppController.getSettings);
router.put('/settings', authenticateToken, WhatsAppController.updateSettings);

// Rota pública (Webhook da Evolution API)
router.post('/webhook', WhatsAppController.webhook);

module.exports = router;
