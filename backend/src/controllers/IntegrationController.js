const prisma = require('../lib/prisma');

const getSaiposSettings = async (req, res) => {
    try {
        let settings = await prisma.integrationSettings.findUnique({
            where: { restaurantId: req.restaurantId }
        });

        if (!settings) {
            settings = await prisma.integrationSettings.create({
                data: { restaurantId: req.restaurantId }
            });
        }

        res.json(settings);
    } catch (error) {
        console.error('Erro ao buscar configurações da Saipos:', error);
        res.status(500).json({ error: 'Erro ao buscar configurações da Saipos.' });
    }
};

const updateSaiposSettings = async (req, res) => {
    const { saiposPartnerId, saiposSecret, saiposCodStore, saiposIntegrationActive, saiposEnv } = req.body;

    try {
        const settings = await prisma.integrationSettings.upsert({
            where: { restaurantId: req.restaurantId },
            update: {
                saiposPartnerId,
                saiposSecret,
                saiposCodStore,
                saiposIntegrationActive,
                saiposEnv
            },
            create: {
                restaurantId: req.restaurantId,
                saiposPartnerId,
                saiposSecret,
                saiposCodStore,
                saiposIntegrationActive,
                saiposEnv
            }
        });

        res.json(settings);
    } catch (error) {
        console.error('Erro ao atualizar configurações da Saipos:', error);
        res.status(500).json({ error: 'Erro ao atualizar configurações da Saipos.' });
    }
};

module.exports = {
    getSaiposSettings,
    updateSaiposSettings
};
