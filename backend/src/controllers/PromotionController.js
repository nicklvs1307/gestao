const { applyAddonGroupOrder } = require('../utils/productUtils');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');

const getActivePromotions = async (req, res) => {
    try {
        const now = new Date();
        const startOfTodayUTC = new Date();
        startOfTodayUTC.setUTCHours(0, 0, 0, 0);

        const promotions = await prisma.promotion.findMany({
            where: {
                restaurantId: req.params.restaurantId,
                isActive: true,
                startDate: { lte: now },
                endDate: { gte: startOfTodayUTC }
            },
            include: { 
                product: {
                    include: {
                        sizes: { orderBy: { order: 'asc' } },
                        addonGroups: {
                            orderBy: { order: 'asc' },
                            include: {
                                addons: { orderBy: { order: 'asc' } }
                            }
                        },
                        categories: {
                            include: {
                                addonGroups: {
                                    orderBy: { order: 'asc' },
                                    include: {
                                        addons: { orderBy: { order: 'asc' } }
                                    }
                                }
                            }
                        },
                        promotions: {
                            where: { isActive: true }
                        }
                    }
                } 
            },
            orderBy: { createdAt: 'desc' }
        });

        const sortedPromotions = promotions.map(promo => {
            if (promo.product) {
                applyAddonGroupOrder(promo.product);
            }
            return promo;
        });
        
        res.json(sortedPromotions);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Erro ao buscar promoções.' });
    }
};

const getAllPromotions = async (req, res) => {
    try { 
        res.json(await prisma.promotion.findMany({ 
            where: { restaurantId: req.restaurantId }, 
            include: { 
                product: { select: { id: true, name: true, imageUrl: true } },
                addon: { select: { id: true, name: true } },
                category: { select: { id: true, name: true } }
            }, 
            orderBy: { startDate: 'desc' } 
        })); 
    } catch (error) { 
        logger.error(error);
        res.status(500).json({ error: 'Erro ao buscar promoções.' }); 
    }
};

const createPromotion = async (req, res) => {
    const { name, description, discountType, discountValue, startDate, endDate, isActive, productId, addonId, categoryId, code, minOrderValue, usageLimit } = req.body;
    try {
        let end = new Date(endDate);
        if (end.getHours() === 0 && end.getMinutes() === 0) {
            end.setHours(23, 59, 59, 999);
        }

        const data = { 
            name, 
            description,
            discountType, 
            discountValue: parseFloat(discountValue), 
            startDate: new Date(startDate), 
            endDate: end, 
            isActive, 
            code: code ? code.toUpperCase() : null,
            minOrderValue: parseFloat(minOrderValue || 0),
            usageLimit: usageLimit ? parseInt(usageLimit) : null,
            restaurant: { connect: { id: req.restaurantId } },
            addonId: addonId || null,
            categoryId: categoryId || null
        };
        if (productId) data.product = { connect: { id: productId } };
        
        const promotion = await prisma.promotion.create({ 
            data, 
            include: { 
                product: true,
                addon: true,
                category: true
            } 
        });
        res.status(201).json(promotion);
    } catch (error) { 
        logger.error(error);
        res.status(500).json({ error: 'Erro ao criar promoção.' }); 
    }
};

const validateCoupon = async (req, res) => {
    const { code, cartTotal, restaurantId } = req.body;
    try {
        const promotion = await prisma.promotion.findFirst({
            where: {
                restaurantId,
                code: code.toUpperCase(),
                isActive: true,
                startDate: { lte: new Date() },
                endDate: { gte: new Date() }
            }
        });

        if (!promotion) return res.status(404).json({ error: 'Cupom inválido ou expirado.' });
        if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) return res.status(400).json({ error: 'Limite de uso do cupom atingido.' });
        if (cartTotal < (promotion.minOrderValue || 0)) return res.status(400).json({ error: `Valor mínimo para este cupom é R$ ${promotion.minOrderValue.toFixed(2)}` });

        res.json(promotion);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao validar cupom.' });
    }
};

const updatePromotion = async (req, res) => {
    const { id } = req.params;
    const { name, description, discountType, discountValue, startDate, endDate, isActive, productId, addonId, categoryId, code, minOrderValue, usageLimit } = req.body;
    try {
        let end = new Date(endDate);
        if (end.getHours() === 0 && end.getMinutes() === 0) {
            end.setHours(23, 59, 59, 999);
        }

        const data = { 
            name, 
            description,
            discountType, 
            discountValue: parseFloat(discountValue), 
            startDate: new Date(startDate), 
            endDate: end, 
            isActive,
            code: code ? code.toUpperCase() : null,
            minOrderValue: parseFloat(minOrderValue || 0),
            usageLimit: usageLimit ? parseInt(usageLimit) : null,
            addonId: addonId || null,
            categoryId: categoryId || null
        };

        if (productId) {
            data.product = { connect: { id: productId } };
        } else {
            data.productId = null;
        }

        const updated = await prisma.promotion.update({
            where: { id },
            data,
            include: { 
                product: true,
                addon: true,
                category: true
            }
        });
        res.json(updated);
    } catch (error) {
        logger.error("Erro ao atualizar promoção:", error);
        res.status(500).json({ error: 'Erro ao atualizar promoção.' });
    }
};

const deletePromotion = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.promotion.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir promoção.' });
    }
};

module.exports = {
    getActivePromotions,
    getAllPromotions,
    createPromotion,
    validateCoupon,
    updatePromotion,
    deletePromotion
};
