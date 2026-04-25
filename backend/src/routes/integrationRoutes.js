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

router.get('/ifood', IntegrationController.getIfoodSettings);
router.put('/ifood', IntegrationController.updateIfoodSettings);
router.post('/ifood/confirm', IntegrationController.confirmIfoodOrder);
router.post('/ifood/reject', IntegrationController.rejectIfoodOrder);
router.post('/ifood/start', IntegrationController.startIfoodPreparation);
router.post('/ifood/ready', IntegrationController.markIfoodReady);

module.exports = router;
