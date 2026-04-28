const prisma = require('../lib/prisma');
const logger = require('../config/logger');

const getAddonGroups = async (req, res) => {
    try {
        const groups = await prisma.addonGroup.findMany({
            where: { restaurantId: req.restaurantId },
            include: { 
                addons: {
                    include: {
                        ingredients: {
                            include: { ingredient: true }
                        }
                    }
                },
                products: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { order: 'asc' },
        });
        res.json(groups);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Erro ao buscar biblioteca de complementos.' });
    }
};

const getAddonGroupById = async (req, res) => {
    const { id } = req.params;
    try {
        const group = await prisma.addonGroup.findUnique({
            where: { id },
            include: { 
                addons: {
                    include: {
                        ingredients: {
                            include: { ingredient: true }
                        }
                    },
                    orderBy: { order: 'asc' }
                },
                products: {
                    select: { id: true, name: true }
                }
            }
        });

        if (!group) {
            return res.status(404).json({ error: 'Grupo de complementos não encontrado.' });
        }

        res.json(group);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Erro ao buscar grupo de complementos.' });
    }
};

const createAddonGroup = async (req, res) => {
    const { name, type, isRequired, isFlavorGroup, priceRule, minQuantity, maxQuantity, order, saiposIntegrationCode, addons } = req.body;
    
    try {
        const newGroup = await prisma.addonGroup.create({
            data: {
                name,
                type: type || 'multiple',
                isRequired: isRequired || false,
                isFlavorGroup: isFlavorGroup || false,
                priceRule: priceRule || 'higher',
                minQuantity: minQuantity || 0,
                maxQuantity: maxQuantity || 1,
                order: order || 0,
                saiposIntegrationCode,
                restaurant: { connect: { id: req.restaurantId } },
                addons: {
                    create: addons?.map(addon => ({
                        name: addon.name,
                        description: addon.description,
                        imageUrl: addon.imageUrl,
                        price: addon.price,
                        costPrice: addon.costPrice || 0,
                        promoPrice: addon.promoPrice,
                        promoStartDate: addon.promoStartDate ? new Date(addon.promoStartDate) : null,
                        promoEndDate: addon.promoEndDate ? new Date(addon.promoEndDate) : null,
                        maxQuantity: addon.maxQuantity || 1,
                        order: addon.order || 0,
                        saiposIntegrationCode: addon.saiposIntegrationCode,
                        ingredients: {
                            create: addon.ingredients?.map(ing => ({
                                ingredientId: ing.ingredientId,
                                quantity: ing.quantity
                            })) || []
                        }
                    })) || []
                }
            },
            include: { addons: { include: { ingredients: true } } }
        });
        res.status(201).json(newGroup);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Erro ao criar grupo de complementos.' });
    }
};

const duplicateAddonGroup = async (req, res) => {
    const { id } = req.params;
    try {
        const originalGroup = await prisma.addonGroup.findUnique({
            where: { id },
            include: { 
                addons: {
                    include: { ingredients: true }
                }
            }
        });

        if (!originalGroup) {
            return res.status(404).json({ error: 'Grupo original não encontrado.' });
        }

        const duplicatedGroup = await prisma.addonGroup.create({
            data: {
                name: `${originalGroup.name} (Cópia)`,
                type: originalGroup.type,
                isRequired: originalGroup.isRequired,
                isFlavorGroup: originalGroup.isFlavorGroup,
                priceRule: originalGroup.priceRule || 'higher',
                minQuantity: originalGroup.minQuantity,
                maxQuantity: originalGroup.maxQuantity,
                order: originalGroup.order + 1,
                restaurantId: req.restaurantId,
                addons: {
                    create: originalGroup.addons.map(addon => ({
                        name: addon.name,
                        description: addon.description,
                        imageUrl: addon.imageUrl,
                        price: addon.price,
                        costPrice: addon.costPrice || 0,
                        promoPrice: addon.promoPrice,
                        promoStartDate: addon.promoStartDate,
                        promoEndDate: addon.promoEndDate,
                        maxQuantity: addon.maxQuantity,
                        order: addon.order,
                        saiposIntegrationCode: addon.saiposIntegrationCode,
                        ingredients: {
                            create: addon.ingredients.map(ing => ({
                                ingredientId: ing.ingredientId,
                                quantity: ing.quantity
                            }))
                        }
                    }))
                }
            },
            include: { addons: true }
        });

        res.status(201).json(duplicatedGroup);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Erro ao duplicar grupo de complementos.' });
    }
};

const updateAddonGroup = async (req, res) => {
    const { id } = req.params;
    const { name, type, isRequired, isFlavorGroup, priceRule, minQuantity, maxQuantity, order, saiposIntegrationCode, addons } = req.body;

    try {
        // Buscar addons existentes do grupo
        const existingAddons = await prisma.addon.findMany({
            where: { addonGroupId: id }
        });
        
        const existingAddonIds = new Set(existingAddons.map(a => a.id));
        const newAddonIds = new Set(addons?.filter(a => a.id).map(a => a.id) || []);
        
        // Addons para deletar (existem no DB mas não no payload)
        const addonIdsToDelete = [...existingAddonIds].filter(id => !newAddonIds.has(id));
        
        // Transaction para garantir atomicidade
        const updatedGroup = await prisma.$transaction(async (tx) => {
            // 1. Deletar addons removidos
            if (addonIdsToDelete.length > 0) {
                await tx.addon.deleteMany({
                    where: { id: { in: addonIdsToDelete } }
                });
            }
            
            // 2. Upsert cada addon do payload
            if (addons && addons.length > 0) {
                for (const addon of addons) {
                    const addonData = {
                        name: addon.name,
                        description: addon.description || null,
                        imageUrl: addon.imageUrl || null,
                        price: parseFloat(addon.price) || 0,
                        costPrice: addon.costPrice !== undefined ? parseFloat(addon.costPrice) : 0,
                        promoPrice: addon.promoPrice !== undefined && addon.promoPrice !== null ? parseFloat(addon.promoPrice) : null,
                        promoStartDate: addon.promoStartDate ? new Date(addon.promoStartDate) : null,
                        promoEndDate: addon.promoEndDate ? new Date(addon.promoEndDate) : null,
                        maxQuantity: addon.maxQuantity || 1,
                        order: addon.order || 0,
                        saiposIntegrationCode: addon.saiposIntegrationCode || null,
                    };
                    
                    if (addon.id && existingAddonIds.has(addon.id)) {
                        // UPDATE addon existente
                        await tx.addon.update({
                            where: { id: addon.id },
                            data: addonData
                        });
                        
                        // Upsert ingredients (ficha técnica)
                        await tx.addonIngredient.deleteMany({
                            where: { addonId: addon.id }
                        });
                        if (addon.ingredients && addon.ingredients.length > 0) {
                            await tx.addonIngredient.createMany({
                                data: addon.ingredients.map(ing => ({
                                    addonId: addon.id,
                                    ingredientId: ing.ingredientId,
                                    quantity: parseFloat(ing.quantity) || 0
                                }))
                            });
                        }
                    } else {
                        // CREATE novo addon
                        await tx.addon.create({
                            data: {
                                ...addonData,
                                addonGroup: { connect: { id } },
                                ingredients: addon.ingredients ? {
                                    create: addon.ingredients.map(ing => ({
                                        ingredientId: ing.ingredientId,
                                        quantity: parseFloat(ing.quantity) || 0
                                    }))
                                } : {}
                            }
                        });
                    }
                }
            }
            
            // 3. Atualizar grupo
            return await tx.addonGroup.update({
                where: { id },
                data: {
                    name,
                    type: type || 'multiple',
                    isRequired: isRequired || false,
                    isFlavorGroup: isFlavorGroup || false,
                    priceRule: priceRule || 'higher',
                    minQuantity: minQuantity || 0,
                    maxQuantity: maxQuantity || 1,
                    order: order || 0,
                    saiposIntegrationCode: saiposIntegrationCode || null
                },
                include: { addons: { include: { ingredients: true } } }
            });
        });
        
        res.json(updatedGroup);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Erro ao atualizar grupo de complementos.' });
    }
};

const deleteAddonGroup = async (req, res) => {
    try {
        await prisma.addonGroup.delete({ where: { id: req.params.id } });
        res.status(204).send();
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Erro ao excluir grupo de complementos.' });
    }
};

const reorderGroups = async (req, res) => {
    const { items } = req.body;
    try {
        await prisma.$transaction(
            items.map(item => 
                prisma.addonGroup.update({
                    where: { id: item.id },
                    data: { order: item.order }
                })
            )
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao reordenar grupos.' });
    }
};

const updateAddon = async (req, res) => {
    const { id } = req.params;
    const { name, price, order, maxQuantity, costPrice, promoPrice, promoStartDate, promoEndDate, description, imageUrl, saiposIntegrationCode, ingredients } = req.body;
    
    try {
        const updated = await prisma.addon.update({
            where: { id },
            data: {
                name,
                price: price !== undefined ? parseFloat(price) : undefined,
                costPrice: costPrice !== undefined ? parseFloat(costPrice) : undefined,
                promoPrice: promoPrice !== undefined && promoPrice !== null ? parseFloat(promoPrice) : null,
                promoStartDate: promoStartDate ? new Date(promoStartDate) : null,
                promoEndDate: promoEndDate ? new Date(promoEndDate) : null,
                order: order !== undefined ? parseInt(order) : undefined,
                maxQuantity: maxQuantity !== undefined ? parseInt(maxQuantity) : undefined,
                description,
                imageUrl,
                saiposIntegrationCode
            }
        });
        
        // Upsert ingredients (ficha técnica) se enviado
        if (ingredients !== undefined) {
            await prisma.addonIngredient.deleteMany({ where: { addonId: id } });
            if (ingredients && ingredients.length > 0) {
                await prisma.addonIngredient.createMany({
                    data: ingredients.map(ing => ({
                        addonId: id,
                        ingredientId: ing.ingredientId,
                        quantity: parseFloat(ing.quantity) || 0
                    }))
                });
            }
        }
        
        // Retornar addon atualizado com ingredients
        const addonWithIngredients = await prisma.addon.findUnique({
            where: { id },
            include: { ingredients: { include: { ingredient: true } } }
        });
        
        res.json(addonWithIngredients);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Erro ao atualizar adicional individual.' });
    }
};

module.exports = {
    getAddonGroups,
    getAddonGroupById,
    createAddonGroup,
    duplicateAddonGroup,
    updateAddonGroup,
    deleteAddonGroup,
    reorderGroups,
    updateAddon
};
