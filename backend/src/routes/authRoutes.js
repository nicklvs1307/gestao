const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { needsAdmin, needsAuth } = require('../middlewares/auth');
const prisma = require('../lib/prisma');

router.post('/login', AuthController.login);
router.get('/users', needsAdmin, AuthController.getUsers);
router.post('/users', needsAdmin, AuthController.createUser);
router.put('/users/:id', needsAdmin, AuthController.updateUser);
router.delete('/users/:id', needsAdmin, AuthController.deleteUser);
router.get('/roles', needsAdmin, AuthController.getAvailableRoles); 

router.get('/permissions', needsAdmin, async (req, res) => {
    try {
        const allPermissions = await prisma.permission.findMany({
            orderBy: { name: 'asc' }
        });

        // Se for SuperAdmin, retorna tudo
        if (req.user.isSuperAdmin || req.user.role === 'superadmin' || req.user.permissions.includes('all:manage')) {
            return res.json(allPermissions);
        }

        // Se for Admin comum, retorna apenas as permissões que ele mesmo possui
        const filtered = allPermissions.filter(p => req.user.permissions.includes(p.name));
        res.json(filtered);
    } catch (e) {
        res.status(500).json({ error: 'Erro ao buscar permissões.' });
    }
});

router.get('/drivers', needsAuth, async (req, res) => {
    try {
        const drivers = await prisma.user.findMany({
            where: { 
                restaurantId: req.restaurantId,
                roleRef: {
                    name: {
                        equals: 'driver',
                        mode: 'insensitive'
                    }
                }
            },
            select: { id: true, name: true }
        });
        res.json(drivers);
    } catch (e) { 
        console.error('Erro ao buscar entregadores:', e);
        res.status(500).json({ error: 'Erro ao buscar entregadores.' }); 
    }
});

module.exports = router;
