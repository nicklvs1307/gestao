const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/ProductController');
const { needsAuth, checkPermission } = require('../middlewares/auth');
const upload = require('../config/multer');

// Admin routes (Protected)
router.get('/', needsAuth, ProductController.getProducts);
router.get('/pricing-analysis', needsAuth, checkPermission('products:manage'), ProductController.getPricingAnalysis);
router.get('/:id', needsAuth, checkPermission('products:manage'), ProductController.getProductById);
router.patch('/reorder', needsAuth, checkPermission('products:manage'), ProductController.reorderProducts);
router.post('/', needsAuth, checkPermission('products:manage'), ProductController.createProduct);
router.post('/upload', needsAuth, checkPermission('products:manage'), upload.single('image'), ProductController.uploadImage);
router.put('/:id', needsAuth, checkPermission('products:manage'), ProductController.updateProduct);
router.delete('/:id', needsAuth, checkPermission('products:manage'), ProductController.deleteProduct);

// Client route (moved to index.js or given specific path)
router.get('/client/:restaurantId', ProductController.getClientProducts);

module.exports = router;
