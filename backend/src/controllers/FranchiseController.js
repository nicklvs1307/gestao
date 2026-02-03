const prisma = require('../lib/prisma');

const getMyRestaurants = async (req, res) => {
    const { franchiseId } = req.user;
    if (!franchiseId) return res.status(403).json({ error: 'Usuário não vinculado a uma franquia.' });

    try {
        const restaurants = await prisma.restaurant.findMany({
            where: { franchiseId },
            include: { _count: { select: { orders: true, users: true } } }
        });
        res.json(restaurants);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar restaurantes da franquia.' });
    }
};

const getFranchiseReports = async (req, res) => {
    const { franchiseId } = req.user;
    // Lógica para consolidar vendas de todas as lojas da franquia
    try {
        const sales = await prisma.order.groupBy({
            by: ['restaurantId'],
            where: {
                restaurant: { franchiseId },
                status: 'COMPLETED'
            },
            _sum: { total: true },
            _count: { id: true }
        });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao gerar relatórios da franquia.' });
    }
};

module.exports = {
    getMyRestaurants,
    getFranchiseReports
};
