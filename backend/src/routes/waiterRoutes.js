const express = require('express');
const router = express.Router();
const WaiterController = require('../controllers/WaiterController');
const { needsAuth } = require('../middlewares/auth');

router.use(needsAuth);

router.get('/settlement', WaiterController.getSettlement);
router.post('/settlement/pay', WaiterController.paySettlement);

module.exports = router;
