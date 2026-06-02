const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const UairangoService = require('../services/UairangoService');
const UairangoOrderService = require('../services/UairangoOrderService');
const UairangoMerchantService = require('../services/UairangoMerchantService');
const SaiposImportService = require('../services/SaiposImportService');
const IfoodOrderService = require('../services/IfoodOrderService');
const IfoodAuthService = require('../services/IfoodAuthService');
// Webhook handler: iFood usa webhook como fonte primária de eventos

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
  const { uairangoEstablishmentId, uairangoActive, uairangoEnv, uairangoAutoAcceptOrders } = req.body;

  try {
    const settings = await prisma.integrationSettings.upsert({
      where: { restaurantId: req.restaurantId },
      update: {
        uairangoEstablishmentId,
        uairangoActive,
        uairangoEnv,
        uairangoAutoAcceptOrders,
      },
      create: {
        restaurantId: req.restaurantId,
        uairangoEstablishmentId,
        uairangoActive,
        uairangoEnv,
        uairangoAutoAcceptOrders,
      }
    });

    res.json(settings);

    if (uairangoActive !== undefined) {
      const UairangoPollingService = require('../services/UairangoPollingService');
      await UairangoPollingService.restartIfNeeded();
    }
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

const getUairangoConnectionStatus = async (req, res) => {
    try {
        const status = await UairangoMerchantService.getConnectionStatus(req.restaurantId);
        res.json(status);
    } catch (error) {
        logger.error('[UAIRANGO] Erro ao verificar status da conexão:', error);
        res.status(500).json({ error: error.message || 'Erro ao verificar status da conexão' });
    }
};

const updateUairangoMerchantStatus = async (req, res) => {
    try {
        const { status, operations } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'status é obrigatório (AVAILABLE ou UNAVAILABLE)' });
        }

        const result = await UairangoMerchantService.updateMerchantStatus(req.restaurantId, status, operations);
        res.json(result);
    } catch (error) {
        logger.error('[UAIRANGO] Erro ao atualizar status da loja:', error);
        res.status(500).json({ error: error.message || 'Erro ao atualizar status da loja' });
    }
};

    const dispatchUairangoOrder = async (req, res) => {
        try {
            const { orderId } = req.body;

            if (!orderId) {
                return res.status(400).json({ error: 'orderId é obrigatório' });
            }

            const order = await prisma.order.findUnique({ where: { id: orderId } });
            if (!order || order.restaurantId !== req.restaurantId) {
                return res.status(403).json({ error: 'Pedido não pertence a este restaurante' });
            }

            await UairangoOrderService.dispatchOrder(req.restaurantId, order.uairangoOrderId);

            await prisma.order.update({
                where: { id: orderId },
                data: { status: 'SHIPPED', shippedAt: new Date() }
            });

            res.json({ success: true });
        } catch (error) {
            logger.error('[UAIRANGO] Erro ao despachar pedido:', error);
            res.status(500).json({ error: error.message || 'Erro ao despachar pedido' });
        }
    };

const startUairangoPreparation = async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: 'orderId é obrigatório' });
        }

        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order || order.restaurantId !== req.restaurantId) {
            return res.status(403).json({ error: 'Pedido não pertence a este restaurante' });
        }

        await UairangoOrderService.confirmOrder(req.restaurantId, order.uairangoOrderId);

        await prisma.order.update({
            where: { id: orderId },
            data: { status: 'PREPARING', preparingAt: new Date() }
        });

        res.json({ success: true });
    } catch (error) {
        logger.error('[UAIRANGO] Erro ao iniciar preparação:', error);
        res.status(500).json({ error: error.message || 'Erro ao iniciar preparação' });
    }
};

const getUairangoCancellationReasons = async (req, res) => {
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({ error: 'orderId é obrigatório' });
        }

        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order || order.restaurantId !== req.restaurantId) {
            return res.status(403).json({ error: 'Pedido não pertence a este restaurante' });
        }

        const reasons = await UairangoOrderService.getCancellationReasons(req.restaurantId, order.uairangoOrderId);
        res.json(reasons);
    } catch (error) {
        logger.error('[UAIRANGO] Erro ao buscar motivos de cancelamento:', error);
        res.status(500).json({ error: error.message || 'Erro ao buscar motivos de cancelamento' });
    }
};

const requestUairangoCancellation = async (req, res) => {
    try {
        const { orderId, cancellationCode, reason } = req.body;

        if (!orderId || !cancellationCode) {
            return res.status(400).json({ error: 'orderId e cancellationCode são obrigatórios' });
        }

        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order || order.restaurantId !== req.restaurantId) {
            return res.status(403).json({ error: 'Pedido não pertence a este restaurante' });
        }

        const result = await UairangoOrderService.requestCancellation(
            req.restaurantId, order.uairangoOrderId, cancellationCode, reason
        );

        await prisma.order.update({
            where: { id: orderId },
            data: { status: 'CANCELED', canceledAt: new Date() }
        });

        res.json(result);
    } catch (error) {
        logger.error('[UAIRANGO] Erro ao solicitar cancelamento:', error);
        res.status(500).json({ error: error.message || 'Erro ao solicitar cancelamento' });
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
    const { ifoodMerchantId, ifoodIntegrationActive, ifoodEnv, ifoodAutoAcceptOrders } = req.body;

    try {
        const updateData = {
            ifoodMerchantId,
            ifoodIntegrationActive,
            ifoodEnv,
            ifoodAutoAcceptOrders
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

        const result = await IfoodOrderService.confirmOrder(orderId);
        res.json(result);
    } catch (error) {
        logger.error('[IFOOD] Erro ao confirmar pedido:', error);
        res.status(500).json({ error: error.message || 'Erro ao confirmar pedido' });
    }
};

const rejectIfoodOrder = async (req, res) => {
    try {
        const { orderId, reason, force } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: 'orderId é obrigatório' });
        }

        const result = await IfoodOrderService.rejectOrder(orderId, reason, force);
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

        const result = await IfoodOrderService.startPreparation(orderId);
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

        const result = await IfoodOrderService.markReady(orderId);
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

        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order || order.restaurantId !== req.restaurantId) {
            return res.status(403).json({ error: 'Pedido não pertence a este restaurante' });
        }

        await UairangoOrderService.confirmOrder(req.restaurantId, order.uairangoOrderId);

        await prisma.order.update({
            where: { id: orderId },
            data: { status: 'PREPARING', preparingAt: new Date() }
        });

        res.json({ success: true });
    } catch (error) {
        logger.error('[UAIRANGO] Erro ao confirmar pedido:', error);
        res.status(500).json({ error: error.message || 'Erro ao confirmar pedido' });
    }
};

const rejectUairangoOrder = async (req, res) => {
    try {
        const { orderId, cancellationCode, reason } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: 'orderId é obrigatório' });
        }

        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order || order.restaurantId !== req.restaurantId) {
            return res.status(403).json({ error: 'Pedido não pertence a este restaurante' });
        }

        if (cancellationCode) {
            await UairangoOrderService.requestCancellation(
                req.restaurantId, order.uairangoOrderId, cancellationCode, reason
            );
        } else {
            await UairangoOrderService.rejectOrder(req.restaurantId, order.uairangoOrderId);
        }

        await prisma.order.update({
            where: { id: orderId },
            data: { status: 'CANCELED', canceledAt: new Date(), cancellationReason: reason || null }
        });

        res.json({ success: true });
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

        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order || order.restaurantId !== req.restaurantId) {
            return res.status(403).json({ error: 'Pedido não pertence a este restaurante' });
        }

        await UairangoOrderService.readyToPickup(req.restaurantId, order.uairangoOrderId);

        await prisma.order.update({
            where: { id: orderId },
            data: { status: 'READY', readyAt: new Date() }
        });

        res.json({ success: true });
    } catch (error) {
        logger.error('[UAIRANGO] Erro ao marcar pronto:', error);
        res.status(500).json({ error: error.message || 'Erro ao marcar pronto' });
    }
};

// === IFOOD - CANCELAMENTO (Homologação) ===

const getIfoodCancellationReasons = async (req, res) => {
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({ error: 'orderId é obrigatório' });
        }

        const result = await IfoodOrderService.getCancellationReasons(orderId);
        res.json(result);
    } catch (error) {
        logger.error('[IFOOD] Erro ao buscar motivos de cancelamento:', error);
        res.status(500).json({ error: error.message || 'Erro ao buscar motivos de cancelamento' });
    }
};

const acceptIfoodCancellation = async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: 'orderId é obrigatório' });
        }

        // Verificar se o pedido pertence ao restaurante do usuário
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order || order.restaurantId !== req.restaurantId) {
            return res.status(403).json({ error: 'Pedido não pertence a este restaurante' });
        }

        const result = await IfoodOrderService.acceptCancellation(orderId, req.restaurantId);
        res.json(result);
    } catch (error) {
        logger.error('[IFOOD] Erro ao aceitar cancelamento:', error);
        res.status(500).json({ error: error.message || 'Erro ao aceitar cancelamento' });
    }
};

const refuseIfoodCancellation = async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: 'orderId é obrigatório' });
        }

        // Verificar se o pedido pertence ao restaurante do usuário
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order || order.restaurantId !== req.restaurantId) {
            return res.status(403).json({ error: 'Pedido não pertence a este restaurante' });
        }

        const result = await IfoodOrderService.refuseCancellation(orderId);
        res.json(result);
    } catch (error) {
        logger.error('[IFOOD] Erro ao recusar cancelamento:', error);
        res.status(500).json({ error: error.message || 'Erro ao recusar cancelamento' });
    }
};

const validateIfoodPickupCode = async (req, res) => {
    try {
        const { orderId, code } = req.body;

        if (!orderId || !code) {
            return res.status(400).json({ error: 'orderId e code são obrigatórios' });
        }

        const result = await IfoodOrderService.validatePickupCode(orderId, code);
        res.json(result);
    } catch (error) {
        logger.error('[IFOOD] Erro ao validar código de retirada:', error);
        res.status(500).json({ error: error.message || 'Erro ao validar código de retirada' });
    }
};

const acceptIfoodDispute = async (req, res) => {
    try {
        const { disputeId, orderId, reason } = req.body;

        if (!disputeId || !orderId) {
            return res.status(400).json({ error: 'disputeId e orderId são obrigatórios' });
        }

        const result = await IfoodOrderService.acceptDispute(disputeId, reason);

        if (result.success) {
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    status: 'CANCELED',
                    canceledAt: new Date()
                }
            });
        }

        res.json(result);
    } catch (error) {
        logger.error('[IFOOD] Erro ao aceitar disputa:', error);
        res.status(500).json({ error: error.message || 'Erro ao aceitar disputa' });
    }
};

const rejectIfoodDispute = async (req, res) => {
    try {
        const { disputeId, orderId, reason } = req.body;

        if (!disputeId || !orderId) {
            return res.status(400).json({ error: 'disputeId e orderId são obrigatórios' });
        }

        const result = await IfoodOrderService.rejectDispute(disputeId, reason);

        if (result.success) {
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    disputeId: null,
                    disputeExpiresAt: null,
                    disputeReason: null
                }
            });
        }

        res.json(result);
    } catch (error) {
        logger.error('[IFOOD] Erro ao recusar disputa:', error);
        res.status(500).json({ error: error.message || 'Erro ao recusar disputa' });
    }
};

const offerIfoodAlternative = async (req, res) => {
    try {
        const { disputeId, orderId, alternativeType, value } = req.body;

        if (!disputeId || !orderId || !alternativeType) {
            return res.status(400).json({ error: 'disputeId, orderId e alternativeType são obrigatórios' });
        }

        const result = await IfoodOrderService.offerAlternativeDispute(disputeId, alternativeType, value);

        if (result.success) {
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    disputeId: null,
                    disputeExpiresAt: null,
                    disputeReason: null
                }
            });
        }

        res.json(result);
    } catch (error) {
        logger.error('[IFOOD] Erro ao oferecer alternativa na disputa:', error);
        res.status(500).json({ error: error.message || 'Erro ao oferecer alternativa' });
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
    getIfoodConnectionStatus,
    confirmUairangoOrder,
    rejectUairangoOrder,
    markUairangoReady,
    startUairangoPreparation,
    getUairangoConnectionStatus,
    updateUairangoMerchantStatus,
    dispatchUairangoOrder,
    getUairangoCancellationReasons,
    requestUairangoCancellation,
    getIfoodCancellationReasons,
    acceptIfoodCancellation,
    refuseIfoodCancellation,
    validateIfoodPickupCode,
    acceptIfoodDispute,
    rejectIfoodDispute,
    offerIfoodAlternative
};
