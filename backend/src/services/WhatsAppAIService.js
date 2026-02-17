const OpenAI = require('openai');
const prisma = require('../lib/prisma');

class WhatsAppAIService {
  constructor() {
    // A chave agora será SEMPRE lida de process.env.OPENAI_API_KEY
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY não definida no ambiente. O agente AI pode não funcionar.');
    }
    this.openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // Não precisamos mais do getClient, pois a chave é global
  // async getClient(restaurantId) {
  //   const settings = await prisma.whatsAppSettings.findUnique({ where: { restaurantId } });
  //   const apiKey = settings?.openaiApiKey || this.defaultApiKey;
  //   if (!apiKey) throw new Error('OpenAI API Key não configurada');
  //   return new OpenAI({ apiKey });
  // }

  /**
   * Definição das ferramentas (Tools) que a IA pode usar
   */
  getTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'get_menu',
          description: 'Retorna o cardápio completo com produtos, preços e categorias.',
          parameters: { type: 'object', properties: {} }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_payment_methods',
          description: 'Retorna as formas de pagamento aceitas pelo restaurante.',
          parameters: { type: 'object', properties: {} }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_order_history',
          description: 'Retorna o histórico de pedidos recentes do cliente.',
          parameters: {
            type: 'object',
            properties: {
              phone: { type: 'string' }
            },
            required: ['phone']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'create_order',
          description: 'Cria um pedido no sistema. Use quando o cliente confirmar os itens, endereço e forma de pagamento.',
          parameters: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Nome do produto exatamente como no cardápio' },
                    quantity: { type: 'number' },
                    observations: { type: 'string', description: 'Ex: Sem cebola, bem passado' }
                  }
                }
              },
              customerName: { type: 'string' },
              deliveryAddress: { type: 'string' },
              paymentMethod: { type: 'string', enum: ['PIX', 'CARTÃO', 'DINHEIRO'] },
              orderType: { type: 'string', enum: ['DELIVERY', 'PICKUP'] }
            },
            required: ['items', 'orderType', 'customerName', 'paymentMethod']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'check_order_status',
          description: 'Verifica o status de um pedido existente.',
          parameters: {
            type: 'object',
            properties: {
              phone: { type: 'string' }
            }
          }
        }
      }
    ];
  }

  /**
   * Execução das funções chamadas pela IA
   */
  async handleToolCall(restaurantId, toolCall) {
    const { name, arguments: argsString } = toolCall.function;
    const args = JSON.parse(argsString);

    switch (name) {
      case 'get_menu':
        const categories = await prisma.category.findMany({
          where: { restaurantId },
          include: { products: { where: { isAvailable: true } } },
          orderBy: { order: 'asc' }
        });
        
        let menuText = "Cardápio Atual:\n";
        categories.forEach(cat => {
          if (cat.products.length > 0) {
            menuText += `\n--- CATEGORIA: ${cat.name} ---\n`;
            cat.products.forEach(p => {
              menuText += `PRODUTO: ${p.name} | PREÇO: R$ ${p.price.toFixed(2)} | DESCRIÇÃO: ${p.description || 'N/A'}\n`;
            });
          }
        });
        return menuText;

      case 'get_payment_methods':
        const methods = await prisma.paymentMethod.findMany({
          where: { restaurantId, isActive: true }
        });
        if (methods.length === 0) return "Aceitamos Dinheiro, PIX e Cartões de Crédito/Débito.";
        return "Formas de pagamento aceitas: " + methods.map(m => m.name).join(', ');

      case 'check_order_status':
        const order = await prisma.order.findFirst({
          where: { 
            restaurantId, 
            deliveryOrder: { phone: args.phone.replace(/\D/g, '') } 
          },
          orderBy: { createdAt: 'desc' },
          include: { deliveryOrder: true }
        });
        if (!order) return "Nenhum pedido encontrado para este número.";
        const statusMap = {
          'PENDING': 'Pendente',
          'PREPARING': 'Em Preparo',
          'READY': 'Pronto',
          'SHIPPED': 'Saiu para Entrega',
          'DELIVERED': 'Entregue',
          'CANCELED': 'Cancelado',
          'COMPLETED': 'Finalizado'
        };
        return `Pedido #${order.id} - Status: ${statusMap[order.status] || order.status}`;

      case 'get_order_history':
        const orders = await prisma.order.findMany({
          where: { 
            restaurantId, 
            deliveryOrder: { phone: args.phone.replace(/\D/g, '') } 
          },
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: { items: { include: { product: true } } }
        });
        if (orders.length === 0) return "O cliente ainda não possui histórico de pedidos.";
        return orders.map(o => `Pedido em ${new Date(o.createdAt).toLocaleDateString()}: ${o.items.map(i => i.product.name).join(', ')}`).join('\n');

      case 'create_order':
        // Por enquanto, apenas simula, mas com mais detalhes
        console.log(`[AI ORDER] Restaurante ${restaurantId} - Cliente ${args.customerName}:`, args.items);
        return `Perfeito! Registrei seu pedido de: ${args.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}. O total será calculado e um atendente humano confirmará em instantes para iniciar o preparo.`;

      default:
        return "Função não encontrada.";
    }
  }

  async handleMessage(restaurantId, customerPhone, messageContent) {
    try {
      console.log(`[AI Service] Processando mensagem para restaurante ${restaurantId}, cliente ${customerPhone}`);
      
      if (!process.env.OPENAI_API_KEY) {
        console.error('[AI Service] OPENAI_API_KEY não encontrada no .env');
        return "Desculpe, a chave da API da OpenAI não está configurada no servidor.";
      }

      const settings = await prisma.whatsAppSettings.findUnique({ where: { restaurantId } });
      if (!settings) {
        console.warn(`[AI Service] Configurações de WhatsApp não encontradas para o restaurante ${restaurantId}`);
        return null;
      }
      
      if (!settings.agentEnabled) {
        console.log(`[AI Service] Agente de IA está DESATIVADO para o restaurante ${restaurantId}`);
        return null;
      }

      console.log(`[AI Service] Agente ${settings.agentName} ativo. Chamando OpenAI...`);
      const openai = this.openaiClient;
      
      const history = await prisma.whatsAppChatMessage.findMany({
        where: { restaurantId, customerPhone },
        orderBy: { timestamp: 'desc' },
        take: 10
      });

      const restaurant = await prisma.restaurant.findUnique({ 
        where: { id: restaurantId },
        include: { settings: true }
      });

      let messages = [
        { 
          role: 'system', 
          content: `Você é o ${settings.agentName || 'Atendente Virtual'} do restaurante ${restaurant.name}.
          ${settings.agentPersona || 'Você é um atendente humanizado, educado e eficiente.'}
          
          Contexto do Restaurante:
          - Endereço: ${restaurant.address || 'Não informado'}
          - Telefone: ${restaurant.phone || 'Não informado'}
          - Taxa de Entrega: R$ ${restaurant.settings?.deliveryFee || 'A consultar'}
          - Tempo de Entrega: ${restaurant.settings?.deliveryTime || 'Não informado'}
          
          Diretrizes de Resposta:
          1. Respostas CURTAS e DIRETAS. Use no máximo 2 ou 3 frases curtas por mensagem.
          2. Nunca envie blocos grandes de texto, a menos que seja a revisão final do pedido.
          3. SEMPRE consulte o cardápio usando 'get_menu' para saber os PREÇOS reais antes de informar ao cliente.
          4. Se o cliente perguntar o preço, diga o valor exato que está no cardápio.
          5. Use emojis moderadamente e seja amigável.
          6. Ao listar opções, use tópicos curtos.
          
          Hoje é ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`
        },
        ...history.reverse().map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: messageContent }
      ];

      // Chamada da OpenAI com suporte a Ferramentas
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools: this.getTools(),
        tool_choice: 'auto',
      });

      let responseMessage = response.choices[0].message;

      // Se a IA quiser usar uma ferramenta
      if (responseMessage.tool_calls) {
        messages.push(responseMessage);

        for (const toolCall of responseMessage.tool_calls) {
          const toolResult = await this.handleToolCall(restaurantId, toolCall);
          messages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: toolCall.function.name,
            content: toolResult,
          });
        }

        // Segunda chamada para a IA processar o resultado da ferramenta
        const secondResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
        });
        responseMessage = secondResponse.choices[0].message;
      }

      const responseText = responseMessage.content;

      // Salva no histórico
      await prisma.whatsAppChatMessage.createMany({
        data: [
          { restaurantId, customerPhone, role: 'user', content: messageContent },
          { restaurantId, customerPhone, role: 'assistant', content: responseText }
        ]
      });

      return responseText;
    } catch (error) {
      console.error('Erro na IA:', error);
      return "Desculpe, tive um problema técnico ao processar sua mensagem. Posso te ajudar com outra coisa?";
    }
  }
}

module.exports = new WhatsAppAIService();
