const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

// --- Gestão de Franquias ---

const createFranchise = async (req, res) => {
    const { name, slug, logoUrl } = req.body;
    try {
        const franchise = await prisma.franchise.create({
            data: { name, slug, logoUrl }
        });
        res.status(201).json(franchise);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar franquia.' });
    }
};

const getFranchises = async (req, res) => {
    try {
        const franchises = await prisma.franchise.findMany({
            include: { _count: { select: { restaurants: true, users: true } } }
        });
        res.json(franchises);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar franquias.' });
    }
};

// --- Gestão de Restaurantes (Global) ---

const createRestaurant = async (req, res) => {
    const { 
        name, slug, franchiseId, plan, expiresAt,
        adminName, adminEmail, adminPassword 
    } = req.body;

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Criar o Restaurante
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

            // 2. Buscar ou Criar a Role de Admin para este restaurante
            // (Usaremos o nome padrão 'Administrador')
            let adminRole = await tx.role.findFirst({
                where: { name: 'Administrador', franchiseId: null }
            });

            // 3. Criar o Usuário Administrador da Loja
            const passwordHash = await bcrypt.hash(adminPassword, 10);
            const user = await tx.user.create({
                data: {
                    email: adminEmail,
                    name: adminName,
                    passwordHash,
                    role: 'admin',
                    restaurantId: restaurant.id,
                    roleId: adminRole?.id
                }
            });

            return { restaurant, user };
        });

        res.status(201).json(result);
    } catch (error) {
        console.error("Erro ao criar restaurante completo:", error);
        if (error.code === 'P2002') {
            const target = error.meta?.target || [];
            if (target.includes('name')) return res.status(400).json({ error: 'Já existe uma loja com este nome.' });
            if (target.includes('slug')) return res.status(400).json({ error: 'Este Slug/URL já está em uso.' });
            if (target.includes('email')) return res.status(400).json({ error: 'Este e-mail de administrador já está cadastrado.' });
        }
        res.status(500).json({ error: 'Erro interno ao processar o onboarding da loja.' });
    }
};

const getAllRestaurants = async (req, res) => {
    try {
        const restaurants = await prisma.restaurant.findMany({
            include: { 
                franchise: true,
                _count: { select: { orders: true, users: true } }
            }
        });
        res.json(restaurants);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar restaurantes.' });
    }
};

const updateRestaurantSubscription = async (req, res) => {
    const { id } = req.params;
    const { plan, status, expiresAt } = req.body;
    try {
        const updated = await prisma.restaurant.update({
            where: { id },
            data: { 
                plan, 
                status, 
                expiresAt: expiresAt ? new Date(expiresAt) : null 
            }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar assinatura.' });
    }
};

// --- Gestão de Usuários Globais ---

const createGlobalUser = async (req, res) => {
    const { email, password, name, isSuperAdmin, franchiseId, restaurantId, roleId } = req.body;
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                name,
                passwordHash,
                isSuperAdmin: !!isSuperAdmin,
                franchiseId,
                restaurantId,
                roleId
            }
        });
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar usuário global.' });
    }
};

// --- Gestão de Permissões e Roles ---

const getPermissions = async (req, res) => {
    try {
        res.json(await prisma.permission.findMany());
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar permissões.' });
    }
};

const getRoles = async (req, res) => {
    try {
        const roles = await prisma.role.findMany({
            include: { permissions: true }
        });
        res.json(roles);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar cargos.' });
    }
};

const createRole = async (req, res) => {
    const { name, description, permissionIds, franchiseId } = req.body;
    try {
        const role = await prisma.role.create({
            data: {
                name,
                description,
                franchiseId,
                permissions: {
                    connect: permissionIds.map(id => ({ id }))
                }
            },
            include: { permissions: true }
        });
        res.json(role);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar cargo.' });
    }
};

module.exports = {
    createFranchise,
    getFranchises,
    createRestaurant,
    getAllRestaurants,
    updateRestaurantSubscription,
    createGlobalUser,
    getPermissions,
    getRoles,
    createRole
};
