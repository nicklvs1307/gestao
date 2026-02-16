const OpenAI = require('openai');
const prisma = require('../lib/prisma');

class WhatsAppAIService {
  constructor() {
    this.defaultApiKey = process.env.OPENAI_API_KEY;
  }

  async getClient(restaurantId) {
    const settings = await prisma.whatsAppSettings.findUnique({ where: { restaurantId } });
    const apiKey = settings?.openaiApiKey || this.defaultApiKey;
    if (!apiKey) throw new Error('OpenAI API Key não configurada');
    return new OpenAI({ apiKey });
  }

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
          name: 'create_order',
          description: 'Cria um pedido no sistema.',
          parameters: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    quantity: { type: 'number' },
                    observations: { type: 'string' }
                  }
                }
              },
              customerName: { type: 'string' },
              deliveryAddress: { type: 'string' },
              paymentMethod: { type: 'string', enum: ['PIX', 'CARTAO', 'DINHEIRO'] },
              orderType: { type: 'string', enum: ['DELIVERY', 'PICKUP'] }
            },
            required: ['items', 'orderType']
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
        const products = await prisma.product.findMany({
          where: { restaurantId, isAvailable: true },
          select: { name: true, price: true, description: true, categories: { select: { name: true } } }
        });
        return JSON.stringify(products);

      case 'check_order_status':
        const order = await prisma.order.findFirst({
          where: { restaurantId, deliveryOrder: { phone: args.phone } },
          orderBy: { createdAt: 'desc' },
          include: { deliveryOrder: true }
        });
        if (!order) return "Nenhum pedido encontrado para este número.";
        return `Pedido #${order.id} - Status: ${order.status}`;

      case 'create_order':
        // Lógica simplificada de criação. Em produção, buscaria os IDs dos produtos.
        return `Pedido recebido com sucesso! Itens: ${args.items.length}. Um atendente humano irá confirmar em instantes.`;

      default:
        return "Função não encontrada.";
    }
  }

  async handleMessage(restaurantId, customerPhone, messageContent) {
    try {
      const settings = await prisma.whatsAppSettings.findUnique({ where: { restaurantId } });
      if (!settings || !settings.agentEnabled) return null;

      const openai = await this.getClient(restaurantId);
      
      // Memória de Curto Prazo (Histórico do Banco)
      const history = await prisma.whatsAppChatMessage.findMany({
        where: { restaurantId, customerPhone },
        orderBy: { timestamp: 'desc' },
        take: 15
      });

      // Busca dados do restaurante para o System Prompt
      const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });

      let messages = [
        { 
          role: 'system', 
          content: `${settings.agentPersona || 'Você é um atendente humanizado.'}
          Nome do Restaurante: ${restaurant.name}
          Hoje é: ${new Date().toLocaleDateString('pt-BR')}
          Instruções:
          - Nunca responda como robô.
          - Use emojis moderadamente.
          - Se o cliente for novo, seja caloroso.
          - Se ele já pediu antes, seja mais direto.
          - IMPORTANTE: Sempre use a ferramenta 'get_menu' para saber os preços antes de informar ao cliente.`
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
      return null;
    }
  }
}

module.exports = new WhatsAppAIService();
