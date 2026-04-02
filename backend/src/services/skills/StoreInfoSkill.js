/**
 * StoreInfoSkill - Informações da loja, horários, políticas e FAQ
 * 
 * Tools: get_store_info, get_operating_hours
 * 
 * Usa a base de conhecimento (StoreKnowledge) como fonte RAG
 * e informações do restaurante para responder perguntas gerais.
 */

const BaseSkill = require('./BaseSkill');
const prisma = require('../../lib/prisma');

class StoreInfoSkill extends BaseSkill {
  get name() { return 'store_info'; }
  get description() { return 'Informações da loja: horários, políticas, FAQ, endereço e dados gerais'; }

  getTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'get_store_info',
          description: 'Busca informações gerais sobre o restaurante: políticas, horários, perguntas frequentes, regras da casa. Use para qualquer dúvida que não seja sobre cardápio ou pedido.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'O que o cliente quer saber (ex: "entrega", "estacionamento", "funcionamento", "política de cancelamento")' }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_operating_hours',
          description: 'Retorna os horários de funcionamento do restaurante por dia da semana e se está aberto agora. Use quando o cliente perguntar horário ou se está aberto.',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_restaurant_info',
          description: 'Retorna informações básicas do restaurante: nome, endereço, telefone, cidade. Use quando o cliente perguntar "onde vocês ficam?", "qual o endereço?", "telefone".',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      }
    ];
  }

  async handleToolCall(toolName, args, context) {
    switch (toolName) {
      case 'get_store_info':
        return this.getStoreInfo(context.restaurantId, args.query);
      case 'get_operating_hours':
        return this.getOperatingHours(context.restaurantId);
      case 'get_restaurant_info':
        return this.getRestaurantInfo(context.restaurantId);
      default:
        return `Tool "${toolName}" não implementada em StoreInfoSkill.`;
    }
  }

  getSystemPrompt(context) {
    return `INFORMAÇÕES GERAIS DO RESTAURANTE:
- Use 'get_store_info' para buscar na base de conhecimento (FAQ, políticas, regras)
- Use 'get_operating_hours' para informar horários de funcionamento
- Use 'get_restaurant_info' para endereço, telefone e dados básicos
- Se não encontrar informação na base de conhecimento, seja honesto e diga que vai verificar com a equipe
- Não invente políticas ou horários`;
  }

  async getStoreInfo(restaurantId, query) {
    const knowledge = await prisma.storeKnowledge.findMany({
      where: {
        restaurantId,
        isActive: true,
        OR: [
          { question: { contains: query, mode: 'insensitive' } },
          { answer: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 5
    });

    if (knowledge.length === 0) {
      return `Não encontrei informações específicas sobre "${query}" na nossa base de conhecimento. Esta é uma dúvida que posso verificar com a equipe. Enquanto isso, posso ajudar com cardápio ou pedidos!`;
    }

    let text = `📖 *Informações sobre "${query}"*\n\n`;
    knowledge.forEach((k, i) => {
      text += `${i + 1}. *${k.question}*\n   ${k.answer}\n\n`;
    });

    return text;
  }

  async getOperatingHours(restaurantId) {
    const settings = await prisma.restaurantSettings.findUnique({
      where: { restaurantId }
    });

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { name: true, openingHours: true }
    });

    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    let text = `🕐 *HORÁRIOS DE FUNCIONAMENTO*\n\n`;

    if (settings?.operatingHours) {
      try {
        const hours = typeof settings.operatingHours === 'string' 
          ? JSON.parse(settings.operatingHours) 
          : settings.operatingHours;

        for (let i = 0; i < 7; i++) {
          const dayHours = hours.find(h => h.dayOfWeek === i);
          const isToday = i === currentDay;
          const marker = isToday ? ' 👈 HOJE' : '';

          if (dayHours?.isClosed) {
            text += `${dayNames[i]}: Fechado${marker}\n`;
          } else if (dayHours) {
            text += `${dayNames[i]}: ${dayHours.openingTime} - ${dayHours.closingTime}${marker}\n`;
          } else {
            text += `${dayNames[i]}: ${settings?.deliveryTime ? 'Consultar' : 'Não informado'}${marker}\n`;
          }
        }

        // Verifica se está aberto agora
        const todayHours = hours.find(h => h.dayOfWeek === currentDay);
        if (todayHours && !todayHours.isClosed) {
          const isOpen = currentTime >= todayHours.openingTime && currentTime <= todayHours.closingTime;
          text += `\n${isOpen ? '✅ Estamos ABERTOS agora!' : '❌ Estamos FECHADOS no momento.'}`;
        }
      } catch (e) {
        text += `Horários não configurados corretamente.\n`;
      }
    } else if (restaurant?.openingHours) {
      text += `${restaurant.openingHours}\n`;
    } else {
      text += `Horários não configurados. Consulte a equipe do restaurante.`;
    }

    return text;
  }

  async getRestaurantInfo(restaurantId) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    });

    if (!restaurant) {
      return 'Informações do restaurante não disponíveis.';
    }

    let text = `🏪 *SOBRE NÓS*\n\n`;
    text += `📛 ${restaurant.name}\n`;
    
    if (restaurant.address) text += `📍 ${restaurant.address}\n`;
    if (restaurant.city && restaurant.state) text += `   ${restaurant.city}/${restaurant.state}\n`;
    if (restaurant.phone) text += `📞 ${restaurant.phone}\n`;

    return text;
  }
}

module.exports = new StoreInfoSkill();
