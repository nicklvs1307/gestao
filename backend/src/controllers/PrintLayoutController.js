const PrintLayoutService = require('../services/PrintLayoutService');
const logger = require('../config/logger');

/**
 * GET /api/admin/print-layout
 * Busca a configuração de layout ativa do restaurante
 */
const getLayout = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ error: 'Restaurante não identificado.' });
    }

    let config = await PrintLayoutService.getByRestaurant(restaurantId);

    // Se não existe, retorna vazio (frontend decide se cria padrão)
    if (!config) {
      return res.json({ exists: false, config: null });
    }

    res.json({ exists: true, config });
  } catch (error) {
    logger.error('Erro ao buscar layout de impressão:', error);
    res.status(500).json({ error: 'Erro ao buscar configuração de layout.' });
  }
};

/**
 * POST /api/admin/print-layout
 * Cria a configuração padrão de layout para o restaurante
 */
const createDefaultLayout = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ error: 'Restaurante não identificado.' });
    }

    // Verifica se já existe
    const existing = await PrintLayoutService.getByRestaurant(restaurantId);
    if (existing) {
      return res.status(409).json({ error: 'Configuração de layout já existe.', config: existing });
    }

    const globalSettings = req.body.globalSettings || {};
    const config = await PrintLayoutService.createDefault(restaurantId, globalSettings);

    res.status(201).json(config);
  } catch (error) {
    logger.error('Erro ao criar layout padrão:', error);
    res.status(500).json({ error: 'Erro ao criar configuração de layout.' });
  }
};

/**
 * POST /api/admin/print-layout/migrate
 * Cria configuração a partir de dados migrados do localStorage
 */
const migrateFromLocal = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ error: 'Restaurante não identificado.' });
    }

    // Verifica se já existe
    const existing = await PrintLayoutService.getByRestaurant(restaurantId);
    if (existing) {
      return res.status(409).json({ error: 'Configuração de layout já existe. Migração não necessária.', config: existing });
    }

    const { globalSettings, blocks } = req.body;
    if (!blocks || !Array.isArray(blocks)) {
      return res.status(400).json({ error: 'Dados de migração inválidos. blocks é obrigatório.' });
    }

    const config = await PrintLayoutService.createFromMigration(restaurantId, { globalSettings, blocks });

    res.status(201).json(config);
  } catch (error) {
    logger.error('Erro ao migrar layout do localStorage:', error);
    res.status(500).json({ error: 'Erro ao migrar configuração.' });
  }
};

/**
 * PUT /api/admin/print-layout
 * Atualiza as configurações globais do layout
 */
const updateGlobalSettings = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ error: 'Restaurante não identificado.' });
    }

    const data = req.body;

    // Validações básicas
    if (data.fontSize && !['small', 'medium', 'large'].includes(data.fontSize)) {
      return res.status(400).json({ error: 'fontSize deve ser small, medium ou large.' });
    }
    if (data.paperWidth && ![58, 80, 72].includes(data.paperWidth)) {
      return res.status(400).json({ error: 'paperWidth deve ser 58, 72 ou 80.' });
    }
    if (data.lineHeight && (data.lineHeight < 1.0 || data.lineHeight > 3.0)) {
      return res.status(400).json({ error: 'lineHeight deve estar entre 1.0 e 3.0.' });
    }

    const config = await PrintLayoutService.updateGlobalSettings(restaurantId, data);
    res.json(config);
  } catch (error) {
    logger.error('Erro ao atualizar configurações globais:', error);
    res.status(500).json({ error: 'Erro ao atualizar configurações.' });
  }
};

/**
 * PUT /api/admin/print-layout/blocks
 * Atualiza todos os blocos de uma vez (reordenação, visibilidade, personalização)
 */
const updateBlocks = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ error: 'Restaurante não identificado.' });
    }

    const { blocks } = req.body;
    if (!blocks || !Array.isArray(blocks)) {
      return res.status(400).json({ error: 'blocks é obrigatório e deve ser um array.' });
    }

    const updatedBlocks = await PrintLayoutService.updateBlocks(restaurantId, blocks);
    res.json(updatedBlocks);
  } catch (error) {
    logger.error('Erro ao atualizar blocos:', error);
    res.status(500).json({ error: 'Erro ao atualizar blocos.' });
  }
};

/**
 * POST /api/admin/print-layout/blocks
 * Adiciona um bloco customizado
 */
const addCustomBlock = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ error: 'Restaurante não identificado.' });
    }

    const { label, customContent, fontSize, fontWeight, fontStyle, textAlign } = req.body;
    if (!label) {
      return res.status(400).json({ error: 'label é obrigatório.' });
    }

    const block = await PrintLayoutService.addCustomBlock(restaurantId, {
      label, customContent, fontSize, fontWeight, fontStyle, textAlign
    });

    res.status(201).json(block);
  } catch (error) {
    logger.error('Erro ao adicionar bloco customizado:', error);
    res.status(500).json({ error: 'Erro ao adicionar bloco.' });
  }
};

/**
 * DELETE /api/admin/print-layout/blocks/:blockId
 * Remove um bloco customizado
 */
const removeBlock = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { blockId } = req.params;

    if (!restaurantId) {
      return res.status(400).json({ error: 'Restaurante não identificado.' });
    }

    const result = await PrintLayoutService.removeBlock(restaurantId, blockId);
    res.json(result);
  } catch (error) {
    logger.error('Erro ao remover bloco:', error);
    if (error.message.includes('não encontrado')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Erro ao remover bloco.' });
  }
};

/**
 * GET /api/admin/print-layout/block-types
 * Lista os tipos de bloco disponíveis
 */
const getBlockTypes = async (req, res) => {
  try {
    const types = PrintLayoutService.getAvailableBlockTypes();
    res.json(types);
  } catch (error) {
    logger.error('Erro ao buscar tipos de bloco:', error);
    res.status(500).json({ error: 'Erro ao buscar tipos de bloco.' });
  }
};

module.exports = {
  getLayout,
  createDefaultLayout,
  migrateFromLocal,
  updateGlobalSettings,
  updateBlocks,
  addCustomBlock,
  removeBlock,
  getBlockTypes,
};
