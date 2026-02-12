const express = require('express');
const router = express.Router();
const PromotionController = require('../controllers/PromotionController');
const { needsAuth } = require('../middlewares/auth');

// Admin
router.get('/', needsAuth, PromotionController.getAllPromotions);
router.post('/', needsAuth, PromotionController.createPromotion);
router.put('/:id', needsAuth, PromotionController.updatePromotion);
router.delete('/:id', needsAuth, PromotionController.deletePromotion);

// Client
router.get('/active/:restaurantId', PromotionController.getActivePromotions);
router.post('/validate-coupon', PromotionController.validateCoupon); // Nova rota de validação de cupom

module.exports = router;
