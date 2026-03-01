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

const getUairangoSettings = async (req, res) => {
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
        console.error('Erro ao buscar configurações do UaiRango:', error);
        res.status(500).json({ error: 'Erro ao buscar configurações do UaiRango.' });
    }
};

const updateUairangoSettings = async (req, res) => {
    const { uairangoToken, uairangoEstablishmentId, uairangoActive } = req.body;

    try {
        const settings = await prisma.integrationSettings.upsert({
            where: { restaurantId: req.restaurantId },
            update: {
                uairangoToken,
                uairangoEstablishmentId,
                uairangoActive
            },
            create: {
                restaurantId: req.restaurantId,
                uairangoToken,
                uairangoEstablishmentId,
                uairangoActive
            }
        });

        res.json(settings);
    } catch (error) {
        console.error('Erro ao atualizar configurações do UaiRango:', error);
        res.status(500).json({ error: 'Erro ao atualizar configurações do UaiRango.' });
    }
};

const UairangoService = require('../services/uairangoService');

const getSaiposSettings = async (req, res) => {
...
const updateUairangoSettings = async (req, res) => {
...
        res.status(500).json({ error: 'Erro ao atualizar configurações do UaiRango.' });
    }
};

const importUairangoMenu = async (req, res) => {
    try {
        const result = await UairangoService.importMenu(req.restaurantId);
        res.json(result);
    } catch (error) {
        console.error('Erro ao importar cardápio do UaiRango:', error);
        res.status(500).json({ error: error.message || 'Erro ao importar cardápio do UaiRango.' });
    }
};

module.exports = {
    getSaiposSettings,
    updateSaiposSettings,
    getUairangoSettings,
    updateUairangoSettings,
    importUairangoMenu
};
