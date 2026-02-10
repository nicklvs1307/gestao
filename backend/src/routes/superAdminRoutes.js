const express = require('express');
const router = express.Router();
const SuperAdminController = require('../controllers/SuperAdminController');
const { authenticateToken, checkPermission, checkAdmin } = require('../middlewares/auth');

router.use(authenticateToken);

// Rota acessível por Administradores de Loja também
router.get('/roles', SuperAdminController.getRoles);

// Todas as outras rotas exigem permissão de SuperAdmin (all:manage)
router.use(checkPermission('all:manage'));

// Franquias
router.post('/franchises', SuperAdminController.createFranchise);
router.get('/franchises', SuperAdminController.getFranchises);

// Restaurantes
router.post('/restaurants', SuperAdminController.createRestaurant);
router.get('/restaurants', SuperAdminController.getAllRestaurants);
router.patch('/restaurants/:id/subscription', SuperAdminController.updateRestaurantSubscription);

// Usuários
router.post('/users', SuperAdminController.createGlobalUser);

// Permissões e Roles
router.get('/permissions', SuperAdminController.getPermissions);
router.post('/roles', SuperAdminController.createRole);

module.exports = router;
