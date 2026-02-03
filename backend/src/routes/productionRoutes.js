const express = require('express');
const router = express.Router();
const ProductionController = require('../controllers/ProductionController');
const { needsAuth } = require('../middlewares/auth');

router.get('/history', needsAuth, ProductionController.getHistory);
router.post('/produce', needsAuth, ProductionController.produce);
router.get('/recipes', needsAuth, ProductionController.getRecipes);
router.post('/:id/recipe', needsAuth, ProductionController.saveRecipe);

module.exports = router;