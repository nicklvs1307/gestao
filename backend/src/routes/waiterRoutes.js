const express = require('express');
const router = express.Router();
const WaiterController = require('../controllers/WaiterController');
const { needsAuth, checkPermission } = require('../middlewares/auth');

router.use(needsAuth);

router.get('/settlement', checkPermission('waiter_settlement:manage'), WaiterController.getSettlement);
router.post('/settlement/pay', checkPermission('waiter_settlement:manage'), WaiterController.paySettlement);

module.exports = router;
