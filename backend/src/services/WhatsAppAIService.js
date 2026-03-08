const OpenAI = require('openai');
const prisma = require('../lib/prisma');
const socketLib = require('../lib/socket');
const { normalizePhone } = require('../lib/phoneUtils');

class WhatsAppAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY não definida no ambiente. O agente AI pode não funcionar.');
    }
    this.openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
          description: 'Retorna o cardápio completo ou filtrado por categoria.',
          parameters: {
            type: 'object',
            properties: {
              category: { type: 'string', description: 'Nome da categoria (opcional)' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_products',
          description: 'Busca por produtos específicos no cardápio pelo nome.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Termo de busca (ex: "pizza", "x-tudo")' }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_store_info',
          description: 'Busca informações gerais sobre o restaurante (políticas, horários, perguntas frequentes).',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'O que você quer saber (ex: "entrega", "estacionamento")' }
            },
            required: ['query']
          }
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
          name: 'create_order',
          description: 'FINALIZA e REGISTRA o pedido no sistema. Use APENAS após o cliente confirmar o resumo final.',
          parameters: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Nome exato do produto conforme o cardápio' },
                    size: { type: 'string', description: 'Tamanho escolhido (se houver no cardápio)' },
                    quantity: { type: 'number' },
                    observations: { type: 'string', description: 'Observações do item' },
                    addons: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Lista de nomes dos adicionais escolhidos'
                    }
                  }
                }
              },
              customerName: { type: 'string' },
              deliveryAddress: { type: 'string' },
              paymentMethod: { type: 'string' },
              orderType: { type: 'string', enum: ['DELIVERY', 'PICKUP'] },
              changeFor: { type: 'number', description: 'Troco para quanto?' }
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
  async handleToolCall(restaurantId, toolCall, customerPhone) {
    const { name, arguments: argsString } = toolCall.function;
    const args = JSON.parse(argsString);

    switch (name) {
      case 'get_menu':
        const categories = await prisma.category.findMany({
          where: { 
            restaurantId,
            isActive: true, // Apenas categorias ativas
            ...(args.category ? { name: { contains: args.category, mode: 'insensitive' } } : {})
          },
          select: { // SELECT em vez de include para performance
            name: true,
            products: {
              where: { isAvailable: true, showInMenu: true },
              select: {
                id: true, name: true, price: true, description: true,
                sizes: { select: { name: true, price: true, globalSize: { select: { name: true } } } },
                addonGroups: { select: { name: true, addons: { select: { name: true, price: true } } } }
              }
            }
          },
          orderBy: { order: 'asc' }
        });
        
        if (categories.length === 0) return "Nenhuma categoria ou produto encontrado com esses critérios.";

        let menuText = "CARDÁPIO E PREÇOS (NUNCA INVENTE VALORES):\n";
        categories.forEach(cat => {
          if (cat.products && cat.products.length > 0) {
            menuText += `\n[${cat.name.toUpperCase()}]\n`;
            cat.products.forEach(p => {
              menuText += `- ${p.name}`;
              
              if (p.sizes && p.sizes.length > 0) {
                const sizesStr = p.sizes.map(s => `${s.name || s.globalSize?.name}: R$ ${s.price.toFixed(2)}`).join(' | ');
                menuText += ` (${sizesStr})\n`;
              } else {
                menuText += `: R$ ${p.price.toFixed(2)}\n`;
              }

              if (p.description) menuText += `  Desc: ${p.description}\n`;
              
              if (p.addonGroups && p.addonGroups.length > 0) {
                p.addonGroups.forEach(group => {
                  const addonsStr = group.addons.map(a => `${a.name}(R$ ${a.price.toFixed(2)})`).join(', ');
                  menuText += `  * ${group.name}: ${addonsStr}\n`;
                });
              }
            });
          }
        });
        return menuText;

      case 'search_products':
        const products = await prisma.product.findMany({
          where: { 
            restaurantId, 
            isAvailable: true,
            OR: [
              { name: { contains: args.query, mode: 'insensitive' } },
              { description: { contains: args.query, mode: 'insensitive' } }
            ]
          },
          include: {
            sizes: { include: { globalSize: true } },
            addonGroups: { include: { addons: true } }
          }
        });

        if (products.length === 0) return `Não encontrei nenhum produto para "${args.query}".`;
        
        return "Produtos encontrados:\n" + products.map(p => {
          let text = `- ${p.name}: R$ ${p.price.toFixed(2)}`;
          if (p.sizes.length > 0) {
            text += ` (Tamanhos: ${p.sizes.map(s => `${s.name || s.globalSize?.name}: R$ ${s.price.toFixed(2)}`).join(', ')})`;
          }
          return text;
        }).join('\n');

      case 'get_store_info':
        const knowledge = await prisma.storeKnowledge.findMany({
          where: { 
            restaurantId, 
            isActive: true,
            OR: [
              { question: { contains: args.query, mode: 'insensitive' } },
              { answer: { contains: args.query, mode: 'insensitive' } },
              { category: { contains: args.query, mode: 'insensitive' } }
            ]
          },
          take: 5
        });

        if (knowledge.length === 0) return "Não encontrei informações específicas sobre isso. Por favor, trate conforme as políticas gerais do restaurante ou peça ao cliente para aguardar um humano.";

        return "Informações encontradas:\n" + knowledge.map(k => `P: ${k.question}\nR: ${k.answer}`).join('\n---\n');

      case 'get_payment_methods':
        const methods = await prisma.paymentMethod.findMany({
          where: { restaurantId, isActive: true }
        });
        if (methods.length === 0) return "Aceitamos Dinheiro, PIX e Cartões (Crédito/Débito).";
        return "Formas de pagamento aceitas: " + methods.map(m => m.name).join(', ');

      case 'check_order_status':
        const searchPhone = normalizePhone(args.phone || customerPhone);
        console.log(`[AI] Buscando status do pedido para: ${searchPhone}`);
        
        const orderStatus = await prisma.order.findFirst({
          where: { 
            restaurantId, 
            deliveryOrder: { phone: { contains: searchPhone } } 
          },
          orderBy: { createdAt: 'desc' },
          include: { deliveryOrder: true }
        });

        if (!orderStatus) return "Não encontrei nenhum pedido recente para este número de telefone.";

        const statusMap = {
          'BUILDING': 'Sendo montado',
          'PENDING': 'Pendente (Aguardando Restaurante)',
          'PREPARING': 'Em Preparo',
          'READY': 'Pronto',
          'SHIPPED': 'Saiu para Entrega',
          'DELIVERED': 'Entregue',
          'CANCELED': 'Cancelado',
          'COMPLETED': 'Finalizado'
        };
        return `Pedido #${orderStatus.id} - Status: ${statusMap[orderStatus.status] || orderStatus.status}.`;

      case 'create_order':
        try {
          console.log(`[AI] Iniciando criação de pedido para ${args.customerName}`);
          let calculatedTotal = 0;
          const orderItemsData = [];

          for (const item of args.items) {
            // Garante quantidade mínima de 1 para evitar NaN
            const quantity = Number(item.quantity) || 1;

            // Tenta buscar por ID se a IA for inteligente o suficiente para passar o ID do prompt, caso contrário busca por nome flexível
            const dbProduct = await prisma.product.findFirst({
              where: { 
                restaurantId, 
                isAvailable: true,
                OR: [
                  { name: { contains: item.name, mode: 'insensitive' } },
                  { id: item.productId || undefined } // Suporte para ID se fornecido
                ]
              },
              include: { 
                sizes: { include: { globalSize: true } },
                addonGroups: { include: { addons: true } }
              }
            });

            if (!dbProduct) {
              console.warn(`[AI] Produto NÃO localizado: ${item.name}`);
              return `ERRO: Não consegui confirmar o produto "${item.name}" no sistema. Por favor, peça ao cliente para confirmar se o nome está exatamente como no cardápio ou tente buscá-lo novamente.`;
            }

            let itemPrice = dbProduct.price;
            let sizeJson = null;

            // Busca tamanho de forma MUITO mais flexível
            if (dbProduct.sizes.length > 0) {
              const selectedSize = dbProduct.sizes.find(s => 
                (s.name && item.size && s.name.toLowerCase().includes(item.size.toLowerCase())) || 
                (s.globalSize?.name && item.size && s.globalSize.name.toLowerCase().includes(item.size.toLowerCase()))
              );

              if (selectedSize) {
                itemPrice = selectedSize.price;
                sizeJson = JSON.stringify({ name: selectedSize.name || selectedSize.globalSize?.name, price: itemPrice });
              } else if (item.size) {
                return `ERRO: O tamanho "${item.size}" não existe para "${dbProduct.name}". Escolha: ${dbProduct.sizes.map(s => s.name || s.globalSize?.name).join(', ')}.`;
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
              }
            }

            calculatedTotal += (itemPrice + addonsTotal) * quantity;
            
            orderItemsData.push({
              productId: dbProduct.id,
              quantity: quantity,
              priceAtTime: itemPrice + addonsTotal,
              observations: item.observations || '',
              sizeJson,
              addonsJson: selectedAddons.length > 0 ? JSON.stringify(selectedAddons) : null
            });
          }

          // Busca configurações do restaurante para taxa de entrega
          const restaurantInfo = await prisma.restaurant.findUnique({
            where: { id: restaurantId },
            include: { settings: true }
          });
          
          const deliveryFee = restaurantInfo?.settings?.deliveryFee || 0;
          calculatedTotal += deliveryFee;

          // Cria o Pedido
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
                  deliveryFee: deliveryFee 
                }
              }
            },
            include: { deliveryOrder: true, items: true }
          });

          socketLib.emitToRestaurant(restaurantId, 'new_order', newOrder);
          return `SUCESSO: Pedido #${newOrder.id} criado. Total: R$ ${calculatedTotal.toFixed(2)}. Informe ao cliente que o pedido foi enviado para a cozinha!`;
        } catch (error) {
          console.error('[AI ORDER ERROR]', error);
          return "ERRO: Ocorreu uma falha técnica ao salvar o pedido. Tente novamente ou peça ajuda.";
        }

      default:
        return "Função não implementada.";
    }
  }

  async clearChatHistory(restaurantId, customerPhone) {
    try {
      await prisma.whatsAppChatMessage.deleteMany({
        where: { restaurantId, customerPhone }
      });
      return true;
    } catch (error) {
      console.error('[AI SERVICE CLEAR HISTORY ERROR]', error);
      return false;
    }
  }

  async handleMessage(restaurantId, customerPhone, messageContent) {
    try {
      if (!process.env.OPENAI_API_KEY) return "Erro: API Key não configurada.";

      // --- 1. RATE LIMITING SIMPLES (Memória) ---
      if (!this.rateLimits) this.rateLimits = new Map();
      const now = Date.now();
      const userLimit = this.rateLimits.get(customerPhone) || { count: 0, firstMsg: now };
      
      if (now - userLimit.firstMsg > 60000) { // Reseta a cada 1 minuto
        userLimit.count = 0;
        userLimit.firstMsg = now;
      }
      
      userLimit.count++;
      this.rateLimits.set(customerPhone, userLimit);

      if (userLimit.count > 10) { // Máximo 10 mensagens por minuto
        return "Você está enviando mensagens muito rápido. Por favor, aguarde um minuto.";
      }

      const settings = await prisma.whatsAppSettings.findUnique({ where: { restaurantId } });
      if (!settings || !settings.agentEnabled) return null;

      const history = await prisma.whatsAppChatMessage.findMany({
        where: { restaurantId, customerPhone },
        orderBy: { timestamp: 'desc' },
        take: 15 // Reduzido de 20 para 15 para economizar tokens de contexto
      });

      const restaurant = await prisma.restaurant.findUnique({ 
        where: { id: restaurantId },
        select: { name: true, address: true, settings: { select: { deliveryFee: true, deliveryTime: true } } }
      });

      const systemPrompt = `Você é o ${settings.agentName || 'Atendente'}, o assistente virtual do restaurante ${restaurant.name}.

${settings.agentPersona || ''}

OBJETIVO: Realizar pedidos sem erros. 

DIRETRIZES DE CUSTO E SEGURANÇA:
1. CONSULTA OBRIGATÓRIA: Você NÃO conhece o cardápio de cor. Antes de falar de qualquer produto ou preço, você DEVE usar as ferramentas 'get_menu' ou 'search_products'.
2. PREÇOS REAIS: Nunca invente preços. Se a ferramenta não retornar um preço, diga que não localizou o item.
3. RESUMO ANTES DE FINALIZAR: Sempre apresente um resumo com valores e peça confirmação antes de chamar 'create_order'.
4. PAGAMENTO E ENDEREÇO: Sempre confirme o método de pagamento e o endereço/tipo de entrega (Delivery ou Retirada).

DADOS DO RESTAURANTE:
- Nome: ${restaurant.name}
- Taxa de Entrega: R$ ${restaurant.settings?.deliveryFee || 0}
- Tempo Estimado: ${restaurant.settings?.deliveryTime || '30-40 min'}`;

      // Formata o histórico cronológico
      const formattedHistory = history.reverse().map(msg => ({ 
        role: msg.role === 'assistant' ? 'assistant' : 'user', 
        content: msg.content 
      }));

      let messages = [
        { role: 'system', content: systemPrompt },
        ...formattedHistory,
        { role: 'user', content: messageContent }
      ];

      const response = await this.openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools: this.getTools(),
        tool_choice: 'auto',
      });

      let responseMessage = response.choices[0].message;

      if (responseMessage.tool_calls) {
        messages.push(responseMessage);
        for (const toolCall of responseMessage.tool_calls) {
          const toolResult = await this.handleToolCall(restaurantId, toolCall, customerPhone);
          messages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: toolCall.function.name,
            content: toolResult,
          });
        }

        const secondResponse = await this.openaiClient.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
        });
        responseMessage = secondResponse.choices[0].message;
      }

      const responseText = responseMessage.content;

      await prisma.whatsAppChatMessage.createMany({
        data: [
          { restaurantId, customerPhone, role: 'user', content: messageContent },
          { restaurantId, customerPhone, role: 'assistant', content: responseText }
        ]
      });

      return responseText;
    } catch (error) {
      console.error('[AI SERVICE ERROR]', error);
      return "Estou com uma pequena instabilidade agora, mas logo volto ao normal. Pode repetir sua mensagem?";
    }
  }
}

module.exports = new WhatsAppAIService();
