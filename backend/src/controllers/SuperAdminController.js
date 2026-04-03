const { validatePassword } = require('../utils/passwordValidator');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const { getModulesForPlan, PLAN_MODULES, MODULE_LABELS, MODULE_DESCRIPTIONS, getAllModules } = require('../config/planModules');
const { getPermissionsForModules } = require('../config/modulePermissions');

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

    const passwordError = validatePassword(adminPassword);
    if (passwordError) {
        return res.status(400).json({ error: passwordError });
    }

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
                    enabledModules: getModulesForPlan(plan || 'FREE'),
                    settings: { create: {} },
                    integrationSettings: { create: {} }
                }
            });

            // 2. Buscar a Role de Admin para este restaurante
            // Padronizado para 'admin' conforme migração e seed
            let adminRole = await tx.role.findFirst({
                where: { 
                    name: { equals: 'admin', mode: 'insensitive' },
                    franchiseId: null 
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
                    roleId: adminRole?.id
                }
            });

            return { restaurant, user };
        });

        res.status(201).json(result);
    } catch (error) {
        logger.error("Erro ao criar restaurante completo:", error);
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
                franchise: {
                    select: { id: true, name: true, slug: true }
                },
                _count: { 
                    select: { orders: true, users: true } 
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(restaurants);
    } catch (error) {
        logger.error("ERRO [getAllRestaurants]:", error);
        res.status(500).json({ error: 'Erro ao buscar restaurantes.', details: error.message });
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
        const passwordError = validatePassword(password);
        if (passwordError) {
            return res.status(400).json({ error: passwordError });
        }

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

const updateRolePermissions = async (req, res) => {
    const { id } = req.params;
    const { permissionIds } = req.body;
    try {
        const role = await prisma.role.update({
            where: { id },
            data: {
                permissions: {
                    set: permissionIds.map(id => ({ id }))
                }
            },
            include: { permissions: true }
        });
        res.json(role);
    } catch (error) {
        logger.error("Erro ao atualizar permissões do cargo:", error);
        res.status(500).json({ error: 'Erro ao atualizar permissões do cargo.' });
    }
};

// --- Gestão de Módulos por Restaurante ---

const getRestaurantModules = async (req, res) => {
    const { id } = req.params;
    try {
        const restaurant = await prisma.restaurant.findUnique({
            where: { id },
            select: { id: true, name: true, plan: true, enabledModules: true }
        });

        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurante não encontrado.' });
        }

        const enabledModules = restaurant.enabledModules || getModulesForPlan(restaurant.plan);
        const allModules = getAllModules();
        const planModules = getModulesForPlan(restaurant.plan);

        const modules = allModules.map(mod => ({
            id: mod,
            label: MODULE_LABELS[mod],
            description: MODULE_DESCRIPTIONS[mod],
            enabled: enabledModules.includes(mod),
            isPlanDefault: planModules.includes(mod),
            isOverride: enabledModules.includes(mod) !== planModules.includes(mod)
        }));

        res.json({
            restaurant: {
                id: restaurant.id,
                name: restaurant.name,
                plan: restaurant.plan
            },
            modules,
            planModules
        });
    } catch (error) {
        logger.error("Erro ao buscar módulos do restaurante:", error);
        res.status(500).json({ error: 'Erro ao buscar módulos do restaurante.' });
    }
};

const updateRestaurantModules = async (req, res) => {
    const { id } = req.params;
    const { enabledModules } = req.body;
    try {
        if (!Array.isArray(enabledModules)) {
            return res.status(400).json({ error: 'enabledModules deve ser um array.' });
        }

        const allModules = getAllModules();
        const invalidModules = enabledModules.filter(m => !allModules.includes(m));
        if (invalidModules.length > 0) {
            return res.status(400).json({ error: `Módulos inválidos: ${invalidModules.join(', ')}` });
        }

        const restaurant = await prisma.restaurant.update({
            where: { id },
            data: { enabledModules }
        });

        res.json({
            message: 'Módulos atualizados com sucesso.',
            enabledModules: restaurant.enabledModules
        });
    } catch (error) {
        logger.error("Erro ao atualizar módulos do restaurante:", error);
        res.status(500).json({ error: 'Erro ao atualizar módulos do restaurante.' });
    }
};

const syncRestaurantModulesToPlan = async (req, res) => {
    const { id } = req.params;
    try {
        const restaurant = await prisma.restaurant.findUnique({
            where: { id },
            select: { plan: true }
        });

        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurante não encontrado.' });
        }

        const planModules = getModulesForPlan(restaurant.plan);

        const updated = await prisma.restaurant.update({
            where: { id },
            data: { enabledModules: planModules }
        });

        res.json({
            message: `Módulos sincronizados com o plano ${restaurant.plan}.`,
            enabledModules: updated.enabledModules
        });
    } catch (error) {
        logger.error("Erro ao sincronizar módulos com o plano:", error);
        res.status(500).json({ error: 'Erro ao sincronizar módulos com o plano.' });
    }
};

const getAllPermissionsWithModules = async (req, res) => {
    try {
        const permissions = await prisma.permission.findMany({
            orderBy: { name: 'asc' }
        });

        const { getModulesForPermission } = require('../config/modulePermissions');
        
        const permissionsWithModules = permissions.map(p => ({
            ...p,
            modules: getModulesForPermission(p.name)
        }));

        res.json(permissionsWithModules);
    } catch (error) {
        logger.error("Erro ao buscar permissões com módulos:", error);
        res.status(500).json({ error: 'Erro ao buscar permissões.' });
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
    createRole,
    updateRolePermissions,
    getRestaurantModules,
    updateRestaurantModules,
    syncRestaurantModulesToPlan,
    getAllPermissionsWithModules
};
