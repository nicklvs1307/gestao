const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { needsAdmin, needsAuth } = require('../middlewares/auth');
const prisma = require('../lib/prisma');

router.post('/login', AuthController.login);
router.get('/users', needsAdmin, AuthController.getUsers);
router.post('/users', needsAdmin, AuthController.createUser);
router.get('/roles', needsAdmin, AuthController.getAvailableRoles); // Nova rota segura

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
