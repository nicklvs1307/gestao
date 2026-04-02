// const OpenAI = require('openai'); // OPENAI - Mantido para possível uso futuro
const OpenAI = require('openai'); // OPENROUTER - Ativo
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const socketLib = require('../lib/socket');
const { normalizePhone } = require('../lib/phoneUtils');
const skillRegistry = require('./skills/registry');

class WhatsAppAIService {
  constructor() {
    // OPENAI ORIGINAL (comentado)
    // if (!process.env.OPENAI_API_KEY) {
    //   logger.warn('OPENAI_API_KEY não definida no ambiente. O agente AI pode não funcionar.');
    // }
    // this.openaiClient = new OpenAI({ 
    //   apiKey: process.env.OPENAI_API_KEY || 'placeholder' 
    // });

    // OPENROUTER - Ativo
    if (!process.env.OPENROUTER_API_KEY) {
      logger.warn('OPENROUTER_API_KEY não definida no ambiente. O agente AI pode não funcionar.');
    }
    this.openaiClient = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY || 'placeholder',
      defaultHeaders: {
        'HTTP-Referer': 'https://cardapiotablets.com',
        'X-OpenRouter-Title': 'CardapioTablets',
      },
    });

    // Rate limiting em memória
    this.rateLimits = new Map();

    // Cache de cardápio (5 min TTL)
    this.menuCache = new Map();
    this.MENU_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

    // Tracking de mensagens processadas (previne duplicatas da Evolution API)
    this.processedMessages = new Map();
    this.PROCESSED_TTL = 10 * 60 * 1000; // 10 minutos

    // Skills inicializadas
    this.skillsReady = false;
  }

  /**
   * Inicializa o registro de skills (chamado uma vez no startup)
   */
  async init() {
    if (this.skillsReady) return;
    await skillRegistry.loadSkills();
    this.skillsReady = true;
    logger.info(`[WhatsAppAI] Skills inicializadas: ${[...skillRegistry.docs.keys()].join(', ')}`);
  }

  // ============================================================
  // CACHE DE CARDÁPIO
  // ============================================================

  _getCacheKey(restaurantId, category) {
    return `menu:${restaurantId}:${category || 'all'}`;
  }

  _getCached(key) {
    const entry = this.menuCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.MENU_CACHE_TTL) {
      this.menuCache.delete(key);
      return null;
    }
    return entry.data;
  }

  _setCache(key, data) {
    this.menuCache.set(key, { data, timestamp: Date.now() });
  }

  invalidateMenuCache(restaurantId) {
    for (const key of this.menuCache.keys()) {
      if (key.startsWith(`menu:${restaurantId}:`)) {
        this.menuCache.delete(key);
      }
    }
  }

  // ============================================================
  // PREVENÇÃO DE DUPLICATAS
  // ============================================================

  isMessageProcessed(messageId) {
    if (!messageId) return false;
    if (this.processedMessages.has(messageId)) return true;
    return false;
  }

  markMessageProcessed(messageId) {
    if (!messageId) return;
    this.processedMessages.set(messageId, Date.now());

    // Limpa mensagens antigas
    const cutoff = Date.now() - this.PROCESSED_TTL;
    for (const [id, ts] of this.processedMessages.entries()) {
      if (ts < cutoff) this.processedMessages.delete(id);
    }
  }

  // ============================================================
  // RATE LIMITING
  // ============================================================

  checkRateLimit(customerPhone) {
    const now = Date.now();
    const userLimit = this.rateLimits.get(customerPhone) || { count: 0, firstMsg: now };

    if (now - userLimit.firstMsg > 60000) {
      userLimit.count = 0;
      userLimit.firstMsg = now;
    }

    userLimit.count++;
    this.rateLimits.set(customerPhone, userLimit);

    if (userLimit.count > 10) {
      return false; // Rate limitado
    }
    return true;
  }

  // ============================================================
  // HANDLER PRINCIPAL
  // ============================================================

  async handleMessage(restaurantId, customerPhone, messageContent, messageId = null) {
    try {
      if (!process.env.OPENROUTER_API_KEY) return 'Erro: API Key não configurada.';

      // Inicializa skills se ainda não fez
      if (!this.skillsReady) {
        await this.init();
      }

      // Previne processar mensagem duplicada
      if (messageId && this.isMessageProcessed(messageId)) {
        logger.info(`[WhatsAppAI] Mensagem duplicada ignorada: ${messageId}`);
        return null;
      }
      if (messageId) this.markMessageProcessed(messageId);

      // Rate limiting
      if (!this.checkRateLimit(customerPhone)) {
        return 'Você está enviando mensagens muito rápido. Por favor, aguarde um minuto.';
      }

      // Verifica se agente está habilitado
      const settings = await prisma.whatsAppSettings.findUnique({ where: { restaurantId } });
      if (!settings || !settings.agentEnabled) return null;

      // Busca contexto
      const [restaurant] = await Promise.all([
        prisma.restaurant.findUnique({
          where: { id: restaurantId },
          include: { settings: true }
        })
      ]);

      if (!restaurant) {
        logger.error(`[WhatsAppAI] Restaurante ${restaurantId} não encontrado`);
        return null;
      }

      // Histórico para detecção de intent
      const history = await prisma.whatsAppChatMessage.findMany({
        where: { restaurantId, customerPhone },
        orderBy: { timestamp: 'desc' },
        take: this._determineHistorySize(restaurantId, customerPhone)
      });

      const historyTexts = history.reverse().map(msg => msg.content);

      // Detecta skills relevantes e carrega documentação
      const { skills, tools, prompt: skillsPrompt } = await skillRegistry.processMessage(
        messageContent,
        historyTexts,
        { restaurantId, customerPhone }
      );

      logger.info(`[WhatsAppAI] Skills detectadas para esta mensagem: ${skills.join(', ')}`);

      // Monta system prompt dinâmico com skills relevantes
      const basePrompt = `Você é ${settings.agentName || 'o assistente virtual'}, o assistente virtual do restaurante ${restaurant.name}.
Seu objetivo é atender o cliente de forma rápida, educada e eficiente.

${settings.agentPersona || ''}

REGRAS GERAIS:
1. NUNCA invente preços, produtos ou informações. Consulte sempre as ferramentas disponíveis.
2. NUNCA crie um pedido sem antes apresentar um resumo completo e pedir confirmação explícita.
3. Sempre identifique o cliente antes de criar pedidos.
4. Seja conciso e direto. Evite textos longos desnecessários.
5. Se não souber responder, seja honesto e ofereça ajuda humana.

DADOS DO RESTAURANTE:
- Nome: ${restaurant.name}
- Taxa de Entrega: R$ ${restaurant.settings?.deliveryFee || 0}
- Tempo Estimado: ${restaurant.settings?.deliveryTime || '30-40 min'}`;

      const systemPrompt = basePrompt + '\n\n' + skillsPrompt;

      // Formata histórico cronológico
      const formattedHistory = history.reverse().map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));

      let messages = [
        { role: 'system', content: systemPrompt },
        ...formattedHistory,
        { role: 'user', content: messageContent }
      ];

      // Chama OpenAI com retry - usando tools das skills detectadas
      const response = await this._callOpenAIWithRetry({
        // openai/gpt-4o-mini - Original (comentado)
        // model: 'gpt-4o-mini',
        // qwen/qwen3.6-plus:free - OpenRouter ativo
        model: 'qwen/qwen3.6-plus:free',
        messages,
        tools,
        tool_choice: 'auto',
      });

      let responseMessage = response.choices[0].message;

      // Processa tool calls
      if (responseMessage.tool_calls) {
        messages.push(responseMessage);

        const context = { restaurantId, customerPhone, restaurant, settings };

        for (const toolCall of responseMessage.tool_calls) {
          const args = JSON.parse(toolCall.function.arguments);
          logger.info(`[WhatsAppAI] Tool call: ${toolCall.function.name}(${JSON.stringify(args)})`);

          const toolResult = await skillRegistry.executeToolCall(toolCall.function.name, args, context);

          messages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: toolCall.function.name,
            content: JSON.stringify(toolResult),
          });
        }

        // Segunda chamada com resultados das tools
        const secondResponse = await this._callOpenAIWithRetry({
          model: 'qwen/qwen3.6-plus:free',
          messages,
        });
        responseMessage = secondResponse.choices[0].message;
      }

      const responseText = responseMessage.content;

      // Salva mensagens no banco
      await prisma.whatsAppChatMessage.createMany({
        data: [
          { restaurantId, customerPhone, role: 'user', content: messageContent },
          { restaurantId, customerPhone, role: 'assistant', content: responseText }
        ]
      });

      return responseText;
    } catch (error) {
      logger.error('[AI SERVICE ERROR]', error);
      return 'Estou com uma pequena instabilidade agora, mas logo volto ao normal. Pode repetir sua mensagem?';
    }
  }

  /**
   * Chama OpenAI com retry exponencial
   */
  async _callOpenAIWithRetry(params, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.openaiClient.chat.completions.create(params);
      } catch (error) {
        lastError = error;
        const isRetryable = error.status >= 500 || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT';

        if (!isRetryable || attempt === maxRetries) {
          logger.error(`[WhatsAppAI] OpenAI erro (tentativa ${attempt}/${maxRetries}):`, error.message);
          throw error;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        logger.warn(`[WhatsAppAI] Retry em ${delay}ms (tentativa ${attempt + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  async clearChatHistory(restaurantId, customerPhone) {
    try {
      await prisma.whatsAppChatMessage.deleteMany({
        where: { restaurantId, customerPhone }
      });
      return true;
    } catch (error) {
      logger.error('[AI SERVICE CLEAR HISTORY ERROR]', error);
      return false;
    }
  }

  /**
   * Determina o tamanho do histórico baseado no contexto da conversa
   * Conversas com pedidos ativos precisam de mais contexto
   */
  _determineHistorySize(restaurantId, customerPhone) {
    // Padrão: 15 mensagens
    // Se tem pedido recente pendente/em preparo: 25 mensagens
    // Se conversa é curta (< 5 msgs): 10 mensagens
    return 20; // Valor médio otimizado para custo/benefício
  }

  /**
   * Retorna info de debug das skills
   */
  getDebugInfo() {
    return {
      skillsReady: this.skillsReady,
      skills: skillRegistry.getDebugInfo(),
      cacheSize: this.menuCache.size,
      processedMessages: this.processedMessages.size
    };
  }
}

module.exports = new WhatsAppAIService();
