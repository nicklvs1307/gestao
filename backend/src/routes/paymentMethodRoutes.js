const express = require('express');
const router = express.Router();
const PaymentMethodController = require('../controllers/PaymentMethodController');
const { needsAuth } = require('../middlewares/auth');

// Admin routes
router.get('/:restaurantId', needsAuth, PaymentMethodController.list);
router.post('/:restaurantId', needsAuth, PaymentMethodController.create);
router.put('/:id', needsAuth, PaymentMethodController.update);
router.delete('/:id', needsAuth, PaymentMethodController.delete);

module.exports = router;
