const express = require('express');
const router = express.Router();
const SettingsController = require('../controllers/SettingsController');
const { needsAuth, checkPermission } = require('../middlewares/auth');
const upload = require('../config/multer');

// Admin
router.get('/', needsAuth, checkPermission('settings:view'), SettingsController.getSettings);
router.get('/check-slug', needsAuth, checkPermission('settings:view'), SettingsController.checkSlugAvailability);
router.put('/', needsAuth, checkPermission('settings:manage'), SettingsController.updateSettings);
router.put('/status', needsAuth, checkPermission('settings:manage'), SettingsController.toggleStatus);
router.post('/logo', needsAuth, checkPermission('settings:manage'), upload.single('logo'), SettingsController.updateLogo);
router.post('/cover', needsAuth, checkPermission('settings:manage'), upload.single('cover'), SettingsController.updateCover);

// Client
router.get('/slug/:slug', SettingsController.getRestaurantBySlug);
router.get('/:restaurantId', SettingsController.getClientSettings);

module.exports = router;
