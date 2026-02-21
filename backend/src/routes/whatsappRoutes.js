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
router.post('/clear-history', needsAuth, WhatsAppController.clearHistory);

// Chat e Conversas em Tempo Real
router.get('/conversations', needsAuth, WhatsAppController.getConversations);
router.get('/conversations/:phone/messages', needsAuth, WhatsAppController.getMessages);
router.post('/conversations/:phone/toggle-agent', needsAuth, WhatsAppController.toggleAgent);
router.put('/conversations/:phone/labels', needsAuth, WhatsAppController.updateLabels);
router.post('/send-message', needsAuth, WhatsAppController.sendMessage);

// Gestão de Base de Conhecimento (RAG)
router.get('/knowledge', needsAuth, WhatsAppController.getKnowledge);
router.post('/knowledge', needsAuth, WhatsAppController.addKnowledge);
router.delete('/knowledge/:id', needsAuth, WhatsAppController.deleteKnowledge);

// Novas rotas de controle de instância
router.post('/logout', needsAuth, WhatsAppController.logout);
router.post('/restart', needsAuth, WhatsAppController.restart);
router.delete('/delete', needsAuth, WhatsAppController.delete);

// Rota pública (Webhook da Evolution API)
router.post('/webhook', WhatsAppController.webhook);

module.exports = router;
