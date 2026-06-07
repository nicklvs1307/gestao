const express = require('express');
const router = express.Router();
const IntegrationController = require('../controllers/IntegrationController');
const { needsAuth, checkPermission } = require('../middlewares/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.use(needsAuth);
router.use(checkPermission('integrations:manage'));

router.get('/saipos', IntegrationController.getSaiposSettings);
router.put('/saipos', IntegrationController.updateSaiposSettings);
router.post('/saipos/import', upload.single('file'), IntegrationController.importSaiposMenu);

router.get('/uairango', IntegrationController.getUairangoSettings);
router.put('/uairango', IntegrationController.updateUairangoSettings);
router.post('/uairango/import', IntegrationController.importUairangoMenu);
router.post('/uairango/confirm', IntegrationController.confirmUairangoOrder);
router.post('/uairango/reject', IntegrationController.rejectUairangoOrder);
router.post('/uairango/start-preparation', IntegrationController.startUairangoPreparation);
router.post('/uairango/ready', IntegrationController.markUairangoReady);
router.get('/uairango/status', IntegrationController.getUairangoConnectionStatus);
router.put('/uairango/merchant-status', IntegrationController.updateUairangoMerchantStatus);
router.post('/uairango/dispatch', IntegrationController.dispatchUairangoOrder);
router.get('/uairango/cancellation-reasons/:orderId', IntegrationController.getUairangoCancellationReasons);
router.post('/uairango/cancel-order', IntegrationController.requestUairangoCancellation);

router.get('/ifood', IntegrationController.getIfoodSettings);
router.put('/ifood', IntegrationController.updateIfoodSettings);
router.get('/ifood/status', IntegrationController.getIfoodConnectionStatus);

router.post('/ifood/confirm', IntegrationController.confirmIfoodOrder);
router.post('/ifood/reject', IntegrationController.rejectIfoodOrder);
router.post('/ifood/start', IntegrationController.startIfoodPreparation);
router.post('/ifood/ready', IntegrationController.markIfoodReady);

// Cancelamento - motivos disponíveis
router.get('/ifood/cancellation-reasons/:orderId', IntegrationController.getIfoodCancellationReasons);

// Cancelamento - aceitar/recusar solicitação do cliente
router.post('/ifood/accept-cancellation', IntegrationController.acceptIfoodCancellation);
router.post('/ifood/refuse-cancellation', IntegrationController.refuseIfoodCancellation);

// Validação de código de retirada
router.post('/ifood/validate-pickup', IntegrationController.validateIfoodPickupCode);

// Disputas (Handshake pós-entrega)
router.post('/ifood/accept-dispute', IntegrationController.acceptIfoodDispute);
router.post('/ifood/reject-dispute', IntegrationController.rejectIfoodDispute);
router.post('/ifood/alternative-dispute', IntegrationController.offerIfoodAlternative);

// === ASAAS (Pagamento PIX Online) ===
router.get('/asaas', IntegrationController.getAsaasSettings);
router.put('/asaas', IntegrationController.updateAsaasSettings);

module.exports = router;