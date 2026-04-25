const express = require('express');
const router = express.Router();
const IntegrationController = require('../controllers/IntegrationController');
const prisma = require('../lib/prisma');
const logger = require('../config/logger');

router.post('/webhook/:restaurantId', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { events } = req.body;

        if (!events || !Array.isArray(events)) {
            logger.warn('[IFOOD] Webhook sem eventos');
            return res.status(400).json({ error: 'Eventos inválidos' });
        }

        const settings = await prisma.integrationSettings.findUnique({
            where: { restaurantId }
        });

        if (!settings?.ifoodIntegrationActive) {
            logger.info(`[IFOOD] Integração não ativa para restaurante ${restaurantId}`);
            return res.status(200).json({ acknowledged: true });
        }

        for (const eventData of events) {
            const orderId = eventData.orderId || eventData.metadata?.id;
            
            if (!orderId) {
                continue;
            }

            const IfoodOrderService = require('../services/IfoodOrderService');
            await IfoodOrderService.processWebhookEvent(restaurantId, eventData);
        }

        res.status(200).json({ acknowledged: true });
    } catch (error) {
        logger.error('[IFOOD] Erro ao processar webhook:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

module.exports = router;