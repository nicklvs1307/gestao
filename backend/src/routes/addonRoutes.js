const express = require('express');
const router = express.Router();
const AddonGroupController = require('../controllers/AddonGroupController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/', AddonGroupController.getAddonGroups);
router.post('/', AddonGroupController.createAddonGroup);
router.put('/:id', AddonGroupController.updateAddonGroup);
router.delete('/:id', AddonGroupController.deleteAddonGroup);

module.exports = router;
