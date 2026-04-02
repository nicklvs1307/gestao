/**
 * CustomerSkill - Busca, cadastro e histórico de clientes
 * 
 * Tools: search_customer, create_customer, update_customer
 */

const BaseSkill = require('./BaseSkill');
const prisma = require('../../lib/prisma');
const { normalizePhone } = require('../../lib/phoneUtils');

class CustomerSkill extends BaseSkill {
  get name() { return 'customer'; }
  get description() { return 'Busca clientes, cria cadastro, atualiza dados e consulta histórico'; }

  getTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'search_customer',
          description: 'Busca um cliente pelo telefone para ver dados cadastrais, endereço, histórico de pedidos e pontos de fidelidade. Use ANTES de criar um pedido para identificar o cliente.',
          parameters: {
            type: 'object',
            properties: {
              phone: { type: 'string', description: 'Telefone do cliente (com DDI e DDD, ex: 5531999999999)' }
            },
            required: ['phone']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'create_customer',
          description: 'Cria um novo cadastro de cliente. Use quando o cliente não estiver cadastrado e quiser se identificar ou fizer o primeiro pedido.',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Nome completo do cliente' },
              phone: { type: 'string', description: 'Telefone do cliente' },
              address: { type: 'string', description: 'Endereço completo (rua, número, bairro)' },
              street: { type: 'string', description: 'Nome da rua' },
              number: { type: 'string', description: 'Número do endereço' },
              neighborhood: { type: 'string', description: 'Bairro' },
              city: { type: 'string', description: 'Cidade' },
              state: { type: 'string', description: 'Estado (UF)' },
              zipCode: { type: 'string', description: 'CEP' },
              complement: { type: 'string', description: 'Complemento (apto, bloco, etc)' },
              reference: { type: 'string', description: 'Ponto de referência' }
            },
            required: ['name', 'phone']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'update_customer',
          description: 'Atualiza dados de um cliente existente (endereço, nome, etc). Use quando o cliente pedir para alterar algum dado.',
          parameters: {
            type: 'object',
            properties: {
              phone: { type: 'string', description: 'Telefone do cliente para localizar' },
              name: { type: 'string', description: 'Novo nome' },
              address: { type: 'string', description: 'Novo endereço' },
              street: { type: 'string', description: 'Nova rua' },
              number: { type: 'string', description: 'Novo número' },
              neighborhood: { type: 'string', description: 'Novo bairro' },
              city: { type: 'string', description: 'Nova cidade' },
              state: { type: 'string', description: 'Novo estado' },
              zipCode: { type: 'string', description: 'Novo CEP' },
              complement: { type: 'string', description: 'Novo complemento' }
            },
            required: ['phone']
          }
        }
      }
    ];
  }

  async handleToolCall(toolName, args, context) {
    switch (toolName) {
      case 'search_customer':
        return this.searchCustomer(context.restaurantId, args.phone || context.customerPhone);
      case 'create_customer':
        return this.createCustomer(context.restaurantId, args);
      case 'update_customer':
        return this.updateCustomer(context.restaurantId, args.phone || context.customerPhone, args);
      default:
        return `Tool "${toolName}" não implementada em CustomerSkill.`;
    }
  }

  getSystemPrompt(context) {
    return `IDENTIFICAÇÃO DO CLIENTE:
- SEMPRE use 'search_customer' com o telefone do contato antes de criar um pedido
- Se o cliente não for encontrado, ofereça criar cadastro com 'create_customer'
- Ao criar pedido, use os dados do cliente encontrado (nome, endereço)
- Se o cliente pedir para alterar endereço, use 'update_customer'
- Clientes cadastrados ganham pontos de fidelidade a cada pedido`;
  }

  async searchCustomer(restaurantId, phone) {
    const normalizedPhone = normalizePhone(phone);

    const customer = await prisma.customer.findFirst({
      where: {
        restaurantId,
        phone: { contains: normalizedPhone.slice(-8) }
      },
      select: {
        id: true, name: true, phone: true, email: true,
        address: true, street: true, number: true, neighborhood: true,
        city: true, state: true, zipCode: true, complement: true, reference: true,
        loyaltyPoints: true, cashbackBalance: true, createdAt: true,
        orders: {
          where: { status: { notIn: ['CANCELED'] } },
          select: {
            id: true, total: true, status: true, createdAt: true,
            items: { select: { quantity: true, product: { select: { name: true } } } }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!customer) {
      return this.formatNewCustomer(phone);
    }

    return this.formatCustomer(customer);
  }

  async createCustomer(restaurantId, data) {
    try {
      const existing = await prisma.customer.findFirst({
        where: { restaurantId, phone: { contains: normalizePhone(data.phone).slice(-8) } }
      });

      if (existing) {
        return `Este cliente já está cadastrado como "${existing.name}". Use 'update_customer' para alterar dados.`;
      }

      const customer = await prisma.customer.create({
        data: {
          restaurantId,
          name: data.name,
          phone: normalizePhone(data.phone),
          address: data.address || null,
          street: data.street || null,
          number: data.number || null,
          neighborhood: data.neighborhood || null,
          city: data.city || null,
          state: data.state || null,
          zipCode: data.zipCode || null,
          complement: data.complement || null,
          reference: data.reference || null
        }
      });

      return `✅ *Cadastro criado com sucesso!*\n\nNome: ${customer.name}\nTelefone: ${customer.phone}\n\nVocê já começa com 0 pontos de fidelidade e ganhará mais a cada pedido!`;
    } catch (error) {
      return `ERRO ao criar cadastro: ${error.message}. Tente novamente.`;
    }
  }

  async updateCustomer(restaurantId, phone, data) {
    const normalizedPhone = normalizePhone(phone);

    const customer = await prisma.customer.findFirst({
      where: { restaurantId, phone: { contains: normalizedPhone.slice(-8) } }
    });

    if (!customer) {
      return 'Cliente não encontrado. Use create_customer para criar um novo cadastro.';
    }

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        name: data.name || customer.name,
        address: data.address || customer.address,
        street: data.street || customer.street,
        number: data.number || customer.number,
        neighborhood: data.neighborhood || customer.neighborhood,
        city: data.city || customer.city,
        state: data.state || customer.state,
        zipCode: data.zipCode || customer.zipCode,
        complement: data.complement || customer.complement
      }
    });

    return `✅ *Dados atualizados!*\n\nNome: ${updated.name}\nEndereço: ${updated.address || updated.street ? `${updated.street}, ${updated.number || 'S/N'} - ${updated.neighborhood || ''}` : 'Não informado'}`;
  }

  formatCustomer(customer) {
    let text = `👤 *CLIENTE IDENTIFICADO*\n\n`;
    text += `📛 Nome: ${customer.name || 'Não informado'}\n`;
    text += `📱 Telefone: ${customer.phone}\n`;
    
    if (customer.email) text += `✉️ E-mail: ${customer.email}\n`;

    const addrParts = [customer.street, customer.number, customer.neighborhood, customer.city, customer.state].filter(Boolean);
    if (addrParts.length > 0) {
      text += `📍 Endereço: ${addrParts.join(', ')}\n`;
    }
    if (customer.complement) text += `   Complemento: ${customer.complement}\n`;
    if (customer.reference) text += `   Referência: ${customer.reference}\n`;

    text += `\n💎 Fidelidade: ${customer.loyaltyPoints || 0} pontos`;
    if (customer.cashbackBalance > 0) {
      text += ` | 💰 Cashback: R$ ${customer.cashbackBalance.toFixed(2).replace('.', ',')}`;
    }

    if (customer.orders && customer.orders.length > 0) {
      text += `\n\n📊 Histórico: ${customer.orders.length} pedidos`;
      const totalSpent = customer.orders.reduce((sum, o) => sum + Number(o.total), 0);
      text += ` | Total: R$ ${totalSpent.toFixed(2).replace('.', ',')}`;
      
      const lastOrder = customer.orders[0];
      if (lastOrder) {
        const itemsList = lastOrder.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ');
        text += `\n\nÚltimo pedido (#${lastOrder.id}):\n  ${itemsList}\n  R$ ${Number(lastOrder.total).toFixed(2).replace('.', ',')} - ${lastOrder.status}`;
      }
    }

    return text;
  }

  formatNewCustomer(phone) {
    return `👋 Cliente não encontrado para o telefone ${phone}.\n\nPara criar o cadastro, preciso de:\n• Nome completo\n• Endereço (se for delivery)\n\nCom o cadastro, o cliente ganha pontos de fidelidade a cada pedido!`;
  }
}

module.exports = new CustomerSkill();
