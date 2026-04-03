const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validatePassword } = require('../utils/passwordValidator');
const { sendPasswordResetEmail } = require('../services/EmailService');
const { getModulesForPlan } = require('../config/planModules');
const { getPermissionsForModules } = require('../config/modulePermissions');

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
                restaurant: { 
                    include: { 
                        settings: true,
                    } 
                },
                roleRef: {
                    include: { permissions: true }
                },
                permissions: true
            },
        });
        
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(400).json({ error: 'Credenciais inválidas.' });
        }

        if (user.restaurant && user.restaurant.status === 'SUSPENDED') {
            return res.status(403).json({ 
                error: 'Restaurante suspenso. Entre em contato com o suporte.' 
            });
        }

        if (user.restaurant && user.restaurant.expiresAt && new Date(user.restaurant.expiresAt) < new Date()) {
            return res.status(403).json({ 
                error: 'Assinatura expirada. Entre em contato com o suporte.' 
            });
        }
        
        let enabledModules = user.restaurant?.enabledModules;
        if (!enabledModules && user.restaurant?.plan) {
            enabledModules = getModulesForPlan(user.restaurant.plan);
        }
        if (!enabledModules) {
            enabledModules = getModulesForPlan('FREE');
        }

        const modulePermissions = getPermissionsForModules(enabledModules);

        const rolePermissions = user.roleRef?.permissions?.map(p => p.name) || [];
        const directPermissions = user.permissions?.map(p => p.name) || [];
        const allUserPermissions = [...new Set([...rolePermissions, ...directPermissions])];
        
        const finalPermissions = user.isSuperAdmin 
            ? allUserPermissions 
            : allUserPermissions.filter(p => modulePermissions.includes(p));

        const normalizedRole = normalizeRole(user.roleRef?.name || null, user.isSuperAdmin);
        
        const tokenData = { 
            id: user.id, 
            email: user.email, 
            role: normalizedRole, 
            restaurantId: user.restaurantId,
            isSuperAdmin: user.isSuperAdmin,
            franchiseId: user.franchiseId,
            permissions: finalPermissions,
            enabledModules,
            restaurantStatus: user.restaurant?.status || 'ACTIVE',
            plan: user.restaurant?.plan || 'FREE'
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
                enabledModules,
                restaurantStatus: user.restaurant?.status || 'ACTIVE',
                plan: user.restaurant?.plan || 'FREE',
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

        let restaurantModules = req.user.enabledModules || [];
        if (!restaurantModules.length && !isUserSuperAdmin) {
            const restaurant = await prisma.restaurant.findUnique({
                where: { id: req.restaurantId },
                select: { enabledModules: true, plan: true }
            });
            if (restaurant) {
                restaurantModules = restaurant.enabledModules || getModulesForPlan(restaurant.plan);
            }
        }

        const modulePermissions = isUserSuperAdmin ? [] : getPermissionsForModules(restaurantModules);

        const mappedUsers = users.map(u => {
            const rolePerms = u.roleRef?.permissions?.map(p => p.name) || [];
            const directPerms = u.permissions?.map(p => p.name) || [];
            const allPerms = [...new Set([...rolePerms, ...directPerms])];
            
            const filteredPerms = isUserSuperAdmin ? allPerms : allPerms.filter(p => modulePermissions.includes(p));
            
            return {
                ...u,
                role: normalizeRole(u.roleRef?.name || null, u.isSuperAdmin),
                allPermissions: filteredPerms
            };
        });

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

        let finalRoleId = await _findRoleId(role, roleId);

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

        let finalPermissionIds = permissionIds;
        if (!isRequesterSuperAdmin && permissionIds && permissionIds.length > 0 && targetRestaurantId) {
            const restaurant = await prisma.restaurant.findUnique({
                where: { id: targetRestaurantId },
                select: { enabledModules: true, plan: true }
            });
            if (restaurant) {
                const restaurantModules = restaurant.enabledModules || getModulesForPlan(restaurant.plan);
                const allowedPerms = getPermissionsForModules(restaurantModules);
                
                const allPermRecords = await prisma.permission.findMany({
                    where: { id: { in: permissionIds } }
                });
                
                finalPermissionIds = allPermRecords
                    .filter(p => allowedPerms.includes(p.name))
                    .map(p => p.id);
            }
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
                permissions: finalPermissionIds ? {
                    connect: finalPermissionIds.map(id => ({ id }))
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

        let finalRoleId = await _findRoleId(role, roleId === undefined ? undefined : roleId);

        const permError = await _checkPermissionHierarchy(permissionIds, isRequesterSuperAdmin, req.user.permissions);
        if (permError) {
            return res.status(permError.status).json({ error: permError.error });
        }

        if (!isRequesterSuperAdmin && permissionIds && permissionIds.length > 0) {
            const restaurant = await prisma.restaurant.findUnique({
                where: { id: req.restaurantId },
                select: { enabledModules: true, plan: true }
            });
            if (restaurant) {
                const restaurantModules = restaurant.enabledModules || getModulesForPlan(restaurant.plan);
                const allowedPerms = getPermissionsForModules(restaurantModules);
                const invalidPerms = permissionIds.filter(pid => {
                    return true;
                });
            }
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
            data.resetToken = null;
            data.resetTokenExpiry = null;
        }
        if (finalRoleId !== undefined) {
            data.roleId = finalRoleId;
        }

        if (permissionIds) {
            if (!isRequesterSuperAdmin) {
                const restaurant = await prisma.restaurant.findUnique({
                    where: { id: req.restaurantId },
                    select: { enabledModules: true, plan: true }
                });
                if (restaurant) {
                    const restaurantModules = restaurant.enabledModules || getModulesForPlan(restaurant.plan);
                    const allowedPerms = getPermissionsForModules(restaurantModules);
                    
                    const allPermRecords = await prisma.permission.findMany({
                        where: { id: { in: permissionIds } }
                    });
                    
                    const validPermIds = allPermRecords
                        .filter(p => allowedPerms.includes(p.name))
                        .map(p => ({ id: p.id }));
                    
                    data.permissions = {
                        set: validPermIds
                    };
                } else {
                    data.permissions = {
                        set: permissionIds.map(pid => ({ id: pid }))
                    };
                }
            } else {
                data.permissions = {
                    set: permissionIds.map(pid => ({ id: pid }))
                };
            }
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

        const orConditions = [{ isSystem: true }];
        
        if (user.franchiseId) {
            orConditions.push({ franchiseId: user.franchiseId });
        }

        let whereClause = {
            OR: orConditions
        };

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

        if (!isUserSuperAdmin && req.restaurantId) {
            const restaurant = await prisma.restaurant.findUnique({
                where: { id: req.restaurantId },
                select: { enabledModules: true, plan: true }
            });
            if (restaurant) {
                const restaurantModules = restaurant.enabledModules || getModulesForPlan(restaurant.plan);
                const allowedPerms = getPermissionsForModules(restaurantModules);
                
                const filteredRoles = roles.map(role => ({
                    ...role,
                    permissions: role.permissions.filter(p => allowedPerms.includes(p.name))
                }));
                
                return res.json(filteredRoles);
            }
        }
        
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
        const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        await prisma.user.update({
            where: { id: userId },
            data: { resetToken: hashedToken, resetTokenExpiry }
        });

        try {
            await sendPasswordResetEmail(user.email, user.name, resetToken);
        } catch (emailError) {
            await prisma.user.update({
                where: { id: userId },
                data: { resetToken: null, resetTokenExpiry: null }
            });
            throw emailError;
        }

        logger.info(`[AUDIT] Reset email enviado para usuário ${user.id} (${user.email}) por ${req.user.id}`);

        res.json({ message: `Email de redefinição enviado para ${user.email}.` });
    } catch (error) {
        logger.error("Erro ao enviar email de reset:", error);
        res.status(500).json({ error: error.message || 'Erro ao enviar email de redefinição.' });
    }
};

const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        if (!email) return res.status(400).json({ error: 'Email é obrigatório.' });

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.json({ message: 'Se o email estiver cadastrado, você receberá um link de redefinição.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        await prisma.user.update({
            where: { id: user.id },
            data: { resetToken: hashedToken, resetTokenExpiry }
        });

        try {
            await sendPasswordResetEmail(user.email, user.name, resetToken);
            logger.info(`[AUDIT] Reset self-service solicitado para ${user.email}`);
        } catch (emailError) {
            await prisma.user.update({
                where: { id: user.id },
                data: { resetToken: null, resetTokenExpiry: null }
            });
            throw emailError;
        }

        res.json({ message: 'Se o email estiver cadastrado, você receberá um link de redefinição.' });
    } catch (error) {
        logger.error("Erro no forgot-password:", error);
        res.status(500).json({ error: error.message || 'Erro ao processar solicitação.' });
    }
};

const resetPassword = async (req, res) => {
    const { token, password } = req.body;
    try {
        if (!token) return res.status(400).json({ error: 'Token é obrigatório.' });

        const passwordError = validatePassword(password);
        if (passwordError) return res.status(400).json({ error: passwordError });

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await prisma.user.findFirst({
            where: {
                resetToken: hashedToken,
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

        logger.info(`[AUDIT] Senha redefinida com sucesso para usuário ${user.id} (${user.email})`);

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
    forgotPassword,
    resetPassword
};
