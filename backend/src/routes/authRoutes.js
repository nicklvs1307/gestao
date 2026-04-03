const express = require('express');
const logger = require('../config/logger');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { needsAdmin, needsAuth } = require('../middlewares/auth');
const prisma = require('../lib/prisma');
const validate = require('../middlewares/validate');
const { z } = require('zod');
const { getModulesForPlan } = require('../config/planModules');
const { getPermissionsForModules } = require('../config/modulePermissions');

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido.'),
    password: z.string().min(1, 'Senha é obrigatória.')
  })
});

router.post('/login', validate(loginSchema), AuthController.login);
router.get('/users', needsAdmin, AuthController.getUsers);
router.post('/users', needsAdmin, AuthController.createUser);
router.put('/users/:id', needsAdmin, AuthController.updateUser);
router.delete('/users/:id', needsAdmin, AuthController.deleteUser);
router.get('/roles', needsAdmin, AuthController.getAvailableRoles); 
router.post('/send-reset-email', needsAdmin, AuthController.sendResetEmail);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

router.get('/permissions', needsAdmin, async (req, res) => {
    try {
        const allPermissions = await prisma.permission.findMany({
            orderBy: { name: 'asc' }
        });

        if (req.user.isSuperAdmin || req.user.role === 'superadmin' || req.user.permissions?.includes('all:manage')) {
            return res.json(allPermissions);
        }

        let enabledModules = req.user.enabledModules;
        if (!enabledModules && req.restaurantId) {
            const restaurant = await prisma.restaurant.findUnique({
                where: { id: req.restaurantId },
                select: { enabledModules: true, plan: true }
            });
            if (restaurant) {
                enabledModules = restaurant.enabledModules || getModulesForPlan(restaurant.plan);
            }
        }

        if (enabledModules && enabledModules.length > 0) {
            const allowedPermNames = getPermissionsForModules(enabledModules);
            const filtered = allPermissions.filter(p => allowedPermNames.includes(p.name));
            return res.json(filtered);
        }

        const filtered = allPermissions.filter(p => req.user.permissions?.includes(p.name));
        res.json(filtered);
    } catch (e) {
        logger.error("Erro ao buscar permissões:", e);
        res.status(500).json({ error: 'Erro ao buscar permissões.' });
    }
});

router.get('/drivers', needsAuth, async (req, res) => {
    try {
        const drivers = await prisma.user.findMany({
            where: { 
                restaurantId: req.restaurantId,
                OR: [
                    {
                        roleRef: {
                            name: {
                                in: ['driver', 'Entregador'],
                                mode: 'insensitive'
                            }
                        }
                    },
                    {
                        roleRef: {
                            permissions: {
                                some: {
                                    name: 'delivery:manage'
                                }
                            }
                        }
                    },
                    {
                        permissions: {
                            some: {
                                name: 'delivery:manage'
                            }
                        }
                    }
                ]
            },
            select: { id: true, name: true }
        });
        res.json(drivers);
    } catch (e) { 
        logger.error('Erro ao buscar entregadores:', e);
        res.status(500).json({ error: 'Erro ao buscar entregadores.' }); 
    }
});

module.exports = router;
