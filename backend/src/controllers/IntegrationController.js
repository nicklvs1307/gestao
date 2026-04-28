const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const UairangoService = require('../services/UairangoService');
const UairangoOrderService = require('../services/UairangoOrderService');
const SaiposImportService = require('../services/SaiposImportService');
const IfoodOrderService = require('../services/IfoodOrderService');
const IfoodAuthService = require('../services/IfoodAuthService');
// Webhook handler removido - integração iFood agora usa polling (IfoodPollingService)

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

        const credentialsConfigured = !!(process.env.IFOOD_CLIENT_ID && process.env.IFOOD_CLIENT_SECRET);

        res.json({
            ...settings,
            ifoodCredentialsConfigured: credentialsConfigured
        });
    } catch (error) {
        logger.error('Erro ao buscar configurações do iFood:', error);
        res.status(500).json({ error: 'Erro ao buscar configurações do iFood.' });
    }
};

const updateIfoodSettings = async (req, res) => {
    const { ifoodMerchantId, ifoodIntegrationActive, ifoodEnv } = req.body;

    try {
        const updateData = {
            ifoodMerchantId,
            ifoodIntegrationActive,
            ifoodEnv
        };

        const settings = await prisma.integrationSettings.upsert({
            where: { restaurantId: req.restaurantId },
            update: updateData,
            create: {
                restaurantId: req.restaurantId,
                ...updateData
            }
        });

        const credentialsConfigured = !!(process.env.IFOOD_CLIENT_ID && process.env.IFOOD_CLIENT_SECRET);

        res.json({
            ...settings,
            ifoodCredentialsConfigured: credentialsConfigured
        });
    } catch (error) {
        logger.error('Erro ao atualizar configurações do iFood:', error);
        res.status(500).json({ error: 'Erro ao atualizar configurações do iFood.' });
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

const getIfoodConnectionStatus = async (req, res) => {
    try {
        const status = await IfoodAuthService.checkConnectionStatus();
        res.json(status);
    } catch (error) {
        logger.error('[IFOOD] Erro ao verificar status:', error);
        res.status(500).json({ error: error.message || 'Erro ao verificar status' });
    }
};

const confirmUairangoOrder = async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: 'orderId é obrigatório' });
        }

        const result = await UairangoOrderService.confirmOrder(orderId, req.restaurantId);
        res.json(result);
    } catch (error) {
        logger.error('[UAIRANGO] Erro ao confirmar pedido:', error);
        res.status(500).json({ error: error.message || 'Erro ao confirmar pedido' });
    }
};

const rejectUairangoOrder = async (req, res) => {
    try {
        const { orderId, reason } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: 'orderId é obrigatório' });
        }

        const result = await UairangoOrderService.rejectOrder(orderId, req.restaurantId, reason);
        res.json(result);
    } catch (error) {
        logger.error('[UAIRANGO] Erro ao rejeitar pedido:', error);
        res.status(500).json({ error: error.message || 'Erro ao rejeitar pedido' });
    }
};

const markUairangoReady = async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: 'orderId é obrigatório' });
        }

        const result = await UairangoOrderService.markReady(orderId, req.restaurantId);
        res.json(result);
    } catch (error) {
        logger.error('[UAIRANGO] Erro ao marcar pronto:', error);
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
    confirmIfoodOrder,
    rejectIfoodOrder,
    startIfoodPreparation,
    markIfoodReady,
    initiateIfoodLink,
    completeIfoodLink,
    disconnectIfood,
    getIfoodConnectionStatus,
    confirmUairangoOrder,
    rejectUairangoOrder,
    markUairangoReady
};
