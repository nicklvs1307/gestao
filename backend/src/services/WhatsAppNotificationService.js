const prisma = require('../lib/prisma');
const evolutionService = require('./EvolutionService');

class WhatsAppNotificationService {
  
  async notifyOrderUpdate(orderId, status) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          restaurant: true,
          deliveryOrder: true,
          items: { include: { product: true } }
        }
      });

      if (!order) return;

      // Só envia se for pedido de delivery ou se tiver telefone no deliveryOrder
      const phone = order.deliveryOrder?.phone?.replace(/\D/g, '');
      if (!phone) return;

      const instance = await prisma.whatsAppInstance.findUnique({
        where: { restaurantId: order.restaurantId }
      });

      if (!instance || instance.status !== 'CONNECTED') return;

      const statusMessages = {
        'PENDING': `*Pedido Recebido!* 📝

Olá ${order.deliveryOrder.name || 'Cliente'}, recebemos seu pedido #${order.dailyOrderNumber || order.id.slice(-4)}.

Estamos aguardando a confirmação do restaurante.`,
        
        'PREPARING': `*Pedido em Preparo!* 🔥

Seu pedido #${order.dailyOrderNumber || order.id.slice(-4)} já está sendo preparado com muito carinho pela nossa equipe!`,
        
        'READY': `*Pedido Pronto!* ✅

Boas notícias! Seu pedido #${order.dailyOrderNumber || order.id.slice(-4)} está pronto e logo sairá para entrega ou estará disponível para retirada.`,
        
        'SHIPPED': `*Pedido Saiu para Entrega!* 🛵

Opa! Seu pedido #${order.dailyOrderNumber || order.id.slice(-4)} acabou de sair com o nosso entregador. Prepare a mesa!`,
        
        'DELIVERED': `*Pedido Entregue!* 😋

Seu pedido #${order.dailyOrderNumber || order.id.slice(-4)} foi entregue. Esperamos que aproveite! Bom apetite!`,
        
        'CANCELED': `*Pedido Cancelado* ❌

Olá, infelizmente seu pedido #${order.dailyOrderNumber || order.id.slice(-4)} foi cancelado. Se tiver dúvidas, entre em contato conosco.`
      };

      let message = statusMessages[status];

      // Se for a primeira mensagem (PENDING), adiciona o resumo do pedido
      if (status === 'PENDING') {
        message += `

*Resumo do Pedido:*`;
        order.items.forEach(item => {
          message += `
- ${item.quantity}x ${item.product.name}`;
          if (item.sizeJson) {
            const size = JSON.parse(item.sizeJson);
            message += ` (${size.name})`;
          }
        });
        message += `

*Total:* R$ ${order.total.toFixed(2)}`;
        message += `
*Pagamento:* ${order.deliveryOrder.paymentMethod || 'Não informado'}`;
      }

      message += `

_Mensagem automática de ${order.restaurant.name}_`;

      await evolutionService.sendText(instance.name, phone, message);
      console.log(`[WhatsApp Notification] Status ${status} enviado para ${phone} (Pedido #${order.id})`);

    } catch (error) {
      console.error(`[WhatsApp Notification] Erro ao enviar notificação:`, error);
    }
  }
}

module.exports = new WhatsAppNotificationService();
