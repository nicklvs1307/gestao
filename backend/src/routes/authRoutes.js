const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { needsAdmin, needsAuth } = require('../middlewares/auth');

router.post('/login', AuthController.login);
router.get('/users', needsAdmin, AuthController.getUsers);
router.post('/users', needsAdmin, AuthController.createUser);

router.get('/drivers', needsAuth, async (req, res) => {
    try {
        const drivers = await prisma.user.findMany({
            where: { restaurantId: req.restaurantId, role: 'driver' },
            select: { id: true, name: true }
        });
        res.json(drivers);
    } catch (e) { 
        res.status(500).json({ error: 'Erro ao buscar entregadores.' }); 
    }
});

module.exports = router;
