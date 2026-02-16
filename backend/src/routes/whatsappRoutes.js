const express = require('express');
const router = express.Router();
const WhatsAppController = require('../controllers/WhatsAppController');
const { protect } = require('../middlewares/auth');

// Rotas protegidas (Painel Admin)
router.post('/connect', protect, WhatsAppController.connect);
router.get('/qrcode', protect, WhatsAppController.getQrCode);
router.get('/status', protect, WhatsAppController.status);
router.get('/settings', protect, WhatsAppController.getSettings);
router.put('/settings', protect, WhatsAppController.updateSettings);

// Rota pública (Webhook da Evolution API)
// Nota: Em produção, você deve proteger isso com um token na URL ou IP Whitelist
router.post('/webhook', WhatsAppController.webhook);

module.exports = router;
