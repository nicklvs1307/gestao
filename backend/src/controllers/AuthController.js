const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validatePassword } = require('../utils/passwordValidator');
const { sendPasswordResetEmail } = require('../services/EmailService');

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

/**
 * Busca o ID de um role pelo nome, com mapeamento de aliases (driver -> Entregador, waiter -> Garcom).
 */
const _findRoleId = async (role, roleId) => {
    if (!role || roleId) return roleId;
    
    const foundRole = await prisma.role.findFirst({
        where: {
            OR: [
                { name: { equals: role, mode: 'insensitive' } },
                { name: { equals: role === 'driver' ? 'Entregador' : role === 'waiter' ? 'Garcom' : role, mode: 'insensitive' } }
            ]
        }
    });
    
    return foundRole ? foundRole.id : roleId;
};

/**
 * Verifica se o usuario tem permissao para conceder as permissoes solicitadas.
 * Retorna null se OK, ou um objeto { status, error } em caso de violacao.
 */
const _checkPermissionHierarchy = async (permissionIds, isRequesterSuperAdmin, userPermissions) => {
    if (!permissionIds || permissionIds.length === 0 || isRequesterSuperAdmin) {
        return null;
    }
    
    const requestedPermissions = await prisma.permission.findMany({
        where: { id: { in: permissionIds } }
    });
    const requestedNames = requestedPermissions.map(p => p.name);
    
    const hasAll = requestedNames.every(pName => userPermissions.includes(pName));
    
    if (!hasAll) {
        return { 
            status: 403, 
            error: 'Acesso negado: Voce nao pode conceder permissoes que voce mesmo nao possui.' 
        };
    }
    
    return null;
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
        const finalPermissions = [...new Set([...rolePermissions, ...directPermissions])];

        const normalizedRole = normalizeRole(user.roleRef?.name || null, user.isSuperAdmin);
        
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
        logger.error(error);
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
                isActive: true,
                phone: true,
                paymentType: true,
                baseRate: true,
                bonusPerDelivery: true,
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
        logger.error("Erro ao buscar usuários:", error);
        res.status(500).json({ error: 'Erro ao buscar usuários.' }); 
    }
};

const createUser = async (req, res) => {
    const { email, password, name, roleId, role, permissionIds, phone, isActive, paymentType, baseRate, bonusPerDelivery } = req.body;
    try {
        const isRequesterSuperAdmin = req.user.isSuperAdmin || req.user.role === 'superadmin';
        const targetRestaurantId = isRequesterSuperAdmin ? (req.body.restaurantId || req.restaurantId) : req.restaurantId;

        // --- Mapeamento Automático de Role por Nome ---
        let finalRoleId = await _findRoleId(role, roleId);

        // --- TRAVA DE SEGURANÇA: HIERARQUIA DE PERMISSÕES ---
        const permError = await _checkPermissionHierarchy(permissionIds, isRequesterSuperAdmin, req.user.permissions);
        if (permError) {
            return res.status(permError.status).json({ error: permError.error });
        }

        if (finalRoleId) {
            const roleToAssign = await prisma.role.findUnique({ where: { id: finalRoleId } });
            if (roleToAssign && roleToAssign.isSystem && roleToAssign.name.toLowerCase().includes('superadmin') && !isRequesterSuperAdmin) {
                return res.status(403).json({ error: 'Acesso negado: Você não tem permissão para criar um SuperAdmin.' });
            }
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            return res.status(400).json({ error: passwordError });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({ 
            data: { 
                email, 
                passwordHash, 
                name, 
                phone,
                isActive: isActive === true || isActive === 'true',
                paymentType: paymentType || "DELIVERY",
                baseRate: baseRate !== undefined ? Number(baseRate) : 0,
                bonusPerDelivery: bonusPerDelivery !== undefined ? Number(bonusPerDelivery) : 0,
                restaurantId: targetRestaurantId,
                roleId: finalRoleId || undefined,
                isSuperAdmin: false,
                permissions: permissionIds ? {
                    connect: permissionIds.map(id => ({ id }))
                } : undefined
            } 
        });
        res.status(201).json(newUser);
    } catch (error) { 
        logger.error("Erro ao criar usuário:", error);
        res.status(500).json({ error: 'Erro ao criar usuário.' }); 
    }
};

const updateUser = async (req, res) => {
    const { id } = req.params;
    const { email, name, password, roleId, role, permissionIds, phone, isActive, paymentType, baseRate, bonusPerDelivery } = req.body;
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

        // --- Mapeamento Automático de Role por Nome ---
        let finalRoleId = await _findRoleId(role, roleId === undefined ? undefined : roleId);

        // --- TRAVA DE SEGURANÇA: HIERARQUIA DE PERMISSÕES ---
        const permError = await _checkPermissionHierarchy(permissionIds, isRequesterSuperAdmin, req.user.permissions);
        if (permError) {
            return res.status(permError.status).json({ error: permError.error });
        }

        const data = { 
            email, 
            name,
            phone,
            isActive: isActive === true || isActive === 'true',
            paymentType,
            baseRate: baseRate !== undefined ? Number(baseRate) : undefined,
            bonusPerDelivery: bonusPerDelivery !== undefined ? Number(bonusPerDelivery) : undefined
        };
        
        if (password) {
            const passwordError = validatePassword(password);
            if (passwordError) {
                return res.status(400).json({ error: passwordError });
            }
            data.passwordHash = await bcrypt.hash(password, 10);
        }
        if (finalRoleId !== undefined) {
            data.roleId = finalRoleId;
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
        logger.error("Erro ao atualizar usuário:", error);
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
        logger.error("Erro ao buscar cargos disponíveis:", error);
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
        logger.error("Erro ao deletar usuário:", error);
        res.status(500).json({ error: 'Erro ao deletar usuário.' });
    }
};

const sendResetEmail = async (req, res) => {
    const { userId } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

        const isRequesterSuperAdmin = req.user.isSuperAdmin || req.user.role === 'superadmin';
        if (!isRequesterSuperAdmin && user.restaurantId !== req.restaurantId) {
            return res.status(403).json({ error: 'Acesso negado: Este usuário pertence a outro restaurante.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

        await prisma.user.update({
            where: { id: userId },
            data: { resetToken, resetTokenExpiry }
        });

        await sendPasswordResetEmail(user.email, user.name, resetToken);

        res.json({ message: `Email de redefinição enviado para ${user.email}.` });
    } catch (error) {
        logger.error("Erro ao enviar email de reset:", error);
        res.status(500).json({ error: error.message || 'Erro ao enviar email de redefinição.' });
    }
};

const resetPassword = async (req, res) => {
    const { token, password } = req.body;
    try {
        if (!token) return res.status(400).json({ error: 'Token é obrigatório.' });

        const passwordError = validatePassword(password);
        if (passwordError) return res.status(400).json({ error: passwordError });

        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: { gt: new Date() }
            }
        });

        if (!user) return res.status(400).json({ error: 'Token inválido ou expirado.' });

        const passwordHash = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                resetToken: null,
                resetTokenExpiry: null
            }
        });

        res.json({ message: 'Senha redefinida com sucesso.' });
    } catch (error) {
        logger.error("Erro ao redefinir senha:", error);
        res.status(500).json({ error: 'Erro ao redefinir senha.' });
    }
};

module.exports = {
    login,
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    getAvailableRoles,
    sendResetEmail,
    resetPassword
};
