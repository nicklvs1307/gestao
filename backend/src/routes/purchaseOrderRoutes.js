const express = require('express');
const router = express.Router();
const PurchaseOrderController = require('../controllers/PurchaseOrderController');
const { needsAuth, checkPermission } = require('../middlewares/auth');

router.use(needsAuth);
router.use(checkPermission('stock:manage'));

router.get('/', PurchaseOrderController.getAll);
router.get('/:id', PurchaseOrderController.getById);
router.post('/', PurchaseOrderController.create);
router.put('/:id', PurchaseOrderController.update);
router.delete('/:id', PurchaseOrderController.delete);

router.put('/:id/send', PurchaseOrderController.send);
router.put('/:id/receive', PurchaseOrderController.receive);
router.put('/:id/cancel', PurchaseOrderController.cancel);

module.exports = router;
