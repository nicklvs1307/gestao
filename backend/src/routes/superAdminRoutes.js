const express = require('express');
const router = express.Router();
// Todas as rotas aqui exigem pelo menos ser SuperAdmin ou ter a permissão all:manage
router.use(authenticateToken);
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
router.get('/roles', SuperAdminController.getRoles);
router.post('/roles', SuperAdminController.createRole);

module.exports = router;
