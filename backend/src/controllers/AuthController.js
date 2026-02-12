const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

const normalizeRole = (dbRoleName, isSuperAdmin) => {
    if (isSuperAdmin) return 'superadmin';
    if (!dbRoleName) return 'staff';

    let normalized = dbRoleName.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '');

    if (normalized.includes('garcom') || normalized.includes('waiter')) return 'waiter';
    if (normalized.includes('entregador') || normalized.includes('driver')) return 'driver';
    if (normalized.includes('administrador') || normalized.includes('admin')) return 'admin';
    
    return normalized;
};

const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: { 
                restaurant: { include: { settings: true } },
                roleRef: {
                    include: { permissions: true }
                }
            },
        });
        
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(400).json({ error: 'Credenciais inválidas.' });
        }
        
        const permissions = user.roleRef?.permissions.map(p => p.name) || [];
        const normalizedRole = normalizeRole(user.roleRef?.name, user.isSuperAdmin);
        
        // Compatibilidade: Se não tem permissões explícitas mas é admin
        let finalPermissions = permissions;
        if (permissions.length === 0 && (normalizedRole === 'admin' || user.isSuperAdmin)) {
            finalPermissions = [
                'all:manage', 'orders:view', 'orders:manage', 'orders:edit_items', 'orders:cancel', 
                'orders:transfer', 'orders:payment_change', 'orders:discount', 'waiter:pos', 'kds:view', 
                'table:manage', 'financial:view', 'financial:manage', 'cashier:manage', 'bank_accounts:manage', 
                'financial_categories:manage', 'waiter_settlement:manage', 'driver_settlement:manage', 
                'products:view', 'products:manage', 'categories:manage', 'stock:view', 'stock:manage', 
                'suppliers:manage', 'reports:view', 'reports:financial', 'reports:performance', 
                'reports:abc', 'settings:view', 'settings:manage', 'users:manage', 'integrations:manage'
            ];
        }
        
        const tokenData = { 
            id: user.id, 
            email: user.email, 
            role: normalizedRole, 
            restaurantId: user.restaurantId,
            isSuperAdmin: user.isSuperAdmin,
            franchiseId: user.franchiseId,
            permissions: finalPermissions
        };

        const token = jwt.sign(tokenData, JWT_SECRET, { expiresIn: '8h' });
        
        res.json({ 
            token, 
            user: { 
                id: user.id, 
                email: user.email, 
                name: user.name, 
                role: normalizedRole, 
                isSuperAdmin: user.isSuperAdmin,
                restaurantId: user.restaurantId,
                franchiseId: user.franchiseId,
                permissions: finalPermissions,
                logoUrl: user.restaurant?.logoUrl,
                menuUrl: user.restaurant?.settings?.menuUrl 
            } 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro no servidor.' });
    }
};

const getUsers = async (req, res) => {
    try {
        const whereClause = req.restaurantId ? { restaurantId: req.restaurantId } : {};
        
        const isUserSuperAdmin = req.user.isSuperAdmin || req.user.role === 'superadmin';
        if (!isUserSuperAdmin && !req.restaurantId) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const users = await prisma.user.findMany({ 
            where: whereClause, 
            select: { 
                id: true, 
                email: true, 
                name: true, 
                isSuperAdmin: true, 
                roleId: true, 
                restaurantId: true,
                roleRef: {
                    select: {
                        name: true,
                        permissions: {
                            select: { name: true }
                        }
                    }
                }
            } 
        });

        const mappedUsers = users.map(u => ({
            ...u,
            role: normalizeRole(u.roleRef?.name, u.isSuperAdmin)
        }));

        res.json(mappedUsers); 
    } catch (error) { 
        console.error("Erro ao buscar usuários:", error);
        res.status(500).json({ error: 'Erro ao buscar usuários.' }); 
    }
};

const createUser = async (req, res) => {
    const { email, password, name, roleId } = req.body;
    try {
        const isUserSuperAdmin = req.user.isSuperAdmin || req.user.role === 'superadmin';
        const targetRestaurantId = isUserSuperAdmin ? (req.body.restaurantId || req.restaurantId) : req.restaurantId;

        // Proteção Crítica: Validar se a Role sendo atribuída é protegida (SuperAdmin)
        if (roleId) {
            const roleToAssign = await prisma.role.findUnique({ where: { id: roleId } });
            if (roleToAssign && roleToAssign.isSystem && roleToAssign.name.toLowerCase().includes('superadmin') && !isUserSuperAdmin) {
                return res.status(403).json({ error: 'Acesso negado: Você não tem permissão para criar um SuperAdmin.' });
            }
        }

        const passwordHash = await bcrypt.hash(password, 10);
        res.status(201).json(await prisma.user.create({ 
            data: { 
                email, 
                passwordHash, 
                name, 
                restaurantId: targetRestaurantId,
                roleId: roleId || undefined,
                isSuperAdmin: false // Nunca permite criar SuperAdmin via esta rota comum
            } 
        }));
    } catch (error) { 
        console.error("Erro ao criar usuário:", error);
        res.status(500).json({ error: 'Erro ao criar usuário.' }); 
    }
};

const updateUser = async (req, res) => {
    const { id } = req.params;
    const { email, name, password, roleId } = req.body;
    try {
        const isRequesterSuperAdmin = req.user.isSuperAdmin || req.user.role === 'superadmin';
        
        // 1. Busca o usuário que será editado
        const userToUpdate = await prisma.user.findUnique({ 
            where: { id },
            include: { roleRef: true } 
        });

        if (!userToUpdate) return res.status(404).json({ error: 'Usuário não encontrado.' });

        // 2. Proteção: Admin comum não pode editar SuperAdmin
        if (userToUpdate.isSuperAdmin && !isRequesterSuperAdmin) {
            return res.status(403).json({ error: 'Acesso negado: Você não pode editar um SuperAdmin.' });
        }

        // 3. Proteção: Admin comum só edita usuários do seu restaurante
        if (!isRequesterSuperAdmin && userToUpdate.restaurantId !== req.restaurantId) {
            return res.status(403).json({ error: 'Acesso negado: Este usuário pertence a outro restaurante.' });
        }

        // 4. Proteção: Impedir auto-rebaixamento ou auto-atribuição de role (opcional, mas recomendado)
        // Se quiser impedir que o usuário mude o próprio cargo:
        // if (id === req.user.id && roleId && roleId !== userToUpdate.roleId) {
        //     return res.status(403).json({ error: 'Você não pode alterar seu próprio cargo.' });
        // }

        // 5. Proteção: Impedir atribuição de role SuperAdmin por não-SuperAdmin
        if (roleId && !isRequesterSuperAdmin) {
            const roleToAssign = await prisma.role.findUnique({ where: { id: roleId } });
            if (roleToAssign && roleToAssign.isSystem && roleToAssign.name.toLowerCase().includes('superadmin')) {
                return res.status(403).json({ error: 'Acesso negado: Você não pode atribuir este cargo.' });
            }
        }

        const data = { email, name };
        if (password) {
            data.passwordHash = await bcrypt.hash(password, 10);
        }
        if (roleId) {
            data.roleId = roleId;
        }

        const updated = await prisma.user.update({
            where: { id },
            data
        });

        res.json(updated);
    } catch (error) {
        console.error("Erro ao atualizar usuário:", error);
        res.status(500).json({ error: 'Erro ao atualizar usuário.' });
    }
};

const getAvailableRoles = async (req, res) => {
    try {
        const user = req.user;
        const isUserSuperAdmin = user.isSuperAdmin || user.role === 'superadmin';

        // Busca roles do sistema (isSystem: true) ou da franquia do usuário
        const orConditions = [{ isSystem: true }];
        
        if (user.franchiseId) {
            orConditions.push({ franchiseId: user.franchiseId });
        }

        let whereClause = {
            OR: orConditions
        };

        // Filtro Crítico: Se não for SuperAdmin, não pode ver roles de SuperAdmin
        if (!isUserSuperAdmin) {
            whereClause = {
                AND: [
                    whereClause,
                    { 
                        name: { 
                            not: "Super Admin" 
                        } 
                    }
                ]
            };
        }

        const roles = await prisma.role.findMany({
            where: whereClause,
            include: { permissions: true },
            orderBy: { name: 'asc' }
        });
        
        res.json(roles);
    } catch (error) {
        console.error("Erro ao buscar cargos disponíveis:", error);
        res.status(500).json({ error: 'Erro ao buscar cargos.' });
    }
};

module.exports = {
    login,
    getUsers,
    createUser,
    updateUser,
    getAvailableRoles
};
