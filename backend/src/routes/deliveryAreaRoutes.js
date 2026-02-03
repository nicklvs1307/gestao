const express = require('express');
const router = express.Router();
const DeliveryAreaController = require('../controllers/DeliveryAreaController');
const { needsAuth } = require('../middlewares/auth');

router.get('/', needsAuth, DeliveryAreaController.getAreas);
router.post('/', needsAuth, DeliveryAreaController.createArea);
router.put('/:id', needsAuth, DeliveryAreaController.updateArea);
router.delete('/:id', needsAuth, DeliveryAreaController.deleteArea);

module.exports = router;
