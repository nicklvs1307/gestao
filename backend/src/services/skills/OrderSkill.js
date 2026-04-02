/**
 * OrderSkill - Criação, consulta, cancelamento e histórico de pedidos
 * 
 * Tools: create_order, check_order_status, get_order_history, cancel_order
 */

const BaseSkill = require('./BaseSkill');
const prisma = require('../../lib/prisma');
const { normalizePhone } = require('../../lib/phoneUtils');
const socketLib = require('../../lib/socket');
const logger = require('../../config/logger');

class OrderSkill extends BaseSkill {
  get name() { return 'order'; }
  get description() { return 'Cria pedidos, consulta status, histórico e cancela pedidos'; }

  getTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'create_order',
          description: 'FINALIZA e REGISTRA um pedido no sistema. Use APENAS após o cliente confirmar TODOS os itens, endereço, forma de pagamento e valor total. Nunca crie sem confirmação explícita.',
          parameters: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    productId: { type: 'string', description: 'ID do produto no banco (se conhecido)' },
                    name: { type: 'string', description: 'Nome exato do produto conforme o cardápio' },
                    size: { type: 'string', description: 'Tamanho escolhido (se houver)' },
                    quantity: { type: 'number', description: 'Quantidade (padrão 1)' },
                    observations: { type: 'string', description: 'Observações do item (ex: "sem cebola")' },
                    addons: { type: 'array', items: { type: 'string' }, description: 'Lista de nomes dos adicionais' }
                  },
                  required: ['name']
                },
                description: 'Lista de itens do pedido'
              },
              customerName: { type: 'string', description: 'Nome do cliente' },
              customerPhone: { type: 'string', description: 'Telefone do cliente' },
              deliveryAddress: { type: 'string', description: 'Endereço completo de entrega' },
              paymentMethod: { type: 'string', description: 'Forma de pagamento escolhida' },
              orderType: { type: 'string', enum: ['DELIVERY', 'PICKUP'], description: 'Delivery (entrega) ou Pickup (retirada)' },
              changeFor: { type: 'number', description: 'Troco para quanto (se pagamento em dinheiro)' },
              notes: { type: 'string', description: 'Observações gerais do pedido' }
            },
            required: ['items', 'orderType', 'customerName', 'paymentMethod']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'check_order_status',
          description: 'Verifica o status do pedido mais recente do cliente ou de um pedido específico por ID.',
          parameters: {
            type: 'object',
            properties: {
              phone: { type: 'string', description: 'Telefone do cliente (opcional, usa o do contato se omitido)' },
              orderId: { type: 'string', description: 'ID do pedido para consultar (opcional)' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_order_history',
          description: 'Retorna o histórico de pedidos recentes do cliente. Use quando o cliente perguntar "meus pedidos" ou quiser repetir um pedido anterior.',
          parameters: {
            type: 'object',
            properties: {
              phone: { type: 'string', description: 'Telefone do cliente' }
            },
            required: ['phone']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'cancel_order',
          description: 'Solicita o cancelamento de um pedido. Só funciona se o pedido ainda não estiver em preparo. Use quando o cliente pedir para cancelar.',
          parameters: {
            type: 'object',
            properties: {
              orderId: { type: 'string', description: 'ID do pedido a cancelar' },
              phone: { type: 'string', description: 'Telefone do cliente para verificação' },
              reason: { type: 'string', description: 'Motivo do cancelamento' }
            },
            required: ['orderId', 'phone']
          }
        }
      }
    ];
  }

  async handleToolCall(toolName, args, context) {
    switch (toolName) {
      case 'create_order':
        return this.createOrder(context.restaurantId, args, context.customerPhone);
      case 'check_order_status':
        return this.checkOrderStatus(context.restaurantId, args.orderId, args.phone || context.customerPhone);
      case 'get_order_history':
        return this.getOrderHistory(context.restaurantId, args.phone || context.customerPhone);
      case 'cancel_order':
        return this.cancelOrder(context.restaurantId, args.orderId, args.phone, args.reason);
      default:
        return `Tool "${toolName}" não implementada em OrderSkill.`;
    }
  }

  getSystemPrompt(context) {
    return `FLUXO DE PEDIDO - SIGA ESTA ORDEM:
1. Identifique o cliente com 'search_customer' (telefone do contato)
2. Se não cadastrado, ofereça 'create_customer'
3. Mostre o cardápio com 'get_menu' ou 'search_products'
4. Ajude o cliente a escolher itens, tamanhos e adicionais
5. ANTES de finalizar, apresente um RESUMO COMPLETO:
   - Itens com quantidades e preços
   - Taxa de entrega (se delivery)
   - Valor TOTAL
   - Endereço de entrega (se delivery)
   - Forma de pagamento
   - Troco (se dinheiro)
6. Peça CONFIRMAÇÃO EXPLÍCITA ("Posso confirmar seu pedido?")
7. APÓS confirmação, use 'create_order'
8. Informe o número do pedido e tempo estimado

REGRAS IMPORTANTES:
- NUNCA crie pedido sem resumo e confirmação
- NUNCA invente preços - sempre consulte o cardápio
- Se um produto não for encontrado, informe e sugira alternativas
- Para delivery, confirme o endereço ANTES de criar o pedido
- Para pagamento em dinheiro, pergunte sobre troco`;
  }

  async createOrder(restaurantId, args, customerPhone) {
    try {
      let calculatedTotal = 0;
      const orderItemsData = [];

      for (const item of args.items) {
        const quantity = Number(item.quantity) || 1;

        // Busca produto por ID ou nome
        const dbProduct = await prisma.product.findFirst({
          where: {
            restaurantId,
            isAvailable: true,
            OR: [
              ...(item.productId ? [{ id: item.productId }] : []),
              { name: { contains: item.name, mode: 'insensitive' } }
            ]
          },
          include: {
            sizes: { include: { globalSize: true } },
            addonGroups: { include: { addons: true } }
          }
        });

        if (!dbProduct) {
          logger.warn(`[OrderSkill] Produto não localizado: ${item.name}`);
          return `ERRO: Não consegui confirmar o produto "${item.name}" no sistema. Verifique se o nome está correto ou busque novamente com 'search_products'.`;
        }

        // Verifica disponibilidade em tempo real
        if (!dbProduct.isAvailable) {
          return `ERRO: O produto "${dbProduct.name}" não está disponível no momento.`;
        }

        let itemPrice = dbProduct.price;
        let sizeJson = null;

        if (dbProduct.sizes.length > 0) {
          const selectedSize = dbProduct.sizes.find(s =>
            (s.name && item.size && s.name.toLowerCase().includes(item.size.toLowerCase())) ||
            (s.globalSize?.name && item.size && s.globalSize.name.toLowerCase().includes(item.size.toLowerCase()))
          );

          if (selectedSize) {
            itemPrice = selectedSize.price;
            sizeJson = JSON.stringify({ name: selectedSize.name || selectedSize.globalSize?.name, price: itemPrice });
          } else if (item.size) {
            return `ERRO: O tamanho "${item.size}" não existe para "${dbProduct.name}". Opções: ${dbProduct.sizes.map(s => s.name || s.globalSize?.name).join(', ')}.`;
          }
        }

        // Adicionais
        let addonsTotal = 0;
        const selectedAddons = [];
        if (item.addons && item.addons.length > 0) {
          for (const addonName of item.addons) {
            let found = false;
            for (const group of dbProduct.addonGroups) {
              const addon = group.addons.find(a => a.name.toLowerCase() === addonName.toLowerCase());
              if (addon) {
                addonsTotal += addon.price;
                selectedAddons.push({ name: addon.name, price: addon.price });
                found = true;
                break;
              }
            }
            if (!found) {
              return `ERRO: O adicional "${addonName}" não foi encontrado para "${dbProduct.name}".`;
            }
          }
        }

        calculatedTotal += (itemPrice + addonsTotal) * quantity;

        orderItemsData.push({
          productId: dbProduct.id,
          quantity,
          priceAtTime: itemPrice + addonsTotal,
          observations: item.observations || '',
          sizeJson,
          addonsJson: selectedAddons.length > 0 ? JSON.stringify(selectedAddons) : null
        });
      }

      // Configurações do restaurante
      const restaurantInfo = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        include: { settings: true }
      });

      const deliveryFee = args.orderType === 'DELIVERY' ? (restaurantInfo?.settings?.deliveryFee || 0) : 0;
      calculatedTotal += deliveryFee;

      // Idempotência: verifica se já existe pedido idêntico nos últimos 2 minutos
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const existingOrder = await prisma.order.findFirst({
        where: {
          restaurantId,
          customerName: args.customerName,
          createdAt: { gte: twoMinutesAgo },
          deliveryOrder: {
            phone: normalizePhone(customerPhone),
            deliveryType: args.orderType.toLowerCase()
          }
        }
      });

      if (existingOrder) {
        return `⚠️ Já existe um pedido recente (#${existingOrder.id}) para este cliente. Evitando duplicidade. Se precisar criar outro, aguarde 2 minutos ou confirme com o cliente.`;
      }

      // Cria o pedido
      const newOrder = await prisma.order.create({
        data: {
          restaurant: { connect: { id: restaurantId } },
          status: 'PENDING',
          orderType: 'DELIVERY',
          total: Number(calculatedTotal.toFixed(2)),
          customerName: args.customerName,
          items: {
            create: orderItemsData.map(i => ({
              productId: i.productId,
              quantity: i.quantity,
              priceAtTime: i.priceAtTime,
              observations: i.observations,
              sizeJson: i.sizeJson,
              addonsJson: i.addonsJson
            }))
          },
          deliveryOrder: {
            create: {
              name: args.customerName,
              address: args.deliveryAddress || 'Retirada',
              phone: normalizePhone(customerPhone),
              deliveryType: args.orderType.toLowerCase(),
              paymentMethod: args.paymentMethod,
              changeFor: args.changeFor || 0,
              deliveryFee,
              notes: args.notes || null
            }
          }
        },
        include: { deliveryOrder: true, items: { include: { product: true } } }
      });

      // Notifica via socket
      socketLib.emitToRestaurant(restaurantId, 'new_order', newOrder);

      // Monta resumo para o cliente
      let summary = `✅ *PEDIDO CONFIRMADO!*\n\n`;
      summary += `Pedido #${newOrder.id}\n`;
      summary += `━━━━━━━━━━━━━━━\n`;
      newOrder.items.forEach(item => {
        summary += `${item.quantity}x ${item.product.name}`;
        if (item.sizeJson) {
          const size = JSON.parse(item.sizeJson);
          summary += ` (${size.name})`;
        }
        summary += ` - R$ ${(item.priceAtTime * item.quantity).toFixed(2).replace('.', ',')}\n`;
      });
      if (deliveryFee > 0) {
        summary += `Taxa de entrega: R$ ${deliveryFee.toFixed(2).replace('.', ',')}\n`;
      }
      summary += `━━━━━━━━━━━━━━━\n`;
      summary += `*TOTAL: R$ ${calculatedTotal.toFixed(2).replace('.', ',')}*\n\n`;
      summary += `Pagamento: ${args.paymentMethod}`;
      if (args.changeFor) {
        summary += `\nTroco para: R$ ${args.changeFor.toFixed(2).replace('.', ',')}`;
      }
      if (args.orderType === 'DELIVERY') {
        summary += `\nEntrega em: ${restaurantInfo?.settings?.deliveryTime || '30-40 min'}`;
      } else {
        summary += `\nRetirada no local`;
      }
      summary += `\n\nSeu pedido foi enviado para a cozinha! 🍳`;

      return summary;
    } catch (error) {
      logger.error('[OrderSkill CREATE ORDER ERROR]', error);
      return `ERRO: Ocorreu uma falha técnica ao salvar o pedido. Detalhes: ${error.message}. Tente novamente ou peça ajuda humana.`;
    }
  }

  async checkOrderStatus(restaurantId, orderId, phone) {
    try {
      let order;

      if (orderId) {
        order = await prisma.order.findUnique({
          where: { id: orderId, restaurantId },
          include: { deliveryOrder: true, items: { include: { product: true } } }
        });
      } else {
        const searchPhone = normalizePhone(phone);
        order = await prisma.order.findFirst({
          where: {
            restaurantId,
            deliveryOrder: { phone: { contains: searchPhone } }
          },
          orderBy: { createdAt: 'desc' },
          include: { deliveryOrder: true, items: { include: { product: true } } }
        });
      }

      if (!order) {
        return 'Não encontrei nenhum pedido para estes dados. Verifique o número do pedido ou telefone.';
      }

      const statusMap = {
        'BUILDING': '🔨 Sendo montado',
        'PENDING': '⏳ Pendente (aguardando restaurante)',
        'PREPARING': '🍳 Em preparo',
        'READY': '✅ Pronto para retirada/entrega',
        'SHIPPED': '🚗 Saiu para entrega',
        'DELIVERED': '📦 Entregue',
        'CANCELED': '❌ Cancelado',
        'COMPLETED': '✅ Finalizado'
      };

      let text = `📋 *PEDIDO #${order.id}*\n\n`;
      text += `Status: ${statusMap[order.status] || order.status}\n`;
      text += `Data: ${new Date(order.createdAt).toLocaleString('pt-BR')}\n\n`;
      text += `Itens:\n`;
      order.items.forEach(item => {
        text += `  ${item.quantity}x ${item.product.name}`;
        if (item.sizeJson) {
          const size = JSON.parse(item.sizeJson);
          text += ` (${size.name})`;
        }
        text += `\n`;
      });
      text += `\nTotal: R$ ${order.total.toFixed(2).replace('.', ',')}`;

      if (order.deliveryOrder) {
        text += `\nTipo: ${order.deliveryOrder.deliveryType === 'delivery' ? 'Entrega' : 'Retirada'}`;
        if (order.deliveryOrder.deliveryType === 'delivery') {
          text += `\nEndereço: ${order.deliveryOrder.address}`;
        }
      }

      return text;
    } catch (error) {
      logger.error('[OrderSkill CHECK STATUS ERROR]', error);
      return `ERRO ao consultar status do pedido: ${error.message}`;
    }
  }

  async getOrderHistory(restaurantId, phone) {
    try {
      const searchPhone = normalizePhone(phone);

      const orders = await prisma.order.findMany({
        where: {
          restaurantId,
          deliveryOrder: { phone: { contains: searchPhone } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          items: { include: { product: true } },
          deliveryOrder: true
        }
      });

      if (orders.length === 0) {
        return 'Este cliente ainda não fez nenhum pedido.';
      }

      const statusMap = {
        'BUILDING': 'Montando', 'PENDING': 'Pendente', 'PREPARING': 'Preparando',
        'READY': 'Pronto', 'SHIPPED': 'Em entrega', 'DELIVERED': 'Entregue',
        'CANCELED': 'Cancelado', 'COMPLETED': 'Finalizado'
      };

      let text = `📋 *HISTÓRICO DE PEDIDOS*\n\n`;
      orders.forEach(order => {
        text += `*#${order.id}* - ${new Date(order.createdAt).toLocaleDateString('pt-BR')}\n`;
        text += `  Status: ${statusMap[order.status] || order.status}\n`;
        const itemsList = order.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ');
        text += `  Itens: ${itemsList}\n`;
        text += `  Total: R$ ${order.total.toFixed(2).replace('.', ',')}\n\n`;
      });

      return text;
    } catch (error) {
      logger.error('[OrderSkill HISTORY ERROR]', error);
      return `ERRO ao buscar histórico: ${error.message}`;
    }
  }

  async cancelOrder(restaurantId, orderId, phone, reason) {
    try {
      const searchPhone = normalizePhone(phone);

      const order = await prisma.order.findFirst({
        where: { id: orderId, restaurantId },
        include: { deliveryOrder: true }
      });

      if (!order) {
        return `Pedido #${orderId} não encontrado.`;
      }

      // Verifica se o telefone corresponde
      if (order.deliveryOrder?.phone && !order.deliveryOrder.phone.includes(searchPhone.slice(-8))) {
        return 'Este pedido não pertence a este cliente.';
      }

      // Só permite cancelar se não estiver em preparo ou posterior
      const cancellableStatuses = ['BUILDING', 'PENDING'];
      if (!cancellableStatuses.includes(order.status)) {
        return `O pedido #${orderId} já está em "${order.status}" e não pode mais ser cancelado pelo agente. Solicite ajuda humana para cancelamento.`;
      }

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELED',
          canceledAt: new Date()
        }
      });

      logger.info(`[OrderSkill] Pedido #${orderId} cancelado. Motivo: ${reason || 'Não informado'}`);

      return `✅ *Pedido #${orderId} cancelado com sucesso.*\n\nMotivo: ${reason || 'Não informado'}\n\nO valor será estornado conforme a forma de pagamento.`;
    } catch (error) {
      logger.error('[OrderSkill CANCEL ERROR]', error);
      return `ERRO ao cancelar pedido: ${error.message}`;
    }
  }
}

module.exports = new OrderSkill();
