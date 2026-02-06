const prisma = require('../lib/prisma');

const getCategoriesFlat = async (req, res) => {
    try { res.json(await prisma.category.findMany({ where: { restaurantId: req.restaurantId }, orderBy: { name: 'asc' } })); }
    catch (error) { res.status(500).json({ error: 'Erro ao buscar categorias.' }); }
};

const getCategoriesHierarchy = async (req, res) => {
    try { res.json(await prisma.category.findMany({ where: { restaurantId: req.restaurantId, parentId: null }, include: { subCategories: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } })); }
    catch (error) { res.status(500).json({ error: 'Erro ao buscar categorias.' }); }
};

const getClientCategories = async (req, res) => {
    try { 
        res.json(await prisma.category.findMany({ 
            where: { restaurantId: req.params.restaurantId }, 
            orderBy: { order: 'asc' } 
        })); 
    }
    catch (error) { res.status(500).json({ error: 'Erro ao buscar categorias.' }); }
};

const createCategory = async (req, res) => {
    const { name, parentId } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome obrigatório.' });
    try {
        const data = { name, restaurant: { connect: { id: req.restaurantId } } };
        if (parentId) data.parent = { connect: { id: parentId } };
        res.status(201).json(await prisma.category.create({ data }));
    } catch (error) { res.status(500).json({ error: 'Erro ao criar categoria.' }); }
};

const updateCategory = async (req, res) => {
    try { res.json(await prisma.category.update({ where: { id: req.params.id }, data: req.body })); }
    catch (error) { res.status(500).json({ error: 'Erro ao atualizar categoria.' }); }
};

const deleteCategory = async (req, res) => {
    try { await prisma.category.delete({ where: { id: req.params.id } }); res.status(204).send(); }
    catch (error) { res.status(500).json({ error: 'Erro ao excluir categoria.' }); }
};

const reorderCategories = async (req, res) => {
    const { items } = req.body; // Array de { id, order }
    try {
        await prisma.$transaction(
            items.map(item => 
                prisma.category.update({
                    where: { id: item.id },
                    data: { order: item.order }
                })
            )
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao reordenar categorias:', error);
        res.status(500).json({ error: 'Erro ao reordenar categorias.' });
    }
};

module.exports = {
    getCategoriesFlat,
    getCategoriesHierarchy,
    getClientCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories
};
