const prisma = require('../lib/prisma');

const getActivePromotions = async (req, res) => {
    try {
        const now = new Date();
        
        // Ajuste Final de Fuso Horário:
        // Criamos uma data baseada em UTC Zero horas de hoje.
        // Isso garante que se o banco tem "2026-01-26T00:00:00Z", e compararmos com "2026-01-26T00:00:00Z", 
        // a condição (>=) passa, mantendo a promoção ativa no dia do vencimento.
        const startOfTodayUTC = new Date();
        startOfTodayUTC.setUTCHours(0, 0, 0, 0);

        const promotions = await prisma.promotion.findMany({
            where: {
                restaurantId: req.params.restaurantId,
                isActive: true,
                startDate: { lte: now },             // Já começou
                endDate: { gte: startOfTodayUTC }    // Termina hoje (UTC) ou no futuro
            },
            include: { 
                product: {
                    include: {
                        promotions: {
                            where: { isActive: true }
                        }
                    }
                } 
            },
            orderBy: { createdAt: 'desc' }
        });
        
        res.json(promotions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar promoções.' });
    }
};

const getAllPromotions = async (req, res) => {
    try { 
        res.json(await prisma.promotion.findMany({ 
            where: { restaurantId: req.restaurantId }, 
            include: { product: true }, 
            orderBy: { startDate: 'desc' } 
        })); 
    } catch (error) { 
        res.status(500).json({ error: 'Erro ao buscar promoções.' }); 
    }
};

const createPromotion = async (req, res) => {
    const { name, discountType, discountValue, startDate, endDate, isActive, productId, code, minOrderValue, usageLimit } = req.body;
    try {
        // Garantir que endDate capture o dia inteiro se vier zerado do front
        let end = new Date(endDate);
        if (end.getHours() === 0 && end.getMinutes() === 0) {
            end.setHours(23, 59, 59, 999);
        }

        const data = { 
            name, 
            discountType, 
            discountValue, 
            startDate: new Date(startDate), 
            endDate: end, 
            isActive, 
            code: code ? code.toUpperCase() : null,
            minOrderValue: parseFloat(minOrderValue || 0),
            usageLimit: usageLimit ? parseInt(usageLimit) : null,
            restaurant: { connect: { id: req.restaurantId || req.body.restaurantId } } 
        };
        if (productId) data.product = { connect: { id: productId } };
        
        res.status(201).json(await prisma.promotion.create({ data, include: { product: true } }));
    } catch (error) { 
        console.error(error);
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

module.exports = {
    getActivePromotions,
    getAllPromotions,
    createPromotion,
    validateCoupon
};
