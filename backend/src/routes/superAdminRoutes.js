const express = require('express');
const router = express.Router();
const SuperAdminController = require('../controllers/SuperAdminController');
const { authenticateToken, checkPermission } = require('../middlewares/auth');

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

// Módulos por Restaurante
router.get('/restaurants/:id/modules', SuperAdminController.getRestaurantModules);
router.put('/restaurants/:id/modules', SuperAdminController.updateRestaurantModules);
router.post('/restaurants/:id/modules/sync-plan', SuperAdminController.syncRestaurantModulesToPlan);
router.post('/restaurants/:id/apply-plan', SuperAdminController.applyPlanToRestaurant);

// Planos Customizáveis
router.get('/plans', SuperAdminController.getSubscriptionPlans);
router.post('/plans', SuperAdminController.createSubscriptionPlan);
router.put('/plans/:id', SuperAdminController.updateSubscriptionPlan);
router.delete('/plans/:id', SuperAdminController.deleteSubscriptionPlan);

// Usuários
router.post('/users', SuperAdminController.createGlobalUser);

// Permissões e Roles
router.get('/permissions', SuperAdminController.getPermissions);
router.get('/permissions-with-modules', SuperAdminController.getAllPermissionsWithModules);
router.get('/roles', SuperAdminController.getRoles);
router.post('/roles', SuperAdminController.createRole);
router.put('/roles/:id/permissions', SuperAdminController.updateRolePermissions);

module.exports = router;
