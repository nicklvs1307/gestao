const express = require('express');
const router = express.Router();
const CustomerController = require('../controllers/CustomerController');
const { needsAuth } = require('../middlewares/auth');
const prisma = require('../lib/prisma');

router.get('/', needsAuth, CustomerController.index);
router.post('/', needsAuth, CustomerController.store);
router.get('/search', needsAuth, async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.json([]);

        const cleanQuery = query.toString().replace(/\D/g, '');

        const customers = await prisma.customer.findMany({
            where: {
                restaurantId: req.restaurantId,
                OR: [
                    { phone: { contains: cleanQuery && cleanQuery.length > 0 ? cleanQuery : '___NOMATCH___' } },
                    { name: { contains: query.toString(), mode: 'insensitive' } },
                    { address: { contains: query.toString(), mode: 'insensitive' } }
                ]
            },
            include: {
                deliveryOrders: {
                    select: {
                        address: true,
                        deliveryType: true,
                        createdAt: true
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 20
                }
            },
            take: 15,
            orderBy: { updatedAt: 'desc' }
        });
        res.json({ customers });
    } catch (error) {
        console.error("Erro ao buscar clientes:", error);
        res.status(500).json({ error: 'Erro ao buscar clientes.' });
    }
});
router.get('/:id', needsAuth, CustomerController.show);
router.put('/:id', needsAuth, CustomerController.update);
router.delete('/:id', needsAuth, CustomerController.delete);

module.exports = router;
