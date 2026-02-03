const express = require('express');
const router = express.Router();
const IntegrationController = require('../controllers/IntegrationController');
const { needsAuth } = require('../middlewares/auth');

router.get('/saipos', needsAuth, IntegrationController.getSaiposSettings);
router.put('/saipos', needsAuth, IntegrationController.updateSaiposSettings);

module.exports = router;
