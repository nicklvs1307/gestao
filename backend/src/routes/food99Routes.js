const express = require('express');
const router = express.Router();
const Food99Controller = require('../controllers/Food99Controller');
const { needsAuth, checkPermission } = require('../middlewares/auth');

router.use(needsAuth);
router.use(checkPermission('integrations:manage'));

router.get('/food99', Food99Controller.getFood99Settings);
router.put('/food99', Food99Controller.updateFood99Settings);
router.get('/food99/status', Food99Controller.getFood99ConnectionStatus);

router.post('/food99/confirm', Food99Controller.confirmFood99Order);
router.post('/food99/reject', Food99Controller.rejectFood99Order);
router.post('/food99/ready', Food99Controller.markFood99Ready);

module.exports = router;
