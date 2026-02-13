const express = require('express');
const router = express.Router();
const FranchiseController = require('../controllers/FranchiseController');
const { authenticateToken, checkPermission } = require('../middlewares/auth');

router.use(authenticateToken);

// Rotas para o Franqueador (Franchisor)
router.get('/my-restaurants', checkPermission('reports:view_all'), FranchiseController.getMyRestaurants);
router.post('/restaurants', checkPermission('franchise:manage'), FranchiseController.createRestaurant);
router.get('/reports', checkPermission('reports:view_all'), FranchiseController.getFranchiseReports);

module.exports = router;
