const prisma = require('../lib/prisma');

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
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar biblioteca de complementos.' });
    }
};

const createAddonGroup = async (req, res) => {
    const { name, type, isRequired, minQuantity, maxQuantity, order, saiposIntegrationCode, addons } = req.body;
    
    try {
        const newGroup = await prisma.addonGroup.create({
            data: {
                name,
                type: type || 'multiple',
                isRequired: isRequired || false,
                minQuantity: minQuantity || 0,
                maxQuantity: maxQuantity || 1,
                order: order || 0,
                saiposIntegrationCode,
                restaurant: { connect: { id: req.restaurantId } },
                addons: {
                    create: addons?.map(addon => ({
                        name: addon.name,
                        price: addon.price,
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
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar grupo de complementos.' });
    }
};

const updateAddonGroup = async (req, res) => {
    const { id } = req.params;
    const { name, type, isRequired, minQuantity, maxQuantity, order, saiposIntegrationCode, addons } = req.body;

    try {
        // Para manter a integridade, vamos atualizar o grupo e reconstruir os addons
        // (Similar ao padrão que você já usa em produtos, mas agora centralizado aqui)
        const updatedGroup = await prisma.addonGroup.update({
            where: { id },
            data: {
                name,
                type,
                isRequired,
                minQuantity: minQuantity || 0,
                maxQuantity: maxQuantity || 1,
                order,
                saiposIntegrationCode,
                addons: {
                    deleteMany: {},
                    create: addons?.map(addon => ({
                        name: addon.name,
                        price: addon.price,
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
        res.json(updatedGroup);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar grupo de complementos.' });
    }
};

const deleteAddonGroup = async (req, res) => {
    try {
        await prisma.addonGroup.delete({ where: { id: req.params.id } });
        res.status(204).send();
    } catch (error) {
        console.error(error);
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

module.exports = {
    getAddonGroups,
    createAddonGroup,
    updateAddonGroup,
    deleteAddonGroup,
    reorderGroups
};
