const express = require('express');
const router = express.Router();
const AddonGroupController = require('../controllers/AddonGroupController');
const { needsAuth } = require('../middlewares/auth');

router.use(needsAuth);

router.get('/', AddonGroupController.getAddonGroups);
router.get('/:id', AddonGroupController.getAddonGroupById);
router.patch('/reorder', AddonGroupController.reorderGroups);
router.post('/', AddonGroupController.createAddonGroup);
router.post('/:id/duplicate', AddonGroupController.duplicateAddonGroup);
router.put('/:id', AddonGroupController.updateAddonGroup);
router.delete('/:id', AddonGroupController.deleteAddonGroup);

module.exports = router;
