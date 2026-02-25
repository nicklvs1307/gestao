const prisma = require('../lib/prisma');
const evolutionService = require('./EvolutionService');
const { normalizePhone } = require('../lib/phoneUtils');

class WhatsAppNotificationService {
  
  async notifyOrderUpdate(orderId, status) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          restaurant: {
            include: { settings: true }
          },
          deliveryOrder: {
            include: { customer: true }
          },
          items: { include: { product: true } }
        }
      });

      if (!order) return;

      // Só envia se for pedido de delivery ou se tiver telefone no deliveryOrder
      const phone = normalizePhone(order.deliveryOrder?.phone);
      if (!phone) return;

      const instance = await prisma.whatsAppInstance.findUnique({
        where: { restaurantId: order.restaurantId }
      });

      if (!instance || instance.status !== 'CONNECTED') return;

      const orderNumber = order.dailyOrderNumber || order.id.slice(-4);
      const customerName = order.deliveryOrder.name || order.deliveryOrder.customer?.name || 'Cliente';
      const menuUrl = order.restaurant.settings?.menuUrl || 'http://localhost:5173';
      const trackingLink = `${menuUrl}/order-status/${order.id}`;

      // 1. Mensagem de Boas-vindas baseada no status
      let header = '';
      if (status === 'PENDING') {
          header = `Olá, ${customerName}! Seu pedido foi recebido e aguarda aprovação. Segue abaixo um resumo do seu pedido \n \n  *Pedido #${orderNumber}*`;
      } else if (status === 'PREPARING') {
          header = `Olá, ${customerName}! Seu pedido foi aprovado. Segue abaixo um resumo do seu pedido \n \n  *Pedido #${orderNumber}*`;
      } else {
          // Para outros status, usamos a lógica simplificada anterior ou personalizada
          const statusMessages = {
            'READY': `*Pedido Pronto!* ✅\n\nBoas notícias! Seu pedido #${orderNumber} está pronto.`,
            'SHIPPED': `*Pedido Saiu para Entrega!* 🛵\n\nOpa! Seu pedido #${orderNumber} acabou de sair com o nosso entregador.`,
            'DELIVERED': `*Pedido Entregue!* 😋\n\nSeu pedido #${orderNumber} foi entregue. Bom apetite!`,
            'CANCELED': `*Pedido Cancelado* ❌\n\nInfelizmente seu pedido #${orderNumber} foi cancelado.`
          };
          header = statusMessages[status] || `Status do pedido #${orderNumber}: ${status}`;
      }

      let message = `${header}\n\nLink para acompanhar status do pedido: \n${trackingLink}\n\n`;

      // 2. Listagem de Itens (apenas para PENDING ou PREPARING para não ficar repetitivo)
      if (status === 'PENDING' || status === 'PREPARING') {
          let itemsTotal = 0;
          order.items.forEach(item => {
              const size = item.sizeJson ? JSON.parse(item.sizeJson) : null;
              const subtotal = item.priceAtTime * item.quantity;
              itemsTotal += subtotal;

              message += `${item.quantity}x ${item.product.name}${size ? ` ${size.name}` : ''} (R$ ${item.priceAtTime.toFixed(2).replace('.', ',')})\n`;
              message += `Subtotal do item: R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
              message += `- - - - - - - - - - - - - -\n`;
          });

          message += `*SUBTOTAL: R$ ${itemsTotal.toFixed(2).replace('.', ',')}*\n\n`;

          // 3. Dados de Entrega
          if (order.deliveryOrder?.deliveryType === 'delivery') {
              const c = order.deliveryOrder.customer;
              message += ` ------------------------------------------\n▶ *Dados para entrega* \n \n`;
              message += `Nome: ${customerName}\n`;
              message += `Endereço: ${c?.street || order.deliveryOrder.address || 'Não informado'}, nº: ${c?.number || 'S/N'}\n`;
              message += `Bairro: ${c?.neighborhood || 'Não informado'}\n`;
              message += `WhatsApp: ${order.deliveryOrder.phone}\n\n`;
              message += `Taxa de Entrega: R$ ${order.deliveryOrder.deliveryFee.toFixed(2).replace('.', ',')}\n\n`;
              
              if (order.restaurant.settings?.deliveryTime) {
                  message += ` 🕙 Tempo de Entrega: aprox. ${order.restaurant.settings.deliveryTime}\n\n`;
              }
          } else {
              message += ` ------------------------------------------\n▶ *Retirada no Balcão*\n \n`;
          }

          message += ` ------------------------------- \n▶ *TOTAL = R$ ${order.total.toFixed(2).replace('.', ',')}*\n ------------------------------ \n\n`;

          // 4. Pagamento
          const payment = order.deliveryOrder.paymentMethod || 'Não informado';
          message += `▶ *PAGAMENTO* \n \n${payment}`;
          
          if (order.deliveryOrder.changeFor) {
              message += `\n(Levar troco para R$ ${order.deliveryOrder.changeFor.toFixed(2).replace('.', ',')})`;
          }
      }

      message += `\n\n_Mensagem automática de ${order.restaurant.name}_`;

      await evolutionService.sendText(instance.name, phone, message);
      console.log(`[WhatsApp Notification] Status ${status} enviado para ${phone} (Pedido #${order.id})`);

    } catch (error) {
      console.error(`[WhatsApp Notification] Erro ao enviar notificação:`, error);
    }
  }
}

module.exports = new WhatsAppNotificationService();
