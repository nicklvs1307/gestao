const express = require('express');
const router = express.Router();
const Food99Controller = require('../controllers/Food99Controller');
const { needsAuth, checkPermission } = require('../middlewares/auth');

router.use(needsAuth);
router.use(checkPermission('integrations:manage'));

router.get('/food99', Food99Controller.getFood99Settings);
router.put('/food99', Food99Controller.updateFood99Settings);
router.get('/food99/status', Food99Controller.getFood99ConnectionStatus);
router.get('/food99/debug', Food99Controller.getDebug);

router.post('/food99/confirm', Food99Controller.confirmFood99Order);
router.post('/food99/reject', Food99Controller.rejectFood99Order);
router.post('/food99/ready', Food99Controller.markFood99Ready);

router.post('/food99/authorize', Food99Controller.getAuthorizationUrl);
router.get('/food99/shops', Food99Controller.listShops);
router.post('/food99/set-online', Food99Controller.setShopOnline);
router.post('/food99/set-confirm-method', Food99Controller.setConfirmMethod);
router.get('/food99/shop-detail', Food99Controller.getShopDetail);
router.post('/food99/sync-menu', Food99Controller.syncMenu);
router.get('/food99/menu-status', Food99Controller.getMenuStatus);
router.get('/food99/current-menu', Food99Controller.getCurrentMenu);
router.post('/food99/item-status', Food99Controller.updateItemStatus);
router.post('/food99/refresh-token', Food99Controller.refreshToken);
router.post('/food99/unbind', Food99Controller.unbindShop);
router.post('/food99/cancel-apply', Food99Controller.handleCancelApply);
router.post('/food99/refund-apply', Food99Controller.handleRefundApply);

module.exports = router;
