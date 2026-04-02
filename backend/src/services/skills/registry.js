/**
 * SkillRegistry - Gerencia skills baseadas em MD (documentação)
 * 
 * Carrega documentação MD sob demanda e constrói system prompt dinâmico.
 * Separa documentação (MD) da execução (executor.js).
 */

const fs = require('fs');
const path = require('path');
const logger = require('../../config/logger');
const executor = require('./executor');

const DOCS_DIR = path.join(__dirname, 'docs');

const TOOL_EXECUTOR_MAP = {
  // Menu
  search_products: 'searchProducts',
  get_menu: 'getMenu',
  get_categories: 'getCategories',
  get_promotions: 'getPromotions',
  
  // Customer
  search_customer: 'searchCustomer',
  create_customer: 'createCustomer',
  update_customer: 'updateCustomer',
  
  // Order
  create_order: 'createOrder',
  check_order_status: 'checkOrderStatus',
  get_order_history: 'getOrderHistory',
  cancel_order: 'cancelOrder',
  
  // Delivery
  check_delivery_area: 'checkDeliveryArea',
  get_delivery_fee: 'getDeliveryFee',
  get_delivery_time: 'getDeliveryTime',
  
  // Payment
  get_payment_methods: 'getPaymentMethods',
  calculate_change: 'calculateChange',
  
  // Loyalty
  get_loyalty_info: 'getLoyaltyInfo',
  get_loyalty_balance: 'getLoyaltyBalance',
  
  // Store Info
  get_store_info: 'getStoreInfo',
  get_operating_hours: 'getOperatingHours',
  get_restaurant_info: 'getRestaurantInfo'
};

const SKILL_INTENTS = {
  menu: [
    'preço', 'valor', 'custa', 'quanto custa', 'cardápio', 'menu', 'tem',
    'produto', 'pizza', 'hambúrguer', 'lanche', 'bebida', 'promoção',
    'categorias', 'o que vocês têm', 'o que tem'
  ],
  order: [
    'pedido', 'fazer pedido', 'pedir', 'comprar', 'meu pedido', 'status',
    'cancelar pedido', 'histórico', 'meus pedidos', ' repetitions'
  ],
  customer: [
    'cadastro', 'cadastrar', 'meus dados', 'atualizar', 'endereço', 'telefone'
  ],
  delivery: [
    'entrega', 'entregam', 'bairro', 'taxa', 'tempo', 'demora', 'retirada',
    'pickup', 'retirar'
  ],
  payment: [
    'pagamento', 'pagar', 'pix', 'dinheiro', 'cartão', 'crédito', 'débito',
    'troco', 'forma de pagamento'
  ],
  loyalty: [
    'fidelidade', 'pontos', 'cashback', 'benefícios', 'programa'
  ],
  store_info: [
    'horário', 'aberto', 'fechado', 'endereço', 'telefone', 'onde ficam',
    'política', 'faq', 'pergunta', 'informações gerais'
  ]
};

class SkillRegistry {
  constructor() {
    this.docs = new Map();
    this.tools = new Map();
    this.loaded = false;
  }

  /**
   * Carrega todas as skills (docs MD)
   */
  async loadSkills() {
    if (this.loaded) return;

    const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.md'));

    for (const file of files) {
      try {
        const skillName = file.replace('.md', '');
        const content = fs.readFileSync(path.join(DOCS_DIR, file), 'utf-8');
        const parsed = this.parseDoc(content, skillName);
        
        this.docs.set(skillName, parsed);
        
        for (const tool of parsed.tools) {
          this.tools.set(tool.name, { skill: skillName, ...tool });
        }
        
        logger.info(`[SkillRegistry] Skill carregada: ${skillName}`);
      } catch (error) {
        logger.error(`[SkillRegistry] Erro ao carregar ${file}:`, error.message);
      }
    }

    this.loaded = true;
    logger.info(`[SkillRegistry] ${this.docs.size} skills carregadas`);
  }

  /**
   * Parseia documento MD
   */
  parseDoc(content, skillName) {
    const sections = {
      whenToUse: [],
      tools: [],
      howToRespond: '',
      rules: [],
      flow: ''
    };

    const lines = content.split('\n');
    let currentSection = 'whenToUse';
    let currentTool = null;
    let toolContent = '';
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const nextLine = lines[i + 1]?.trim() || '';

      if (line.startsWith('## Quando Usar')) {
        currentSection = 'whenToUse';
        continue;
      }
      if (line.startsWith('## Ferramentas Disponíveis') || line.startsWith('### search_') || line.startsWith('### get_') || line.startsWith('### create_') || line.startsWith('### check_') || line.startsWith('### calculate_') || line.startsWith('### cancel_')) {
        if (currentTool) {
          currentTool.content = toolContent;
          sections.tools.push(currentTool);
        }
        const toolName = line.replace('### ', '').trim();
        currentTool = { name: toolName, content: '', input: '', output: '', howToUse: '' };
        currentSection = 'tool';
        toolContent = '';
        continue;
      }
      if (line.startsWith('## Como Formatar') || line.startsWith('## Fluxo')) {
        if (currentTool) {
          currentTool.content = toolContent;
          sections.tools.push(currentTool);
          currentTool = null;
        }
        currentSection = line.includes('Formatar') ? 'howToRespond' : 'flow';
        continue;
      }
      if (line.startsWith('## Regras')) {
        if (currentTool) {
          currentTool.content = toolContent;
          sections.tools.push(currentTool);
          currentTool = null;
        }
        currentSection = 'rules';
        continue;
      }

      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }

      if (line.startsWith('**Input:**')) {
        currentTool.input = '';
        continue;
      }
      if (line.startsWith('**Output:**')) {
        currentTool.output = '';
        continue;
      }
      if (line.startsWith('**Como usar:**')) {
        currentTool.howToUse = '';
        continue;
      }

      if (currentSection === 'whenToUse' && line) {
        sections.whenToUse.push(line);
      } else if (currentSection === 'tool' && line) {
        if (line.startsWith('**Input:**')) {
          currentTool.input = '';
        } else if (line.startsWith('**Output:**')) {
          currentTool.output = '';
        } else if (line.startsWith('**Como usar:**')) {
          currentTool.howToUse = '';
        } else if (currentTool) {
          if (currentTool.input && !currentTool.output) {
            currentTool.input += line + '\n';
          } else if (currentTool.output && !currentTool.howToUse) {
            currentTool.output += line + '\n';
          } else if (currentTool.howToUse) {
            currentTool.howToUse += line + '\n';
          } else {
            toolContent += line + '\n';
          }
        }
      } else if (currentSection === 'howToRespond' && line) {
        sections.howToRespond += line + '\n';
      } else if (currentSection === 'rules' && line) {
        sections.rules.push(line);
      } else if (currentSection === 'flow' && line) {
        sections.flow += line + '\n';
      }
    }

    if (currentTool) {
      currentTool.content = toolContent;
      sections.tools.push(currentTool);
    }

    return {
      name: skillName,
      whenToUse: sections.whenToUse,
      tools: sections.tools,
      howToRespond: sections.howToRespond,
      rules: sections.rules,
      flow: sections.flow
    };
  }

  /**
   * Detecta skills relevantes baseado na mensagem
   */
  detectRelevantSkills(message, history = []) {
    const text = message.toLowerCase();
    const context = history.join(' ').toLowerCase();
    const combined = text + ' ' + context;

    const scores = {};

    for (const [skillName, intents] of Object.entries(SKILL_INTENTS)) {
      scores[skillName] = 0;
      for (const intent of intents) {
        if (combined.includes(intent.toLowerCase())) {
          scores[skillName]++;
        }
      }
    }

    const sorted = Object.entries(scores)
      .filter(([_, score]) => score > 0)
      .sort((a, b) => b[1] - a[1]);

    return sorted.map(([skill]) => skill);
  }

  /**
   * Retorna tools das skills relevantes
   */
  getToolsForSkills(skillNames) {
    const tools = [];
    
    for (const skillName of skillNames) {
      const doc = this.docs.get(skillName);
      if (!doc) continue;

      for (const tool of doc.tools) {
        tools.push({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.howToUse?.trim() || tool.content?.trim() || `Tool ${tool.name}`,
            parameters: {
              type: 'object',
              properties: this.extractParams(tool.input)
            }
          }
        });
      }
    }

    return tools;
  }

  /**
   * Extrai parâmetros do input JSON
   */
  extractParams(input) {
    if (!input) return {};
    
    try {
      const jsonMatch = input.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        const params = JSON.parse(jsonMatch[1]);
        return Object.keys(params).reduce((acc, key) => {
          acc[key] = { type: typeof params[key] === 'number' ? 'number' : 'string' };
          if (params[key] === undefined || params[key] === null) {
            delete acc[key];
          }
          return acc;
        }, {});
      }
    } catch (e) {
      // ignore
    }
    
    return {};
  }

  /**
   * Constrói system prompt para skills específicas
   */
  buildPromptForSkills(skillNames, context) {
    const parts = [];

    for (const skillName of skillNames) {
      const doc = this.docs.get(skillName);
      if (!doc) continue;

      parts.push(`--- ${skillName.toUpperCase()} ---`);
      
      if (doc.whenToUse.length > 0) {
        parts.push(`## Quando Usar`);
        parts.push(doc.whenToUse.join('\n'));
        parts.push('');
      }

      if (doc.tools.length > 0) {
        parts.push(`## Ferramentas`);
        for (const tool of doc.tools) {
          parts.push(`### ${tool.name}`);
          if (tool.input) parts.push(`**Input:** ${tool.input.trim()}`);
          if (tool.output) parts.push(`**Output:** ${tool.output.trim()}`);
          if (tool.howToUse) parts.push(`**Como usar:** ${tool.howToUse.trim()}`);
          parts.push('');
        }
      }

      if (doc.flow) {
        parts.push(`## Fluxo`);
        parts.push(doc.flow);
        parts.push('');
      }

      if (doc.rules.length > 0) {
        parts.push(`## Regras`);
        for (const rule of doc.rules) {
          parts.push(`- ${rule}`);
        }
        parts.push('');
      }
    }

    return parts.join('\n');
  }

  /**
   * Executa uma tool call
   */
  async executeToolCall(toolName, args, context) {
    const executorMethod = TOOL_EXECUTOR_MAP[toolName];
    
    if (!executorMethod || !executor[executorMethod]) {
      logger.warn(`[SkillRegistry] Tool desconhecida: ${toolName}`);
      return { error: `Tool "${toolName}" não encontrada.` };
    }

    try {
      const result = await executor[executorMethod](context.restaurantId, args, context.customerPhone);
      return result;
    } catch (error) {
      logger.error(`[SkillRegistry] Erro na tool ${toolName}:`, error);
      return { error: `Erro ao executar "${toolName}": ${error.message}` };
    }
  }

  /**
   * Processa mensagem e retorna skills relevantes
   */
  async processMessage(message, history, context) {
    await this.loadSkills();

    const relevantSkills = this.detectRelevantSkills(message, history);
    
    if (relevantSkills.length === 0) {
      relevantSkills.push('store_info');
    }

    const tools = this.getToolsForSkills(relevantSkills);
    const prompt = this.buildPromptForSkills(relevantSkills, context);

    return {
      skills: relevantSkills,
      tools,
      prompt
    };
  }
}

module.exports = new SkillRegistry();
