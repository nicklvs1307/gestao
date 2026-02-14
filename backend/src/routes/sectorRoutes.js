const express = require('express');
const router = express.Router();
const SectorController = require('../controllers/SectorController');
const { needsAuth, checkPermission } = require('../middlewares/auth');

router.get('/', needsAuth, checkPermission('sectors:manage'), SectorController.index);
router.post('/', needsAuth, checkPermission('sectors:manage'), SectorController.store);
router.put('/:id', needsAuth, checkPermission('sectors:manage'), SectorController.update);
router.delete('/:id', needsAuth, checkPermission('sectors:manage'), SectorController.delete);

module.exports = router;
