const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

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
        
        let permissions = user.roleRef?.permissions.map(p => p.name) || [];
        const roleName = user.roleRef?.name || (user.isSuperAdmin ? 'superadmin' : 'staff');
        
        // Compatibilidade: Se não tem permissões explícitas mas é admin (via RoleRef ou SuperAdmin)
        if (permissions.length === 0 && (roleName === 'admin' || user.isSuperAdmin)) {
            permissions = ['orders:view', 'orders:manage', 'products:manage', 'stock:manage', 'reports:view', 'financial:view', 'settings:manage'];
        }
        
        const tokenData = { 
            id: user.id, 
            email: user.email, 
            role: roleName, 
            restaurantId: user.restaurantId,
            isSuperAdmin: user.isSuperAdmin,
            franchiseId: user.franchiseId,
            permissions
        };

        const token = jwt.sign(tokenData, JWT_SECRET, { expiresIn: '8h' });
        
        res.json({ 
            token, 
            user: { 
                id: user.id, 
                email: user.email, 
                name: user.name, 
                role: roleName, 
                isSuperAdmin: user.isSuperAdmin,
                restaurantId: user.restaurantId,
                franchiseId: user.franchiseId,
                permissions,
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
        
        // Se não for SuperAdmin e não tiver restaurantId, bloqueamos por segurança
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

        // Mapeia para manter o formato esperado pelo frontend (adicionando campo 'role' virtual)
        const mappedUsers = users.map(u => ({
            ...u,
            role: u.roleRef?.name || (u.isSuperAdmin ? 'superadmin' : 'staff')
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
        let whereClause: any = {
            OR: [
                { isSystem: true },
                { franchiseId: user.franchiseId }
            ]
        };

        // Filtro Crítico: Se não for SuperAdmin, não pode ver roles de SuperAdmin
        if (!isUserSuperAdmin) {
            whereClause = {
                AND: [
                    whereClause,
                    { 
                        name: { 
                            not: { 
                                contains: 'superadmin', 
                                mode: 'insensitive' 
                            } 
                        } 
                    }
                ]
            };
        }

        const roles = await prisma.role.findMany({
            where: whereClause,
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
