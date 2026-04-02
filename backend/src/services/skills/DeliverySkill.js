/**
 * DeliverySkill - Áreas de entrega, taxas por região e tempo estimado
 * 
 * Tools: check_delivery_area, get_delivery_fee, get_delivery_time
 */

const BaseSkill = require('./BaseSkill');
const prisma = require('../../lib/prisma');

class DeliverySkill extends BaseSkill {
  get name() { return 'delivery'; }
  get description() { return 'Verifica áreas de entrega, calcula taxas e informa tempo estimado'; }

  getTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'check_delivery_area',
          description: 'Verifica se um endereço está dentro da área de entrega do restaurante. Use quando o cliente informar o endereço e você precisar confirmar se entregamos lá.',
          parameters: {
            type: 'object',
            properties: {
              address: { type: 'string', description: 'Endereço completo ou nome do bairro' },
              neighborhood: { type: 'string', description: 'Nome do bairro' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_delivery_fee',
          description: 'Retorna a taxa de entrega padrão do restaurante e taxas por área de entrega. Use para informar o custo de entrega ao cliente.',
          parameters: {
            type: 'object',
            properties: {
              area: { type: 'string', description: 'Nome da área de entrega ou bairro (opcional)' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_delivery_time',
          description: 'Retorna o tempo estimado de entrega do restaurante. Use quando o cliente perguntar "quanto tempo demora?" ou "qual o prazo de entrega?".',
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
      case 'check_delivery_area':
        return this.checkDeliveryArea(context.restaurantId, args.address, args.neighborhood);
      case 'get_delivery_fee':
        return this.getDeliveryFee(context.restaurantId, args.area);
      case 'get_delivery_time':
        return this.getDeliveryTime(context.restaurantId);
      default:
        return `Tool "${toolName}" não implementada em DeliverySkill.`;
    }
  }

  getSystemPrompt(context) {
    return `ENTREGA:
- Use 'check_delivery_area' para verificar se o endereço do cliente está na área de entrega
- Use 'get_delivery_fee' para informar a taxa de entrega
- Use 'get_delivery_time' para informar o tempo estimado
- Se o endereço não estiver na área, ofereça a opção de retirada (PICKUP)
- A taxa de entrega padrão é cobrada para todos os pedidos delivery, salvo áreas específicas com taxas diferentes`;
  }

  async checkDeliveryArea(restaurantId, address, neighborhood) {
    const query = neighborhood || address;
    if (!query) {
      return 'Informe o endereço ou bairro para verificar a área de entrega.';
    }

    const areas = await prisma.deliveryArea.findMany({
      where: { restaurantId, isActive: true }
    });

    if (areas.length === 0) {
      // Sem áreas configuradas, usa taxa padrão
      const settings = await prisma.restaurantSettings.findUnique({
        where: { restaurantId }
      });
      return `Não temos áreas de entrega configuradas. Usamos taxa única de R$ ${(settings?.deliveryFee || 0).toFixed(2).replace('.', ',')} para toda a região.`;
    }

    // Busca por correspondência no nome da área
    const matchedArea = areas.find(a => 
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      query.toLowerCase().includes(a.name.toLowerCase())
    );

    if (matchedArea) {
      return `✅ Entregamos na região de "${matchedArea.name}"!\nTaxa de entrega: R$ ${matchedArea.fee.toFixed(2).replace('.', ',')}`;
    }

    // Se usa raio, informa que precisa confirmar
    const radiusArea = areas.find(a => a.type === 'RADIUS' && a.radius);
    if (radiusArea) {
      const radiusKm = (radiusArea.radius / 1000).toFixed(1);
      return `📍 Temos entrega num raio de ${radiusKm}km. Para confirmar se seu endereço está dentro da área, informe o bairro ou ponto de referência mais próximo.`;
    }

    return `Não identificamos "${query}" nas nossas áreas de entrega cadastradas. Áreas disponíveis:\n${areas.map(a => `• ${a.name} - R$ ${a.fee.toFixed(2).replace('.', ',')}`).join('\n')}\n\nSe seu bairro não está listado, entre em contato para confirmar.`;
  }

  async getDeliveryFee(restaurantId, area) {
    if (area) {
      const deliveryArea = await prisma.deliveryArea.findFirst({
        where: { 
          restaurantId, 
          isActive: true,
          name: { contains: area, mode: 'insensitive' }
        }
      });

      if (deliveryArea) {
        return `Taxa de entrega para "${deliveryArea.name}": R$ ${deliveryArea.fee.toFixed(2).replace('.', ',')}`;
      }
    }

    const settings = await prisma.restaurantSettings.findUnique({
      where: { restaurantId }
    });

    const defaultFee = settings?.deliveryFee || 0;

    const areas = await prisma.deliveryArea.findMany({
      where: { restaurantId, isActive: true }
    });

    if (areas.length > 0) {
      let text = '📍 *TAXAS DE ENTREGA*\n\n';
      areas.forEach(a => {
        text += `• ${a.name}: R$ ${a.fee.toFixed(2).replace('.', ',')}\n`;
      });
      text += `\nTaxa padrão: R$ ${defaultFee.toFixed(2).replace('.', ',')}`;
      return text;
    }

    return `Taxa de entrega: R$ ${defaultFee.toFixed(2).replace('.', ',')}`;
  }

  async getDeliveryTime(restaurantId) {
    const settings = await prisma.restaurantSettings.findUnique({
      where: { restaurantId }
    });

    const deliveryTime = settings?.deliveryTime || '30-40 min';

    return `⏱️ *Tempo estimado de entrega: ${deliveryTime}*\n\nO tempo pode variar dependendo da demanda e distância. Em horários de pico (19h-21h), pode levar um pouco mais.`;
  }
}

module.exports = new DeliverySkill();
