const express = require('express');
const router = express.Router();
const Food99Controller = require('../controllers/Food99Controller');
const { needsAuth, checkPermission, checkSuperAdmin } = require('../middlewares/auth');

// Todas as rotas requerem autenticação
router.use(needsAuth);

// ============================================================================
// CONFIGURAÇÕES (apenas managers de integração)
// ============================================================================
router.get('/food99', checkPermission('integrations:manage'), Food99Controller.getFood99Settings);
router.put('/food99', checkPermission('integrations:manage'), Food99Controller.updateFood99Settings);
router.get('/food99/status', checkPermission('integrations:manage'), Food99Controller.getFood99ConnectionStatus);

// Debug restrito a super-admin (vaza info sensível como token length, cache state)
router.get('/food99/debug', checkSuperAdmin, Food99Controller.getDebug);

// ============================================================================
// OPERAÇÕES DE PEDIDO (managers de pedido OU integração)
// ============================================================================
router.post('/food99/confirm', checkPermission('orders:manage'), Food99Controller.confirmFood99Order);
router.post('/food99/reject', checkPermission('orders:manage'), Food99Controller.rejectFood99Order);
router.post('/food99/ready', checkPermission('orders:manage'), Food99Controller.markFood99Ready);
router.post('/food99/cancel-apply', checkPermission('orders:manage'), Food99Controller.handleCancelApply);
router.post('/food99/refund-apply', checkPermission('orders:manage'), Food99Controller.handleRefundApply);

// ============================================================================
// AUTORIZAÇÃO E VINCULAÇÃO
// ============================================================================
router.post('/food99/authorize', checkPermission('integrations:manage'), Food99Controller.getAuthorizationUrl);
router.get('/food99/shops', checkPermission('integrations:manage'), Food99Controller.listShops);
router.post('/food99/set-online', checkPermission('integrations:manage'), Food99Controller.setShopOnline);
router.post('/food99/set-confirm-method', checkPermission('integrations:manage'), Food99Controller.setConfirmMethod);
router.get('/food99/shop-detail', checkPermission('integrations:manage'), Food99Controller.getShopDetail);
router.post('/food99/refresh-token', checkPermission('integrations:manage'), Food99Controller.refreshToken);
router.post('/food99/unbind', checkPermission('integrations:manage'), Food99Controller.unbindShop);

// ============================================================================
// NOTIFICAÇÕES DE SOLICITAÇÕES (cancel/refund apply)
// ============================================================================
router.post('/food99/apply-notifications', checkPermission('integrations:manage'), Food99Controller.setApplyNotifications);

// ============================================================================
// CARDÁPIO
// ============================================================================
router.post('/food99/sync-menu', checkPermission('integrations:manage'), Food99Controller.syncMenu);
router.get('/food99/menu-status', checkPermission('integrations:manage'), Food99Controller.getMenuStatus);
router.get('/food99/current-menu', checkPermission('integrations:manage'), Food99Controller.getCurrentMenu);
router.post('/food99/item-status', checkPermission('integrations:manage'), Food99Controller.updateItemStatus);
router.post('/food99/item-status-batch', checkPermission('integrations:manage'), Food99Controller.updateItemStatusBatch);

// ============================================================================
// IMAGENS
// ============================================================================
router.post('/food99/upload-image', checkPermission('integrations:manage'), Food99Controller.uploadImage);
router.get('/food99/images', checkPermission('integrations:manage'), Food99Controller.listImages);

// ============================================================================
// ÁREAS DE ENTREGA
// ============================================================================
router.post('/food99/delivery-area/add', checkPermission('integrations:manage'), Food99Controller.addDeliveryArea);
router.get('/food99/delivery-area/list', checkPermission('integrations:manage'), Food99Controller.listDeliveryAreas);
router.post('/food99/delivery-area/update', checkPermission('integrations:manage'), Food99Controller.updateDeliveryArea);
router.post('/food99/delivery-area/delete', checkPermission('integrations:manage'), Food99Controller.deleteDeliveryArea);
router.post('/food99/delivery-area/update-price', checkPermission('integrations:manage'), Food99Controller.updateDeliveryAreaPrice);

// ============================================================================
// HEALTH CHECK
// ============================================================================
router.get('/food99/health', checkPermission('integrations:manage'), Food99Controller.healthCheck);

module.exports = router;
