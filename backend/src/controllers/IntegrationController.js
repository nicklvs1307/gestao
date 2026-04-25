const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const UairangoService = require('../services/UairangoService');
const SaiposImportService = require('../services/SaiposImportService');
const IfoodOrderService = require('../services/IfoodOrderService');

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
        logger.error('Erro ao buscar configurações da Saipos:', error);
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
        logger.error('Erro ao atualizar configurações da Saipos:', error);
        res.status(500).json({ error: 'Erro ao atualizar configurações da Saipos.' });
    }
};

const importSaiposMenu = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Por favor, envie um arquivo Excel (.xlsx).' });
        }
        const result = await SaiposImportService.importFromExcel(req.restaurantId, req.file.buffer);
        res.json(result);
    } catch (error) {
        logger.error('Erro ao importar cardápio da Saipos:', error);
        res.status(500).json({ error: error.message || 'Erro ao importar cardápio da Saipos.' });
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
        logger.error('Erro ao buscar configurações do UaiRango:', error);
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
        logger.error('Erro ao atualizar configurações do UaiRango:', error);
        res.status(500).json({ error: 'Erro ao atualizar configurações do UaiRango.' });
    }
};

const importUairangoMenu = async (req, res) => {
    try {
        const result = await UairangoService.importMenu(req.restaurantId);
        res.json(result);
    } catch (error) {
        logger.error('Erro ao importar cardápio do UaiRango:', error);
        res.status(500).json({ error: error.message || 'Erro ao importar cardápio do UaiRango.' });
    }
};

const getIfoodSettings = async (req, res) => {
    try {
        let settings = await prisma.integrationSettings.findUnique({
            where: { restaurantId: req.restaurantId }
        });

        if (!settings) {
            settings = await prisma.integrationSettings.create({
                data: { restaurantId: req.restaurantId }
            });
        }

        const safeSettings = {
            ...settings,
            ifoodClientSecret: settings.ifoodClientSecret ? '********' : null,
            ifoodWebhookSigningKey: settings.ifoodWebhookSigningKey ? '********' : null
        };

        res.json(safeSettings);
    } catch (error) {
        logger.error('Erro ao buscar configurações do iFood:', error);
        res.status(500).json({ error: 'Erro ao buscar configurações do iFood.' });
    }
};

const updateIfoodSettings = async (req, res) => {
    const { ifoodClientId, ifoodClientSecret, ifoodRestaurantId, ifoodIntegrationActive, ifoodEnv, ifoodWebhookSigningKey } = req.body;

    try {
        const updateData = {
            ifoodClientId,
            ifoodRestaurantId,
            ifoodIntegrationActive,
            ifoodEnv
        };

        if (ifoodClientSecret && ifoodClientSecret !== '********') {
            updateData.ifoodClientSecret = ifoodClientSecret;
        }

        if (ifoodWebhookSigningKey && ifoodWebhookSigningKey !== '********') {
            updateData.ifoodWebhookSigningKey = ifoodWebhookSigningKey;
        }

        const settings = await prisma.integrationSettings.upsert({
            where: { restaurantId: req.restaurantId },
            update: updateData,
            create: {
                restaurantId: req.restaurantId,
                ...updateData
            }
        });

        const safeSettings = {
            ...settings,
            ifoodClientSecret: settings.ifoodClientSecret ? '********' : null,
            ifoodWebhookSigningKey: settings.ifoodWebhookSigningKey ? '********' : null
        };

        res.json(safeSettings);
    } catch (error) {
        logger.error('Erro ao atualizar configurações do iFood:', error);
        res.status(500).json({ error: 'Erro ao atualizar configurações do iFood.' });
    }
};

const ifoodWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-ifood-signature'] || req.headers['ifood-signature'];
        const { events } = req.body;

        if (!events || !Array.isArray(events)) {
            logger.warn('[IFOOD] Webhook sem eventos');
            return res.status(400).json({ error: 'Eventos inválidos' });
        }

        for (const eventData of events) {
            const orderId = eventData.orderId || eventData.metadata?.id;
            
            if (!orderId) {
                continue;
            }

            const restaurantId = req.restaurantId;

            if (!restaurantId) {
                logger.warn('[IFOOD] Restaurant ID não fornecido no webhook');
                continue;
            }

            await IfoodOrderService.processWebhookEvent(restaurantId, eventData);
        }

        res.status(200).json({ acknowledged: true });
    } catch (error) {
        logger.error('[IFOOD] Erro ao processar webhook:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
};

const confirmIfoodOrder = async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: 'orderId é obrigatório' });
        }

        const result = await IfoodOrderService.confirmOrder(orderId, req.restaurantId);
        res.json(result);
    } catch (error) {
        logger.error('[IFOOD] Erro ao confirmar pedido:', error);
        res.status(500).json({ error: error.message || 'Erro ao confirmar pedido' });
    }
};

const rejectIfoodOrder = async (req, res) => {
    try {
        const { orderId, reason } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: 'orderId é obrigatório' });
        }

        const result = await IfoodOrderService.rejectOrder(orderId, req.restaurantId, reason);
        res.json(result);
    } catch (error) {
        logger.error('[IFOOD] Erro ao rejeitar pedido:', error);
        res.status(500).json({ error: error.message || 'Erro ao rejeitar pedido' });
    }
};

const startIfoodPreparation = async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: 'orderId é obrigatório' });
        }

        const result = await IfoodOrderService.startPreparation(orderId, req.restaurantId);
        res.json(result);
    } catch (error) {
        logger.error('[IFOOD] Erro ao iniciar preparação:', error);
        res.status(500).json({ error: error.message || 'Erro ao iniciar preparação' });
    }
};

const markIfoodReady = async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: 'orderId é obrigatório' });
        }

        const result = await IfoodOrderService.markReady(orderId, req.restaurantId);
        res.json(result);
    } catch (error) {
        logger.error('[IFOOD] Erro ao marcar pronto:', error);
        res.status(500).json({ error: error.message || 'Erro ao marcar pronto' });
    }
};

module.exports = {
    getSaiposSettings,
    updateSaiposSettings,
    importSaiposMenu,
    getUairangoSettings,
    updateUairangoSettings,
    importUairangoMenu,
    getIfoodSettings,
    updateIfoodSettings,
    ifoodWebhook,
    confirmIfoodOrder,
    rejectIfoodOrder,
    startIfoodPreparation,
    markIfoodReady
};
