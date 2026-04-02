/**
 * LoyaltySkill - Programa de fidelidade, pontos e cashback
 * 
 * Tools: get_loyalty_info, get_loyalty_balance
 */

const BaseSkill = require('./BaseSkill');
const prisma = require('../../lib/prisma');
const { normalizePhone } = require('../../lib/phoneUtils');

class LoyaltySkill extends BaseSkill {
  get name() { return 'loyalty'; }
  get description() { return 'Programa de fidelidade: pontos, cashback e regras de acúmulo'; }

  getTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'get_loyalty_info',
          description: 'Retorna informações sobre o programa de fidelidade do restaurante: como funciona, quantos pontos ganha por real, benefícios. Use quando o cliente perguntar sobre fidelidade, pontos, cashback ou vantagens.',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_loyalty_balance',
          description: 'Consulta o saldo de pontos e cashback de um cliente específico. Use quando o cliente perguntar "quantos pontos tenho?" ou "meu saldo".',
          parameters: {
            type: 'object',
            properties: {
              phone: { type: 'string', description: 'Telefone do cliente' }
            },
            required: ['phone']
          }
        }
      }
    ];
  }

  async handleToolCall(toolName, args, context) {
    switch (toolName) {
      case 'get_loyalty_info':
        return this.getLoyaltyInfo(context.restaurantId);
      case 'get_loyalty_balance':
        return this.getLoyaltyBalance(context.restaurantId, args.phone || context.customerPhone);
      default:
        return `Tool "${toolName}" não implementada em LoyaltySkill.`;
    }
  }

  getSystemPrompt(context) {
    return `FIDELIDADE:
- Use 'get_loyalty_info' para explicar como funciona o programa de fidelidade
- Use 'get_loyalty_balance' para consultar pontos e cashback de um cliente
- Cada real gasto gera pontos conforme configuração do restaurante
- Cashback é devolvido como crédito para próximos pedidos
- Incentive o cliente a se cadastrar para acumular pontos`;
  }

  async getLoyaltyInfo(restaurantId) {
    const settings = await prisma.restaurantSettings.findUnique({
      where: { restaurantId }
    });

    if (!settings?.loyaltyEnabled) {
      return 'O programa de fidelidade ainda não está ativo neste restaurante.';
    }

    let text = '💎 *PROGRAMA DE FIDELIDADE*\n\n';
    text += `📊 *Como funciona:*\n`;
    text += `• A cada R$ 1,00 gasto, você ganha ${settings.pointsPerReal || 1} ponto(s)\n`;
    
    if (settings.cashbackPercentage > 0) {
      text += `• Cashback: ${settings.cashbackPercentage}% do valor do pedido volta como crédito\n`;
    }

    text += `\n🎁 *Benefícios:*\n`;
    text += `• Acumule pontos a cada pedido\n`;
    text += `• Troque pontos por descontos e brindes\n`;
    if (settings.cashbackPercentage > 0) {
      text += `• Ganhe cashback automático em cada compra\n`;
    }
    text += `\nFaça seu cadastro para começar a acumular!`;

    return text;
  }

  async getLoyaltyBalance(restaurantId, phone) {
    const normalizedPhone = normalizePhone(phone);

    const customer = await prisma.customer.findFirst({
      where: {
        restaurantId,
        phone: { contains: normalizedPhone.slice(-8) }
      }
    });

    if (!customer) {
      return 'Cliente não encontrado. Faça seu cadastro primeiro para acumular pontos!';
    }

    let text = `💎 *SEU SALDO DE FIDELIDADE*\n\n`;
    text += `📛 ${customer.name}\n`;
    text += `⭐ Pontos: ${customer.loyaltyPoints || 0}\n`;
    
    if (customer.cashbackBalance > 0) {
      text += `💰 Cashback: R$ ${customer.cashbackBalance.toFixed(2).replace('.', ',')}\n`;
    }

    // Calcula quantos pedidos faltam para próximo benefício (exemplo: a cada 100 pontos)
    const nextMilestone = Math.ceil((customer.loyaltyPoints + 1) / 100) * 100;
    const pointsNeeded = nextMilestone - customer.loyaltyPoints;
    
    if (pointsNeeded > 0 && pointsNeeded < 100) {
      text += `\n🎯 Faltam apenas ${pointsNeeded} pontos para o próximo benefício!`;
    }

    return text;
  }
}

module.exports = new LoyaltySkill();
