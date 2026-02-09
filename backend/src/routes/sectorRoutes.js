const express = require('express');
const router = express.Router();
const SectorController = require('../controllers/SectorController');
const { needsAuth } = require('../middlewares/auth');

router.get('/', needsAuth, SectorController.index);
router.post('/', needsAuth, SectorController.store);
router.put('/:id', needsAuth, SectorController.update);
router.delete('/:id', needsAuth, SectorController.delete);

module.exports = router;
