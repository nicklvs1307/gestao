const express = require('express');
const router = express.Router();
const AddonGroupController = require('../controllers/AddonGroupController');
const { needsAuth } = require('../middlewares/auth');

router.use(needsAuth);

router.get('/', AddonGroupController.getAddonGroups);
router.post('/', AddonGroupController.createAddonGroup);
router.put('/:id', AddonGroupController.updateAddonGroup);
router.delete('/:id', AddonGroupController.deleteAddonGroup);

module.exports = router;
