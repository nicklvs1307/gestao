/**
 * MenuSkill - Cardápio, busca de produtos, categorias e promoções
 * 
 * Tools: get_menu, search_products, get_categories, get_promotions
 */

const BaseSkill = require('./BaseSkill');
const prisma = require('../../lib/prisma');

class MenuSkill extends BaseSkill {
  get name() { return 'menu'; }
  get description() { return 'Consulta cardápio, busca produtos, categorias e promoções ativas'; }

  getTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'get_menu',
          description: 'Retorna o cardápio completo ou filtrado por categoria. Use quando o cliente pedir para ver o cardápio, menu, ou perguntar o que o restaurante tem.',
          parameters: {
            type: 'object',
            properties: {
              category: { type: 'string', description: 'Nome da categoria para filtrar (ex: "Pizzas", "Bebidas"). Deixe vazio para cardápio completo.' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_products',
          description: 'Busca produtos pelo nome ou descrição. Use quando o cliente mencionar um produto específico como "pizza", "hambúrguer", "suco".',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Termo de busca (ex: "pizza", "x-tudo", "refrigerante")' }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_categories',
          description: 'Lista todas as categorias disponíveis do cardápio. Use quando o cliente perguntar "quais categorias vocês têm?" ou "o que vocês servem?".',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_promotions',
          description: 'Retorna promoções ativas do momento. Use quando o cliente perguntar sobre promoções, ofertas, descontos ou "o que tem de especial hoje?".',
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
      case 'get_menu':
        return this.getMenu(context.restaurantId, args.category);
      case 'search_products':
        return this.searchProducts(context.restaurantId, args.query);
      case 'get_categories':
        return this.getCategories(context.restaurantId);
      case 'get_promotions':
        return this.getPromotions(context.restaurantId);
      default:
        return `Tool "${toolName}" não implementada em MenuSkill.`;
    }
  }

  getSystemPrompt(context) {
    return `CARDÁPIO E PRODUTOS:
- Use 'get_menu' para mostrar o cardápio completo ou por categoria
- Use 'search_products' para buscar produtos específicos pelo nome
- Use 'get_categories' para listar as categorias disponíveis
- Use 'get_promotions' para mostrar promoções ativas
- NUNCA invente preços ou produtos. Sempre consulte as ferramentas primeiro.
- Ao apresentar itens com tamanhos, mostre TODAS as opções de tamanho e preço.
- Ao apresentar itens com adicionais, liste os grupos e seus adicionais com preços.`;
  }

  async getMenu(restaurantId, category = null) {
    const whereClause = { restaurantId, isActive: true };
    if (category) {
      whereClause.name = { contains: category, mode: 'insensitive' };
    }

    const categories = await prisma.category.findMany({
      where: whereClause,
      select: {
        name: true,
        products: {
          where: { isAvailable: true, showInMenu: true },
          select: {
            id: true, name: true, price: true, description: true, imageUrl: true,
            sizes: { select: { name: true, price: true, globalSize: { select: { name: true } } } },
            addonGroups: { select: { name: true, addons: { select: { name: true, price: true } } } }
          }
        }
      },
      orderBy: { order: 'asc' }
    });

    if (categories.length === 0) {
      return category 
        ? `Não encontrei a categoria "${category}". Use 'get_categories' para ver as categorias disponíveis.`
        : 'Nenhuma categoria ou produto encontrado no cardápio.';
    }

    return this.formatMenu(categories);
  }

  async searchProducts(restaurantId, query) {
    const products = await prisma.product.findMany({
      where: {
        restaurantId, isAvailable: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      },
      include: {
        sizes: { include: { globalSize: true } },
        addonGroups: { include: { addons: true } },
        categories: { select: { name: true } }
      }
    });

    if (products.length === 0) {
      return `Não encontrei produtos para "${query}". Tente outro termo ou use 'get_menu' para ver o cardápio completo.`;
    }

    return this.formatProducts(products);
  }

  async getCategories(restaurantId) {
    const categories = await prisma.category.findMany({
      where: { restaurantId, isActive: true },
      select: { name: true },
      orderBy: { order: 'asc' }
    });

    if (categories.length === 0) return 'Nenhuma categoria disponível.';

    return 'Categorias disponíveis:\n' + categories.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
  }

  async getPromotions(restaurantId) {
    const now = new Date();
    const promotions = await prisma.promotion.findMany({
      where: {
        restaurantId, isActive: true,
        startDate: { lte: now },
        endDate: { gte: now }
      },
      include: {
        applicableProducts: { select: { name: true } },
        applicableCategories: { select: { name: true } }
      }
    });

    if (promotions.length === 0) {
      return 'No momento não temos promoções ativas.';
    }

    let text = '🔥 PROMOÇÕES ATIVAS\n\n';
    promotions.forEach(p => {
      text += `✨ *${p.name}*\n`;
      if (p.description) text += `   ${p.description}\n`;
      if (p.discountType === 'percentage') {
        text += `   💰 ${p.discountValue}% de desconto`;
      } else {
        text += `   💰 R$ ${p.discountValue.toFixed(2).replace('.', ',')} de desconto`;
      }
      if (p.code) text += `\n   🏷️ Cupom: ${p.code}`;
      if (p.minOrderValue > 0) text += `\n   📦 Pedido mínimo: R$ ${p.minOrderValue.toFixed(2).replace('.', ',')}`;
      text += '\n\n';
    });

    return text;
  }

  formatMenu(categories) {
    let text = '📋 CARDÁPIO\n\n';

    categories.forEach(cat => {
      if (cat.products && cat.products.length > 0) {
        text += `━━━ ${cat.name.toUpperCase()} ━━━\n\n`;

        cat.products.forEach(p => {
          text += `• *${p.name}*`;
          
          if (p.sizes && p.sizes.length > 0) {
            const sizesStr = p.sizes
              .map(s => `${s.name || s.globalSize?.name}: R$ ${s.price.toFixed(2).replace('.', ',')}`)
              .join(' | ');
            text += ` (${sizesStr})`;
          } else {
            text += ` - R$ ${p.price.toFixed(2).replace('.', ',')}`;
          }
          text += '\n';

          if (p.description) text += `   ${p.description}\n`;

          if (p.addonGroups && p.addonGroups.length > 0) {
            p.addonGroups.forEach(group => {
              const addonsStr = group.addons
                .map(a => `${a.name} (+R$ ${a.price.toFixed(2).replace('.', ',')})`)
                .join(', ');
              text += `   + ${group.name}: ${addonsStr}\n`;
            });
          }
          
          text += '\n';
        });
      }
    });

    return text;
  }

  formatProducts(products) {
    let text = '🔍 RESULTADOS DA BUSCA\n\n';
    
    const groupedByCategory = products.reduce((acc, p) => {
      const catName = p.categories[0]?.name || 'Outros';
      if (!acc[catName]) acc[catName] = [];
      acc[catName].push(p);
      return acc;
    }, {});

    Object.entries(groupedByCategory).forEach(([category, items]) => {
      text += `📁 ${category}\n`;
      items.forEach(p => {
        text += `• ${p.name} - R$ ${p.price.toFixed(2).replace('.', ',')}`;
        if (p.sizes.length > 0) {
          text += ` (${p.sizes.map(s => `${s.name || s.globalSize?.name}: R$ ${s.price.toFixed(2).replace('.', ',')}`).join(', ')})`;
        }
        text += '\n';
      });
      text += '\n';
    });

    return text;
  }
}

module.exports = new MenuSkill();
