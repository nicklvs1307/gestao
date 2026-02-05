const express = require('express');
const router = express.Router();
const SettingsController = require('../controllers/SettingsController');
const { needsAuth } = require('../middlewares/auth');
const upload = require('../config/multer');

// Admin
router.get('/', needsAuth, SettingsController.getSettings);
router.get('/check-slug', needsAuth, SettingsController.checkSlugAvailability);
router.put('/', needsAuth, SettingsController.updateSettings);
router.put('/status', needsAuth, SettingsController.toggleStatus);
router.post('/logo', needsAuth, upload.single('logo'), SettingsController.updateLogo);

// Client
router.get('/slug/:slug', SettingsController.getRestaurantBySlug);
router.get('/:restaurantId', SettingsController.getClientSettings);

module.exports = router;
