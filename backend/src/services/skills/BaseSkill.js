/**
 * BaseSkill - Classe abstrata para todas as skills do agente WhatsApp
 * 
 * Cada skill deve estender esta classe e implementar:
 * - name: identificador único da skill
 * - description: descrição do que a skill faz
 * - getTools(): retorna as definições de tools OpenAI
 * - handleToolCall(): executa a tool e retorna resultado
 * - getSystemPrompt(): retorna instruções para a IA
 */

class BaseSkill {
  constructor() {
    if (this.constructor === BaseSkill) {
      throw new Error('BaseSkill é uma classe abstrata. Estenda-a.');
    }
  }

  /**
   * Nome único da skill (usado para logging e debug)
   * @returns {string}
   */
  get name() {
    throw new Error('Implementar: get name()');
  }

  /**
   * Descrição da skill (usada para logging e debug)
   * @returns {string}
   */
  get description() {
    throw new Error('Implementar: get description()');
  }

  /**
   * Retorna as definições de tools OpenAI (function calling)
   * @returns {Array<Object>} Array de tool definitions no formato OpenAI
   */
  getTools() {
    return [];
  }

  /**
   * Executa uma tool call e retorna o resultado
   * @param {string} toolName - Nome da tool a executar
   * @param {Object} args - Argumentos da tool
   * @param {Object} context - Contexto da conversa { restaurantId, customerPhone, conversation }
   * @returns {Promise<string>} Resultado formatado para a IA
   */
  async handleToolCall(toolName, args, context) {
    throw new Error(`Implementar: handleToolCall para ${toolName}`);
  }

  /**
   * Retorna instruções de system prompt específicas desta skill
   * @param {Object} context - Contexto { restaurant, settings }
   * @returns {string} Instruções para a IA
   */
  getSystemPrompt(context) {
    return '';
  }

  /**
   * Verifica se esta skill possui uma tool específica
   * @param {string} toolName
   * @returns {boolean}
   */
  hasTool(toolName) {
    return this.getTools().some(t => t.function.name === toolName);
  }

  /**
   * Retorna todos os nomes de tools desta skill
   * @returns {string[]}
   */
  getToolNames() {
    return this.getTools().map(t => t.function.name);
  }
}

module.exports = BaseSkill;
