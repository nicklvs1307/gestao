const express = require('express');
const router = express.Router();
const IngredientController = require('../controllers/IngredientController');
const { needsAuth } = require('../middlewares/auth');

// Rotas montadas em /api/ingredients
router.get('/', needsAuth, IngredientController.getAll);
router.post('/', needsAuth, IngredientController.create);
router.put('/:id', needsAuth, IngredientController.update);
router.delete('/:id', needsAuth, IngredientController.delete);

module.exports = router;
