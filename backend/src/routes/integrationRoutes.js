const express = require('express');
const router = express.Router();
const IntegrationController = require('../controllers/IntegrationController');
const { needsAuth } = require('../middlewares/auth');

router.get('/saipos', needsAuth, IntegrationController.getSaiposSettings);
router.put('/saipos', needsAuth, IntegrationController.updateSaiposSettings);

router.get('/uairango', needsAuth, IntegrationController.getUairangoSettings);
router.put('/uairango', needsAuth, IntegrationController.updateUairangoSettings);
router.post('/uairango/import', needsAuth, IntegrationController.importUairangoMenu);

module.exports = router;
