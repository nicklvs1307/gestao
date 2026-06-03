const express = require('express');
const router = express.Router();
const PromotionController = require('../controllers/PromotionController');
const { needsAuth } = require('../middlewares/auth');
const rateLimit = require('express-rate-limit');

// Rate limiter para validação de cupom (anti brute-force)
const couponValidationLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 20, // 20 tentativas por minuto por IP
    message: { error: 'Muitas tentativas. Tente novamente em 1 minuto.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Admin
router.get('/', needsAuth, PromotionController.getAllPromotions);
router.post('/', needsAuth, PromotionController.createPromotion);
router.put('/:id', needsAuth, PromotionController.updatePromotion);
router.delete('/:id', needsAuth, PromotionController.deletePromotion);

// Client
router.get('/active/:restaurantId', PromotionController.getActivePromotions);
router.post('/validate-coupon', couponValidationLimiter, PromotionController.validateCoupon);

module.exports = router;
