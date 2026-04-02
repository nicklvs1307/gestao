/**
 * SkillRegistry - Gerencia todas as skills do agente WhatsApp
 * 
 * Auto-descobre skills na pasta, coleta tools, roteia chamadas
 * e monta o system prompt dinamicamente.
 */

const fs = require('fs');
const path = require('path');
const BaseSkill = require('./BaseSkill');
const logger = require('../../config/logger');

class SkillRegistry {
  constructor() {
    this.skills = new Map();
    this.toolToSkillMap = new Map(); // toolName -> skill instance
    this.initialized = false;
  }

  /**
   * Registra uma skill manualmente
   * @param {BaseSkill} skill 
   */
  register(skill) {
    if (!(skill instanceof BaseSkill)) {
      throw new Error(`Skill "${skill.name}" deve estender BaseSkill`);
    }
    this.skills.set(skill.name, skill);
    this._rebuildToolMap();
    logger.info(`[SkillRegistry] Skill registrada: ${skill.name} (${skill.description})`);
  }

  /**
   * Auto-descobre e registra todas as skills na pasta
   * Ignora BaseSkill.js e SkillRegistry.js
   */
  async discoverAndRegister() {
    if (this.initialized) return;

    const skillsDir = __dirname;
    const files = fs.readdirSync(skillsDir).filter(f => 
      f.endsWith('.js') && 
      f !== 'BaseSkill.js' && 
      f !== 'SkillRegistry.js' &&
      f !== 'index.js'
    );

    for (const file of files) {
      try {
        const SkillClass = require(path.join(skillsDir, file));
        // Suporta tanto export default (instância) quanto class export
        const skill = SkillClass.default || SkillClass;
        
        if (skill instanceof BaseSkill) {
          this.register(skill);
        } else if (typeof skill === 'function' && skill.prototype instanceof BaseSkill) {
          // É uma classe, instancia
          this.register(new skill());
        }
      } catch (error) {
        logger.error(`[SkillRegistry] Erro ao carregar skill ${file}:`, error.message);
      }
    }

    this.initialized = true;
    logger.info(`[SkillRegistry] ${this.skills.size} skills carregadas: ${[...this.skills.keys()].join(', ')}`);
  }

  /**
   * Reconstrói o mapa de tool -> skill
   */
  _rebuildToolMap() {
    this.toolToSkillMap.clear();
    for (const [name, skill] of this.skills) {
      for (const toolName of skill.getToolNames()) {
        this.toolToSkillMap.set(toolName, skill);
      }
    }
  }

  /**
   * Retorna todas as tool definitions de todas as skills
   * @returns {Array<Object>}
   */
  getAllTools() {
    const tools = [];
    for (const [, skill] of this.skills) {
      tools.push(...skill.getTools());
    }
    return tools;
  }

  /**
   * Encontra a skill responsável por uma tool
   * @param {string} toolName 
   * @returns {BaseSkill|null}
   */
  getSkillForTool(toolName) {
    return this.toolToSkillMap.get(toolName) || null;
  }

  /**
   * Executa uma tool call na skill correta
   * @param {string} toolName 
   * @param {Object} args 
   * @param {Object} context 
   * @returns {Promise<string>}
   */
  async executeToolCall(toolName, args, context) {
    const skill = this.getSkillForTool(toolName);
    if (!skill) {
      logger.warn(`[SkillRegistry] Tool desconhecida: ${toolName}`);
      return `ERRO: Função "${toolName}" não encontrada.`;
    }

    try {
      return await skill.handleToolCall(toolName, args, context);
    } catch (error) {
      logger.error(`[SkillRegistry] Erro na tool ${toolName} (${skill.name}):`, error);
      return `ERRO: Ocorreu uma falha ao executar "${toolName}". Tente novamente ou peça ajuda humana.`;
    }
  }

  /**
   * Monta o system prompt combinando todas as skills
   * @param {Object} context - { restaurant, settings }
   * @returns {string}
   */
  buildSystemPrompt(context) {
    const parts = [];

    // Header genérico
    const restaurant = context.restaurant;
    const settings = context.settings;

    parts.push(`Você é ${settings?.agentName || 'o assistente virtual'} do restaurante ${restaurant?.name || ''}.`);
    parts.push(`Seu objetivo é atender o cliente de forma rápida, educada e eficiente, ajudando com pedidos, dúvidas e informações.`);
    parts.push('');

    // Prompts de cada skill
    for (const [, skill] of this.skills) {
      const skillPrompt = skill.getSystemPrompt(context);
      if (skillPrompt) {
        parts.push(`--- ${skill.name.toUpperCase()} ---`);
        parts.push(skillPrompt);
        parts.push('');
      }
    }

    return parts.join('\n');
  }

  /**
   * Retorna informações de debug sobre as skills
   */
  getDebugInfo() {
    const info = [];
    for (const [name, skill] of this.skills) {
      info.push({
        name,
        description: skill.description,
        tools: skill.getToolNames()
      });
    }
    return info;
  }

  /**
   * Retorna número de skills registradas
   */
  get size() {
    return this.skills.size;
  }

  /**
   * Verifica se uma skill está registrada
   */
  has(name) {
    return this.skills.has(name);
  }

  /**
   * Obtém uma skill específica
   */
  get(name) {
    return this.skills.get(name) || null;
  }
}

// Singleton
module.exports = new SkillRegistry();
