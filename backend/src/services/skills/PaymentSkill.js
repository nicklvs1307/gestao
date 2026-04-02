/**
 * PaymentSkill - Formas de pagamento, troco, taxas e informações
 * 
 * Tools: get_payment_methods, calculate_change
 */

const BaseSkill = require('./BaseSkill');
const prisma = require('../../lib/prisma');

class PaymentSkill extends BaseSkill {
  get name() { return 'payment'; }
  get description() { return 'Consulta formas de pagamento, calcula troco e informa taxas'; }

  getTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'get_payment_methods',
          description: 'Retorna todas as formas de pagamento aceitas pelo restaurante, incluindo se aceitam para delivery, retirada e salão. Use quando o cliente perguntar sobre pagamento.',
          parameters: {
            type: 'object',
            properties: {
              orderType: { type: 'string', enum: ['DELIVERY', 'PICKUP'], description: 'Tipo de pedido para filtrar métodos compatíveis (opcional)' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'calculate_change',
          description: 'Calcula o troco para pagamento em dinheiro. Use quando o cliente informar quanto vai pagar e precisar saber o troco.',
          parameters: {
            type: 'object',
            properties: {
              totalAmount: { type: 'number', description: 'Valor total do pedido' },
              paymentAmount: { type: 'number', description: 'Valor que o cliente vai pagar (nota que vai entregar)' }
            },
            required: ['totalAmount', 'paymentAmount']
          }
        }
      }
    ];
  }

  async handleToolCall(toolName, args, context) {
    switch (toolName) {
      case 'get_payment_methods':
        return this.getPaymentMethods(context.restaurantId, args.orderType);
      case 'calculate_change':
        return this.calculateChange(args.totalAmount, args.paymentAmount);
      default:
        return `Tool "${toolName}" não implementada em PaymentSkill.`;
    }
  }

  getSystemPrompt(context) {
    return `PAGAMENTO:
- Use 'get_payment_methods' para listar formas de pagamento aceitas
- Use 'calculate_change' para calcular troco quando o cliente pagar em dinheiro
- SEMPRE confirme a forma de pagamento antes de criar o pedido
- Se o cliente pagar em dinheiro, pergunte se precisa de troco e para quanto
- Aceitamos PIX, cartões e dinheiro. Verifique os métodos ativos com a tool.`;
  }

  async getPaymentMethods(restaurantId, orderType = null) {
    const methods = await prisma.paymentMethod.findMany({
      where: { 
        restaurantId, 
        isActive: true,
        ...(orderType === 'PICKUP' ? { allowPos: true } : { allowDelivery: true })
      },
      orderBy: { name: 'asc' }
    });

    if (methods.length === 0) {
      return 'Aceitamos Dinheiro, PIX e Cartões (Crédito/Débito).';
    }

    let text = '💳 *FORMAS DE PAGAMENTO*\n\n';
    methods.forEach(m => {
      const icons = {
        'CASH': '💵',
        'PIX': '📱',
        'CREDIT_CARD': '💳',
        'DEBIT_CARD': '💳',
        'VOUCHER': '🎫',
        'OTHER': '💰'
      };
      const icon = icons[m.type] || '💰';
      text += `${icon} ${m.name}`;
      
      if (m.feePercentage > 0) {
        text += ` (taxa: ${m.feePercentage}%)`;
      }
      if (m.daysToReceive > 0) {
        text += ` (recebe em ${m.daysToReceive} dia${m.daysToReceive > 1 ? 's' : ''})`;
      }
      text += '\n';
    });

    return text;
  }

  calculateChange(totalAmount, paymentAmount) {
    const total = Number(totalAmount);
    const payment = Number(paymentAmount);

    if (isNaN(total) || isNaN(payment)) {
      return 'ERRO: Valores inválidos para cálculo de troco.';
    }

    if (payment < total) {
      const diff = (total - payment).toFixed(2).replace('.', ',');
      return `⚠️ O valor informado (R$ ${payment.toFixed(2).replace('.', ',')}) é menor que o total (R$ ${total.toFixed(2).replace('.', ',')}). Faltam R$ ${diff}.`;
    }

    if (payment === total) {
      return '✅ Valor exato! Sem troco.';
    }

    const change = (payment - total).toFixed(2).replace('.', ',');
    return `💰 *Troco: R$ ${change}*\n\nTotal: R$ ${total.toFixed(2).replace('.', ',')}\nPago: R$ ${payment.toFixed(2).replace('.', ',')}\nTroco: R$ ${change}`;
  }
}

module.exports = new PaymentSkill();
