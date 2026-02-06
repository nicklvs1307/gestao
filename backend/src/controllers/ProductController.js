const prisma = require('../lib/prisma');
const productSchema = require('../schemas/productSchema');

const getProducts = async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            where: { restaurantId: req.restaurantId },
            include: { categories: true, sizes: true, addonGroups: { include: { addons: true } } },
            orderBy: { order: 'asc' },
        });
        res.json(products);
    } catch (error) { res.status(500).json({ error: 'Erro ao buscar produtos.' }); }
};

const getClientProducts = async (req, res) => {
    try { 
        res.json(await prisma.product.findMany({ 
            where: { restaurantId: req.params.restaurantId }, 
            include: { categories: true, sizes: true, addonGroups: { include: { addons: true } } }, 
            orderBy: { order: 'asc' } 
        })); 
    }
    catch (error) { res.status(500).json({ error: 'Erro ao buscar produtos para cliente.' }); }
};

const createProduct = async (req, res) => {
    const { value, error } = productSchema.validate(req.body);
    
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    const { name, price, categoryId, categoryIds, sizes, addonGroups, ingredients, ...rest } = value;
    
    // Normaliza categorias para o novo modelo Muitos-para-Muitos
    const finalCategoryIds = categoryIds || (categoryId ? [categoryId] : []);

    try {
        const newProduct = await prisma.product.create({
            data: {
                ...rest, name, price,
                categories: { connect: finalCategoryIds.map(id => ({ id })) },
                restaurant: { connect: { id: req.restaurantId } },
                sizes: { create: sizes?.map(s => ({ name: s.name, price: s.price })) || [] },
                addonGroups: { 
                    connect: addonGroups?.filter(g => g.id).map(g => ({ id: g.id })) || []
                },
                ingredients: { create: ingredients?.map(i => ({ ingredientId: i.ingredientId, quantity: i.quantity })) || [] }
            },
            include: { categories: true, sizes: true, addonGroups: { include: { addons: true } }, ingredients: true },
        });
        res.status(201).json(newProduct);
    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar produto.' }); 
    }
};

const updateProduct = async (req, res) => {
    const { id } = req.params;
    
    const { value, error } = productSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    const { categoryId, categoryIds, sizes, addonGroups, ingredients, ...productData } = value;
    
    // Preparar dados de categorias
    const categoryUpdate = {};
    if (categoryIds || categoryId) {
        const finalIds = categoryIds || (categoryId ? [categoryId] : []);
        categoryUpdate.set = finalIds.map(id => ({ id }));
    }

    try {
        const updatedProduct = await prisma.product.update({
            where: { id },
            data: {
                ...productData,
                categories: categoryUpdate,
                sizes: { deleteMany: {}, create: sizes?.map(size => ({ name: size.name, price: size.price, order: size.order || 0, saiposIntegrationCode: size.saiposIntegrationCode })) || [] },
                addonGroups: { 
                    set: addonGroups?.filter(g => g.id).map(g => ({ id: g.id })) || []
                },
                ingredients: { deleteMany: {}, create: ingredients?.map(i => ({ ingredientId: i.ingredientId, quantity: i.quantity })) || [] }
            },
            include: { categories: true, sizes: true, addonGroups: { include: { addons: true } }, ingredients: true },
        });
        res.json(updatedProduct);
    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar produto.' }); 
    }
};

const deleteProduct = async (req, res) => {
    try { await prisma.product.delete({ where: { id: req.params.id } }); res.status(204).send(); }
    catch (error) { res.status(500).json({ error: 'Erro ao excluir produto.' }); }
};

const uploadImage = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        const imageUrl = `/uploads/${req.file.filename}`;
        res.json({ imageUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao fazer upload da imagem.' });
    }
};

const getPricingAnalysis = async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            where: { restaurantId: req.restaurantId },
            include: {
                ingredients: {
                    include: {
                        ingredient: true
                    }
                },
                category: true
            }
        });

        const analysis = products.map(product => {
            let totalCost = 0;
            
            // Calcula o custo baseado nos insumos da Ficha Técnica
            product.ingredients.forEach(pi => {
                const cost = (pi.ingredient.lastUnitCost || 0) * pi.quantity;
                totalCost += cost;
            });

            const sellingPrice = product.price;
            const profit = sellingPrice - totalCost;
            const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
            const markup = totalCost > 0 ? (sellingPrice / totalCost) : 0;

            return {
                id: product.id,
                name: product.name,
                category: product.category?.name,
                sellingPrice,
                totalCost,
                profit,
                margin,
                markup,
                isWarning: margin < 60 // Alerta se a margem bruta for menor que 60% (comum em restaurantes)
            };
        });

        res.json(analysis);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao gerar análise de preços.' });
    }
};

module.exports = {
    getProducts,
    getClientProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadImage,
    getPricingAnalysis
};
