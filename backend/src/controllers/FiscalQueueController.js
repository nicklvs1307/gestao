const FiscalQueueService = require('../services/FiscalQueueService');
const logger = require('../config/logger');

class FiscalQueueController {
    async getQueueStatus(req, res) {
        try {
            const { restaurantId } = req;
            const status = await FiscalQueueService.getQueueStatus(restaurantId);
            res.json(status);
        } catch (error) {
            logger.error('Erro ao buscar status da fila fiscal:', error);
            res.status(500).json({ error: 'Erro ao buscar status da fila.' });
        }
    }

    async retryManually(req, res) {
        try {
            const { orderId } = req.body;
            if (!orderId) {
                return res.status(400).json({ error: 'orderId é obrigatório.' });
            }

            const result = await FiscalQueueService.retryManually(orderId);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(404).json(result);
            }
        } catch (error) {
            logger.error('Erro ao fazer retry manual:', error);
            res.status(500).json({ error: 'Erro ao fazer retry manual.' });
        }
    }
}

module.exports = new FiscalQueueController();