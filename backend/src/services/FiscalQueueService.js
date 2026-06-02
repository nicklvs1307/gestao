const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const FiscalService = require('./FiscalService');

class FiscalQueueService {
    constructor() {
        this.maxAttempts = 3;
        this.retryIntervals = [
            5 * 60 * 1000,    // 5 minutos
            15 * 60 * 1000,   // 15 minutos
            30 * 60 * 1000    // 30 minutos
        ];
    }

    async processQueue() {
        try {
            const pendingItems = await prisma.fiscalRetryQueue.findMany({
                where: {
                    status: 'PENDING',
                    scheduledFor: { lte: new Date() },
                    attempts: { lt: this.maxAttempts }
                },
                take: 10,
                orderBy: { scheduledFor: 'asc' }
            });

            if (!pendingItems.length) {
                return { processed: 0, message: 'Nenhum item pendente' };
            }

            logger.info(`[FISCAL QUEUE] Processando ${pendingItems.length} itens...`);

            const results = await Promise.allSettled(
                pendingItems.map(item => this.processItem(item))
            );

            const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failed = results.length - successful;

            return { processed: pendingItems.length, successful, failed };

        } catch (err) {
            logger.error('[FISCAL QUEUE] Erro ao processar fila:', err);
            return { processed: 0, error: err.message };
        }
    }

    async processItem(item) {
        try {
            await prisma.fiscalRetryQueue.update({
                where: { id: item.id },
                data: { status: 'PROCESSING', attempts: item.attempts + 1 }
            });

            const order = await prisma.order.findUnique({
                where: { id: item.orderId },
                include: { items: { include: { product: true } } }
            });

            if (!order) {
                await this.markAsFailed(item.id, 'Pedido não encontrado');
                return { success: false, error: 'Pedido não encontrado' };
            }

            const fiscalConfig = await prisma.restaurantFiscalConfig.findUnique({
                where: { restaurantId: order.restaurantId }
            });

            if (!fiscalConfig) {
                await this.markAsFailed(item.id, 'Configuração fiscal não encontrada');
                return { success: false, error: 'Configuração fiscal não encontrada' };
            }

            const lastInvoice = await prisma.invoice.findFirst({
                where: { restaurantId: order.restaurantId },
                orderBy: { number: 'desc' }
            });

            const nextNumber = (lastInvoice?.number || 0) + 1;
            const serie = 1;

            const result = await FiscalService.autorizarNfce(
                order,
                fiscalConfig,
                order.items,
                nextNumber,
                serie
            );

            if (result.success) {
                await prisma.invoice.create({
                    data: {
                        restaurantId: order.restaurantId,
                        orderId: order.id,
                        type: 'NFCe',
                        status: 'AUTHORIZED',
                        number: nextNumber,
                        series: serie,
                        accessKey: result.accessKey,
                        protocol: result.data?.protNFe?.infProt?.nProt || result.data?.nProt || null,
                        xml: result.xml,
                        issuedAt: new Date()
                    }
                });

                await prisma.fiscalRetryQueue.update({
                    where: { id: item.id },
                    data: { status: 'COMPLETED' }
                });

                logger.info(`[FISCAL QUEUE] NFC-e #${nextNumber} autorizada para pedido #${order.id} (retry #${item.attempts + 1})`);

                const socket = require('../lib/socket');
                socket.emitToRestaurant(order.restaurantId, 'fiscal:invoiceAuthorized', {
                    orderId: order.id,
                    accessKey: result.accessKey,
                    number: nextNumber
                });

                return { success: true, accessKey: result.accessKey };
            } else {
                const nextAttempt = item.attempts + 1;
                if (nextAttempt >= this.maxAttempts) {
                    await this.markAsFailed(item.id, result.error);
                    return { success: false, error: result.error };
                }

                await prisma.fiscalRetryQueue.update({
                    where: { id: item.id },
                    data: {
                        status: 'PENDING',
                        lastError: result.error,
                        scheduledFor: new Date(Date.now() + this.retryIntervals[nextAttempt - 1])
                    }
                });

                logger.warn(`[FISCAL QUEUE] Retry #${nextAttempt} agendado para pedido #${order.id}: ${result.error}`);
                return { success: false, error: result.error, retryScheduled: true };
            }

        } catch (err) {
            logger.error(`[FISCAL QUEUE] Erro ao processar item ${item.id}:`, err);
            await prisma.fiscalRetryQueue.update({
                where: { id: item.id },
                data: { status: 'PENDING', lastError: err.message }
            });
            return { success: false, error: err.message };
        }
    }

    async markAsFailed(queueId, error) {
        await prisma.fiscalRetryQueue.update({
            where: { id: queueId },
            data: { status: 'FAILED', lastError: error?.substring(0, 500) }
        });
    }

    async getQueueStatus(restaurantId) {
        const stats = await prisma.fiscalRetryQueue.groupBy({
            by: ['status'],
            where: { order: { restaurantId } },
            _count: true
        });

        const pending = stats.find(s => s.status === 'PENDING')?._count || 0;
        const processing = stats.find(s => s.status === 'PROCESSING')?._count || 0;
        const failed = stats.find(s => s.status === 'FAILED')?._count || 0;
        const completed = stats.find(s => s.status === 'COMPLETED')?._count || 0;

        return { pending, processing, failed, completed, total: pending + processing + failed + completed };
    }

    async retryManually(orderId) {
        const queueItem = await prisma.fiscalRetryQueue.findFirst({
            where: { orderId, status: 'FAILED' }
        });

        if (queueItem) {
            await prisma.fiscalRetryQueue.update({
                where: { id: queueItem.id },
                data: { status: 'PENDING', attempts: 0, scheduledFor: new Date() }
            });
            return { success: true, message: 'Retry agendado' };
        }

        return { success: false, error: 'Item não encontrado na fila' };
    }
}

module.exports = new FiscalQueueService();