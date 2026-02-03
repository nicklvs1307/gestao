const express = require('express');
const router = express.Router();
const CategoryController = require('../controllers/CategoryController');
const { needsAuth, checkPermission } = require('../middlewares/auth');

// Admin routes
router.get('/flat', needsAuth, CategoryController.getCategoriesFlat);
router.get('/', needsAuth, CategoryController.getCategoriesHierarchy);
router.post('/', needsAuth, checkPermission('products:manage'), CategoryController.createCategory);
router.put('/:id', needsAuth, checkPermission('products:manage'), CategoryController.updateCategory);
router.delete('/:id', needsAuth, checkPermission('products:manage'), CategoryController.deleteCategory);

// Client routes
router.get('/:restaurantId', CategoryController.getClientCategories);

module.exports = router;
