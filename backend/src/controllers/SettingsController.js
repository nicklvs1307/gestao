const prisma = require('../lib/prisma');

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

const getSettings = async (req, res) => {
    try {
        if (!req.restaurantId) {
            return res.status(404).json({ error: 'Nenhum restaurante selecionado.' });
        }

        const restaurant = await prisma.restaurant.findUnique({ 
            where: { id: req.restaurantId }, 
            include: { 
                settings: true,
                fiscalConfig: true
            } 
        });
        
        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurante não encontrado.' });
        }

        if (!restaurant.settings) {
            restaurant.settings = await prisma.restaurantSettings.create({ 
                data: { restaurantId: req.restaurantId } 
            });
        }
        res.json(restaurant);
    } catch (error) { 
        res.status(500).json({ error: 'Erro ao buscar configurações.' }); 
    }
};

const updateSettings = async (req, res) => {
    const { 
        name, slug, address, phone, serviceTaxPercentage, openingHours,
        primaryColor, secondaryColor, backgroundColor, backgroundType, 
        backgroundImageUrl, isOpen, deliveryFee, deliveryTime, autoAcceptOrders,
        welcomeMessage, menuUrl, allowTakeaway
    } = req.body;

    try {
        // Validação de Slug Personalizada
        let finalSlug = slug ? slugify(slug) : undefined;
        
        if (finalSlug) {
            const existingSlug = await prisma.restaurant.findFirst({
                where: { 
                    slug: finalSlug,
                    NOT: { id: req.restaurantId }
                }
            });

            if (existingSlug) {
                return res.status(400).json({ error: 'Este endereço (slug) já está em uso por outro restaurante.' });
            }
        } else if (name) {
            // Se mudar o nome e não enviar slug, gera uma nova (opcional, pode-se preferir manter a antiga)
            // Para evitar quebrar links, só geramos se o restaurante não tiver uma slug ainda
            const current = await prisma.restaurant.findUnique({ where: { id: req.restaurantId } });
            if (!current.slug) {
                finalSlug = slugify(name);
            }
        }

        const [updatedRest, updatedSettings] = await prisma.$transaction([
            prisma.restaurant.update({ 
                where: { id: req.restaurantId }, 
                data: { 
                    name, 
                    address, 
                    phone, 
                    serviceTaxPercentage: serviceTaxPercentage !== undefined ? parseFloat(serviceTaxPercentage) : undefined,
                    openingHours,
                    slug: finalSlug 
                } 
            }),
            prisma.restaurantSettings.update({ 
                where: { restaurantId: req.restaurantId }, 
                data: {
                    primaryColor,
                    secondaryColor,
                    backgroundColor,
                    backgroundType,
                    backgroundImageUrl,
                    isOpen,
                    deliveryFee: deliveryFee !== undefined ? parseFloat(deliveryFee) : undefined,
                    deliveryTime,
                    autoAcceptOrders,
                    welcomeMessage,
                    menuUrl,
                    allowTakeaway
                } 
            })
        ]);
        res.json({ ...updatedRest, settings: updatedSettings });
    } catch (error) { 
        console.error('Erro ao atualizar configurações:', error);
        res.status(500).json({ error: 'Erro ao atualizar.' }); 
    }
};

const checkSlugAvailability = async (req, res) => {
    try {
        const { slug } = req.query;
        if (!slug) return res.status(400).json({ error: 'Slug não fornecida.' });

        const formattedSlug = slugify(slug);
        const existing = await prisma.restaurant.findFirst({
            where: { 
                slug: formattedSlug,
                NOT: { id: req.restaurantId } // Ignora o próprio restaurante se já estiver logado
            }
        });

        res.json({ 
            available: !existing,
            formattedSlug 
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao verificar disponibilidade.' });
    }
};

const getClientSettings = async (req, res) => {
    try {
        const restaurant = await prisma.restaurant.findUnique({
            where: { id: req.params.restaurantId },
            include: { settings: true }
        });
        if (!restaurant) return res.status(404).json({ error: "Restaurante não encontrado" });
        
        res.json({
            ...restaurant.settings,
            restaurantName: restaurant.name,
            restaurantLogo: restaurant.logoUrl,
            restaurantPhone: restaurant.phone,
            restaurantAddress: restaurant.address,
            serviceTax: restaurant.serviceTaxPercentage
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar configurações do cliente.' });
    }
};

const updateLogo = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        
        const logoUrl = `/uploads/${req.file.filename}`;
        
        await prisma.restaurant.update({
            where: { id: req.restaurantId },
            data: { logoUrl }
        });
        
        res.json({ logoUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao fazer upload da logo.' });
    }
};

const toggleStatus = async (req, res) => {
    const { isOpen } = req.body;
    try {
        const updatedSettings = await prisma.restaurantSettings.update({
            where: { restaurantId: req.restaurantId },
            data: { isOpen }
        });
        res.json(updatedSettings);
    } catch (error) {
        console.error("Erro ao alternar status da loja:", error);
        res.status(500).json({ error: "Erro ao alternar status." });
    }
};

const getRestaurantBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const restaurant = await prisma.restaurant.findUnique({
            where: { slug },
            include: { 
                settings: true,
                categories: {
                    include: {
                        products: {
                            where: { isAvailable: true },
                            include: {
                                sizes: true,
                                addonGroups: {
                                    include: {
                                        addons: true
                                    }
                                }
                            },
                            orderBy: { order: 'asc' }
                        }
                    },
                    orderBy: { order: 'asc' }
                }
            }
        });
        
        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurante não encontrado.' });
        }
        
        res.json(restaurant);
    } catch (error) {
        console.error('Erro ao buscar restaurante por slug:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

module.exports = {
    getSettings,
    updateSettings,
    getClientSettings,
    updateLogo,
    toggleStatus,
    getRestaurantBySlug,
    checkSlugAvailability
};
