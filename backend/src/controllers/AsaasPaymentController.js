const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const AsaasService = require('../services/AsaasService');
const OrderService = require('../services/OrderService');
const socketLib = require('../lib/socket');

class AsaasPaymentController {

  async generatePix(req, res) {
    try {
      const { orderId } = req.params;
      const restaurantId = req.restaurantId;

      // 1. Buscar pedido
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { deliveryOrder: true, payments: true }
      });

      if (!order) {
        return res.status(404).json({ success: false, error: 'Pedido não encontrado' });
      }

      if (order.restaurantId !== restaurantId) {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }

      // 2. Verificar se já tem pagamento PIX pendente e válido
      const existingPayment = order.payments.find(
        p => p.method === 'pix_online' && p.asaasPaymentId && !p.paidAt
      );
      if (existingPayment && existingPayment.qrCodeExpiresAt && existingPayment.qrCodeExpiresAt > new Date()) {
        return res.json({
          success: true,
          data: {
            paymentId: existingPayment.asaasPaymentId,
            qrCodeBase64: existingPayment.qrCodeBase64,
            pixPayload: existingPayment.pixPayload,
            expiresAt: existingPayment.qrCodeExpiresAt,
            amount: existingPayment.amount
          }
        });
      }

      // 3. Buscar configuração Asaas do restaurante
      const settings = await prisma.integrationSettings.findUnique({
        where: { restaurantId }
      });

      if (!settings?.asaasApiKey || !settings?.asaasActive) {
        return res.status(400).json({
          success: false,
          error: 'Integração Asaas não configurada. Configure no painel admin.'
        });
      }

      // 4. Instanciar AsaasService
      const asaasService = new AsaasService(
        settings.asaasApiKey,
        settings.asaasEnvironment
      );

      // 5. Criar/buscar cliente no Asaas
      const customerData = {
        name: order.customerName || order.deliveryOrder?.name || 'Cliente Cardápio',
        phone: order.deliveryOrder?.phone,
        cpfCnpj: order.customerDocument
      };
      const customer = await asaasService.createCustomer(customerData);

      // 6. Criar cobrança PIX
      const description = `Pedido #${order.dailyOrderNumber || order.id.slice(-6)}`;
      const payment = await asaasService.createPixPayment(
        customer.id,
        order.total,
        orderId,
        description
      );

      // 7. Obter QR Code
      const qrCode = await asaasService.getPixQrCode(payment.id);

      // 8. Salvar/atualizar Payment no banco
      const paymentRecord = await prisma.payment.upsert({
        where: {
          // Usar um composto ou buscar existente
          id: existingPayment?.id || undefined
        },
        update: {
          asaasPaymentId: payment.id,
          asaasStatus: 'PENDING',
          qrCodeBase64: qrCode.encodedImage,
          pixPayload: qrCode.payload,
          qrCodeExpiresAt: new Date(qrCode.expirationDate),
          amount: order.total,
          method: 'pix_online'
        },
        create: {
          amount: order.total,
          method: 'pix_online',
          asaasPaymentId: payment.id,
          asaasStatus: 'PENDING',
          qrCodeBase64: qrCode.encodedImage,
          pixPayload: qrCode.payload,
          qrCodeExpiresAt: new Date(qrCode.expirationDate),
          orderId: orderId
        }
      });

      // 9. Retornar dados
      res.json({
        success: true,
        data: {
          paymentId: payment.id,
          qrCodeBase64: qrCode.encodedImage,
          pixPayload: qrCode.payload,
          expiresAt: qrCode.expirationDate,
          amount: order.total
        }
      });

    } catch (error) {
      logger.error('[AsaasPayment] Erro ao gerar PIX:', error);
      res.status(500).json({ success: false, error: 'Erro ao gerar pagamento PIX' });
    }
  }

  async checkStatus(req, res) {
    try {
      const { orderId } = req.params;
      const restaurantId = req.restaurantId;

      const payment = await prisma.payment.findFirst({
        where: { orderId, method: 'pix_online' },
        orderBy: { createdAt: 'desc' }
      });

      if (!payment) {
        return res.status(404).json({ success: false, error: 'Pagamento não encontrado' });
      }

      // Se já pago, retornar direto
      if (payment.paidAt) {
        return res.json({
          success: true,
          data: {
            status: 'RECEIVED',
            paidAt: payment.paidAt,
            asaasPaymentId: payment.asaasPaymentId
          }
        });
      }

      // Se expirado
      if (payment.qrCodeExpiresAt && payment.qrCodeExpiresAt < new Date()) {
        return res.json({
          success: true,
          data: { status: 'EXPIRED' }
        });
      }

      // Se não tem asaasPaymentId, retornar PENDING
      if (!payment.asaasPaymentId) {
        return res.json({
          success: true,
          data: { status: 'PENDING' }
        });
      }

      // Consultar no Asaas
      const settings = await prisma.integrationSettings.findUnique({
        where: { restaurantId }
      });

      if (!settings?.asaasApiKey) {
        return res.json({
          success: true,
          data: { status: 'PENDING' }
        });
      }

      const asaasService = new AsaasService(
        settings.asaasApiKey,
        settings.asaasEnvironment
      );

      const status = await asaasService.getPaymentStatus(payment.asaasPaymentId);

      // Se pago, atualizar banco e auto-aceitar pedido
      if (status.status === 'RECEIVED' || status.status === 'CONFIRMED') {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            asaasStatus: status.status,
            paidAt: new Date()
          }
        });

        // Auto-aceitar pedido (mudar para PREPARING)
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (order && (order.status === 'BUILDING' || order.status === 'PENDING')) {
          await OrderService.updateOrderStatus(orderId, 'PREPARING');

          // Notificar restaurante via Socket
          socketLib.emitToRestaurant(
            order.restaurantId,
            'order_update',
            {
              eventType: 'PAYMENT_CONFIRMED',
              restaurantId: order.restaurantId,
              payload: { orderId, status: 'PREPARING' }
            }
          );
        }
      }

      res.json({
        success: true,
        data: {
          status: status.status,
          paidAt: status.status === 'RECEIVED' ? new Date() : null,
          asaasPaymentId: payment.asaasPaymentId
        }
      });

    } catch (error) {
      logger.error('[AsaasPayment] Erro ao consultar status:', error);
      res.status(500).json({ success: false, error: 'Erro ao consultar status' });
    }
  }

  async testConnection(req, res) {
    try {
      const { restaurantId } = req;

      const settings = await prisma.integrationSettings.findUnique({
        where: { restaurantId }
      });

      if (!settings?.asaasApiKey) {
        return res.status(400).json({ success: false, error: 'API Key não configurada' });
      }

      const asaasService = new AsaasService(
        settings.asaasApiKey,
        settings.asaasEnvironment
      );

      const isValid = await asaasService.validateApiKey();

      if (isValid) {
        res.json({ success: true, message: 'Conexão validada com sucesso' });
      } else {
        res.status(400).json({ success: false, error: 'API Key inválida ou sem acesso' });
      }
    } catch (error) {
      logger.error('[AsaasPayment] Erro ao testar conexão:', error);
      res.status(500).json({ success: false, error: 'Erro ao testar conexão' });
    }
  }
}

module.exports = new AsaasPaymentController();
