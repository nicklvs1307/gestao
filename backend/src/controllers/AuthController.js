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
    if (normalized.includes('franqueador') || normalized.includes('franchisor')) return 'franchisor';
    
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
                },
                permissions: true // Permissões diretas
            },
        });
        
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(400).json({ error: 'Credenciais inválidas.' });
        }
        
        // Junta as permissões do Cargo + Permissões Diretas do Usuário
        const rolePermissions = user.roleRef?.permissions?.map(p => p.name) || [];
        const directPermissions = user.permissions?.map(p => p.name) || [];
        const allPermissions = [...new Set([...rolePermissions, ...directPermissions])];

        const normalizedRole = normalizeRole(user.roleRef?.name || null, user.isSuperAdmin);
        
        // Compatibilidade: Se não tem permissões explícitas mas é admin
        let finalPermissions = allPermissions;
        if (finalPermissions.length === 0 && (normalizedRole === 'admin' || user.isSuperAdmin)) {
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
                        permissions: { select: { id: true, name: true } }
                    }
                },
                permissions: {
                    select: { id: true, name: true }
                }
            } 
        });

        const mappedUsers = users.map(u => ({
            ...u,
            role: normalizeRole(u.roleRef?.name || null, u.isSuperAdmin),
            // Mescla permissões para o frontend saber o que o usuário realmente pode fazer
            allPermissions: [...new Set([
                ...(u.roleRef?.permissions?.map(p => p.name) || []),
                ...(u.permissions?.map(p => p.name) || [])
            ])]
        }));

        res.json(mappedUsers); 
    } catch (error) { 
        console.error("Erro ao buscar usuários:", error);
        res.status(500).json({ error: 'Erro ao buscar usuários.' }); 
    }
};

const createUser = async (req, res) => {
    const { email, password, name, roleId, permissionIds } = req.body;
    try {
        const isRequesterSuperAdmin = req.user.isSuperAdmin || req.user.role === 'superadmin';
        const targetRestaurantId = isRequesterSuperAdmin ? (req.body.restaurantId || req.restaurantId) : req.restaurantId;

        // --- TRAVA DE SEGURANÇA: HIERARQUIA DE PERMISSÕES ---
        if (permissionIds && permissionIds.length > 0 && !isRequesterSuperAdmin) {
            const requestedPermissions = await prisma.permission.findMany({
                where: { id: { in: permissionIds } }
            });
            const requestedNames = requestedPermissions.map(p => p.name);
            
            // Verifica se o admin que está criando tem todas essas permissões
            const hasAll = requestedNames.every(pName => req.user.permissions.includes(pName));
            
            if (!hasAll) {
                return res.status(403).json({ 
                    error: 'Acesso negado: Você não pode conceder permissões que você mesmo não possui.' 
                });
            }
        }

        if (roleId) {
            const roleToAssign = await prisma.role.findUnique({ where: { id: roleId } });
            if (roleToAssign && roleToAssign.isSystem && roleToAssign.name.toLowerCase().includes('superadmin') && !isRequesterSuperAdmin) {
                return res.status(403).json({ error: 'Acesso negado: Você não tem permissão para criar um SuperAdmin.' });
            }
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({ 
            data: { 
                email, 
                passwordHash, 
                name, 
                restaurantId: targetRestaurantId,
                roleId: roleId || undefined,
                isSuperAdmin: false,
                permissions: permissionIds ? {
                    connect: permissionIds.map(id => ({ id }))
                } : undefined
            } 
        });
        res.status(201).json(newUser);
    } catch (error) { 
        console.error("Erro ao criar usuário:", error);
        res.status(500).json({ error: 'Erro ao criar usuário.' }); 
    }
};

const updateUser = async (req, res) => {
    const { id } = req.params;
    const { email, name, password, roleId, permissionIds } = req.body;
    try {
        const isRequesterSuperAdmin = req.user.isSuperAdmin || req.user.role === 'superadmin';
        
        const userToUpdate = await prisma.user.findUnique({ 
            where: { id },
            include: { roleRef: true } 
        });

        if (!userToUpdate) return res.status(404).json({ error: 'Usuário não encontrado.' });

        if (userToUpdate.isSuperAdmin && !isRequesterSuperAdmin) {
            return res.status(403).json({ error: 'Acesso negado: Você não pode editar um SuperAdmin.' });
        }

        if (!isRequesterSuperAdmin && userToUpdate.restaurantId !== req.restaurantId) {
            return res.status(403).json({ error: 'Acesso negado: Este usuário pertence a outro restaurante.' });
        }

        // --- TRAVA DE SEGURANÇA: HIERARQUIA DE PERMISSÕES ---
        if (permissionIds && !isRequesterSuperAdmin) {
            const requestedPermissions = await prisma.permission.findMany({
                where: { id: { in: permissionIds } }
            });
            const requestedNames = requestedPermissions.map(p => p.name);
            const hasAll = requestedNames.every(pName => req.user.permissions.includes(pName));
            
            if (!hasAll) {
                return res.status(403).json({ 
                    error: 'Acesso negado: Você não pode conceder permissões que você mesmo não possui.' 
                });
            }
        }

        const data = { email, name };
        if (password) {
            data.passwordHash = await bcrypt.hash(password, 10);
        }
        if (roleId !== undefined) {
            data.roleId = roleId;
        }

        // Atualiza permissões diretas (substitui as antigas pelas novas enviadas)
        if (permissionIds) {
            data.permissions = {
                set: permissionIds.map(pid => ({ id: pid }))
            };
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

const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const isRequesterSuperAdmin = req.user.isSuperAdmin || req.user.role === 'superadmin';
        
        const userToDelete = await prisma.user.findUnique({ where: { id } });
        if (!userToDelete) return res.status(404).json({ error: 'Usuário não encontrado.' });

        // Proteção: Não deletar a si mesmo
        if (userToDelete.id === req.user.id) {
            return res.status(400).json({ error: 'Você não pode excluir sua própria conta.' });
        }

        // Proteção: Admin comum não deleta SuperAdmin
        if (userToDelete.isSuperAdmin && !isRequesterSuperAdmin) {
            return res.status(403).json({ error: 'Acesso negado: Você não pode excluir um SuperAdmin.' });
        }

        // Proteção: Admin comum só deleta do seu restaurante
        if (!isRequesterSuperAdmin && userToDelete.restaurantId !== req.restaurantId) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        await prisma.user.delete({ where: { id } });
        res.json({ message: 'Usuário removido com sucesso.' });
    } catch (error) {
        console.error("Erro ao deletar usuário:", error);
        res.status(500).json({ error: 'Erro ao deletar usuário.' });
    }
};

module.exports = {
    login,
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    getAvailableRoles
};
