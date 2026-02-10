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
        const passwordHash = await bcrypt.hash(password, 10);
        res.status(201).json(await prisma.user.create({ 
            data: { 
                email, 
                passwordHash, 
                name, 
                restaurantId: req.restaurantId,
                roleId: roleId || undefined
            } 
        }));
    } catch (error) { 
        console.error("Erro ao criar usuário:", error);
        res.status(500).json({ error: 'Erro ao criar usuário.' }); 
    }
};

const getAvailableRoles = async (req, res) => {
    try {
        const user = req.user;
        // Busca roles do sistema (isSystem: true) ou da franquia do usuário
        const whereClause = {
            OR: [
                { isSystem: true },
                { franchiseId: user.franchiseId }
            ]
        };

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
    getAvailableRoles
};
