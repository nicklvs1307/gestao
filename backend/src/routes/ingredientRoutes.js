const express = require('express');
const router = express.Router();
const IngredientController = require('../controllers/IngredientController');
const { needsAuth } = require('../middlewares/auth');

// Rotas montadas em /api/ingredients
router.get('/', needsAuth, IngredientController.getAll);
router.post('/', needsAuth, IngredientController.create);
router.put('/:id', needsAuth, IngredientController.update);
router.delete('/:id', needsAuth, IngredientController.delete);

// Rotas de Grupos
router.get('/groups', needsAuth, IngredientController.getGroups);
router.post('/groups', needsAuth, IngredientController.createGroup);
router.delete('/groups/:id', needsAuth, IngredientController.deleteGroup);

// Rotas de Receitas (Insumos Beneficiados)
router.get('/:id/recipe', needsAuth, IngredientController.getRecipe);
router.post('/:id/recipe', needsAuth, IngredientController.saveRecipe);

module.exports = router;
