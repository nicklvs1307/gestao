const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

const getMyRestaurants = async (req, res) => {
    const { franchiseId } = req.user;
    if (!franchiseId) return res.status(403).json({ error: 'Usuário não vinculado a uma franquia.' });

    try {
        const restaurants = await prisma.restaurant.findMany({
            where: { franchiseId },
            include: { 
                _count: { select: { orders: true, users: true } },
                users: {
                    where: { roleRef: { name: 'admin' } },
                    select: { email: true, name: true }
                }
            }
        });
        res.json(restaurants);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar restaurantes da franquia.' });
    }
};

const createRestaurant = async (req, res) => {
    const { franchiseId } = req.user;
    const { 
        name, slug, plan, expiresAt,
        adminName, adminEmail, adminPassword 
    } = req.body;

    if (!franchiseId) return res.status(403).json({ error: 'Apenas franqueadores podem criar lojas.' });

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Criar o Restaurante vinculado à franquia do usuário
            const restaurant = await tx.restaurant.create({
                data: { 
                    name, 
                    slug, 
                    franchiseId, 
                    plan: plan || 'FREE',
                    expiresAt: expiresAt ? new Date(expiresAt) : null,
                    settings: { create: {} },
                    integrationSettings: { create: {} }
                }
            });

            // 2. Buscar a Role de Admin (Global ou da Franquia)
            let adminRole = await tx.role.findFirst({
                where: { 
                    name: { equals: 'admin', mode: 'insensitive' },
                    OR: [
                        { franchiseId: null },
                        { franchiseId: franchiseId }
                    ]
                }
            });

            // 3. Criar o Usuário Administrador da Loja
            const passwordHash = await bcrypt.hash(adminPassword, 10);
            const user = await tx.user.create({
                data: {
                    email: adminEmail,
                    name: adminName,
                    passwordHash,
                    restaurantId: restaurant.id,
                    roleId: adminRole?.id,
                    franchiseId: franchiseId // O admin da loja também herda o ID da franquia
                }
            });

            return { restaurant, user };
        });

        res.status(201).json(result);
    } catch (error) {
        console.error("Erro ao criar restaurante na franquia:", error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Conflito de dados: Nome, Slug ou E-mail já existem.' });
        }
        res.status(500).json({ error: 'Erro interno ao criar loja.' });
    }
};

const getFranchiseReports = async (req, res) => {
    const { franchiseId } = req.user;
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
    createRestaurant,
    getFranchiseReports
};
