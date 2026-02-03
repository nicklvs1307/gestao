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
        
        // Compatibilidade com usuários antigos que não tem RoleId mas tem role='admin'
        if (permissions.length === 0 && user.role === 'admin') {
            permissions = ['orders:view', 'orders:manage', 'products:manage', 'stock:manage', 'reports:view', 'financial:view', 'settings:manage'];
        }
        
        const tokenData = { 
            id: user.id, 
            email: user.email, 
            role: user.role, 
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
                role: user.role, 
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
        if (!req.user.isSuperAdmin && !req.restaurantId) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const users = await prisma.user.findMany({ 
            where: whereClause, 
            select: { 
                id: true, 
                email: true, 
                name: true, 
                role: true, 
                isSuperAdmin: true, 
                roleId: true, 
                restaurantId: true,
                roleRef: {
                    include: { permissions: true }
                }
            } 
        });
        res.json(users); 
    } catch (error) { 
        console.error("Erro ao buscar usuários:", error);
        res.status(500).json({ error: 'Erro ao buscar usuários.' }); 
    }
};

const createUser = async (req, res) => {
    const { email, password, role, name, roleId } = req.body;
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        res.status(201).json(await prisma.user.create({ 
            data: { 
                email, 
                passwordHash, 
                role, 
                name, 
                restaurantId: req.restaurantId,
                roleId: roleId || undefined
            } 
        }));
    } catch (error) { 
        res.status(500).json({ error: 'Erro ao criar usuário.' }); 
    }
};

module.exports = {
    login,
    getUsers,
    createUser
};
