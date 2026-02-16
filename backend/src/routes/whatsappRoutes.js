const express = require('express');
const router = express.Router();
const WhatsAppController = require('../controllers/WhatsAppController');
const { needsAuth } = require('../middlewares/auth');

// Rotas protegidas (Painel Admin)
router.post('/connect', needsAuth, WhatsAppController.connect);
router.get('/qrcode', needsAuth, WhatsAppController.getQrCode);
router.get('/status', needsAuth, WhatsAppController.status);
router.get('/settings', needsAuth, WhatsAppController.getSettings);
router.put('/settings', needsAuth, WhatsAppController.updateSettings);

// Rota pública (Webhook da Evolution API)
router.post('/webhook', WhatsAppController.webhook);

module.exports = router;
