const prisma = require('../lib/prisma');
const logger = require('../config/logger');

// Tipos de layout válidos
const VALID_LAYOUT_TYPES = ['delivery', 'pickup', 'table'];

// Tipos de bloco disponíveis com seus labels padrão
const AVAILABLE_BLOCK_TYPES = [
  { type: 'logo', label: 'Logo do Restaurante', defaultOrder: 0 },
  { type: 'address', label: 'Endereço', defaultOrder: 1 },
  { type: 'orderDate', label: 'Data do Pedido', defaultOrder: 2 },
  { type: 'header', label: 'Texto de Cabeçalho', defaultOrder: 3 },
  { type: 'orderNumber', label: 'Número do Pedido', defaultOrder: 4 },
  { type: 'customerInfo', label: 'Dados do Cliente', defaultOrder: 5 },
  { type: 'tableInfo', label: 'Dados da Mesa', defaultOrder: 6 },
  { type: 'deliveryInfo', label: 'Dados da Entrega', defaultOrder: 7 },
  { type: 'pickupInfo', label: 'Dados da Retirada', defaultOrder: 8 },
  { type: 'items', label: 'Itens do Pedido', defaultOrder: 9 },
  { type: 'observations', label: 'Observações', defaultOrder: 10 },
  { type: 'totals', label: 'Totais', defaultOrder: 11 },
  { type: 'payment', label: 'Pagamento', defaultOrder: 12 },
  { type: 'change', label: 'Troco', defaultOrder: 13 },
  { type: 'footer', label: 'Rodapé', defaultOrder: 14 },
  { type: 'qrcode', label: 'QR Code', defaultOrder: 15 },
];

// Blocos visíveis por padrão em cada tipo de layout
const DEFAULT_VISIBLE_BLOCKS = {
  delivery: [
    'logo', 'address', 'orderDate', 'header', 'orderNumber',
    'customerInfo', 'deliveryInfo', 'items', 'observations', 'totals', 'payment', 'change', 'footer'
  ],
  pickup: [
    'logo', 'address', 'orderDate', 'header', 'orderNumber',
    'customerInfo', 'pickupInfo', 'items', 'observations', 'totals', 'payment', 'change', 'footer'
  ],
  table: [
    'logo', 'address', 'orderDate', 'header', 'orderNumber',
    'tableInfo', 'items', 'observations', 'totals', 'payment', 'change', 'footer'
  ]
};

// Labels dos tipos de layout
const LAYOUT_TYPE_LABELS = {
  delivery: 'Delivery',
  pickup: 'Retirada',
  table: 'Mesa'
};

class PrintLayoutService {
  /**
   * Busca a configuração de layout ativa do restaurante por tipo
   * Se não existir, retorna null (frontend decide se cria padrão)
   */
  async getByRestaurant(restaurantId, type = 'table') {
    try {
      const config = await prisma.printLayoutConfig.findUnique({
        where: { restaurantId_type: { restaurantId, type } },
        include: {
          blocks: {
            orderBy: { order: 'asc' }
          }
        }
      });
      return config;
    } catch (error) {
      logger.error('Erro ao buscar config de layout:', error);
      throw error;
    }
  }

  /**
   * Busca todos os layouts de um restaurante (delivery, pickup, table)
   */
  async getAllByRestaurant(restaurantId) {
    try {
      const configs = await prisma.printLayoutConfig.findMany({
        where: { restaurantId },
        include: {
          blocks: {
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { type: 'asc' }
      });
      return configs;
    } catch (error) {
      logger.error('Erro ao buscar configs de layout:', error);
      throw error;
    }
  }

  /**
   * Cria a configuração padrão de layout para um restaurante e tipo específico
   * Usado na primeira acesso ou migração do localStorage
   */
  async createDefault(restaurantId, type = 'table', globalSettings = {}) {
    try {
      // Validar tipo
      if (!VALID_LAYOUT_TYPES.includes(type)) {
        throw new Error(`Tipo de layout inválido: ${type}. Use: ${VALID_LAYOUT_TYPES.join(', ')}`);
      }

      // Verificar se já existe para este tipo
      const existing = await this.getByRestaurant(restaurantId, type);
      if (existing) {
        throw new Error(`Configuração de layout para tipo '${type}' já existe.`);
      }

      const visibleBlocks = DEFAULT_VISIBLE_BLOCKS[type] || DEFAULT_VISIBLE_BLOCKS.table;

      const config = await prisma.printLayoutConfig.create({
        data: {
          restaurantId,
          type,
          fontFamily: globalSettings.fontFamily || 'monospace',
          fontSize: globalSettings.fontSize || 'medium',
          lineHeight: globalSettings.lineHeight || 1.2,
          paperWidth: globalSettings.paperWidth || 80,
          sectionSpacing: globalSettings.sectionSpacing || 8,
          itemSpacing: globalSettings.itemSpacing || 2,
          paperFeed: globalSettings.paperFeed || 3,
          useInit: globalSettings.useInit !== undefined ? globalSettings.useInit : true,
          blocks: {
            create: AVAILABLE_BLOCK_TYPES.map((block) => ({
              blockType: block.type,
              label: block.label,
              isVisible: visibleBlocks.includes(block.type),
              order: block.defaultOrder,
            }))
          }
        },
        include: {
          blocks: {
            orderBy: { order: 'asc' }
          }
        }
      });
      return config;
    } catch (error) {
      logger.error('Erro ao criar config padrão de layout:', error);
      throw error;
    }
  }

  /**
   * Cria todos os layouts padrão (delivery, pickup, table) de uma vez
   */
  async createAllDefaults(restaurantId, globalSettings = {}) {
    try {
      const results = [];
      for (const type of VALID_LAYOUT_TYPES) {
        try {
          const config = await this.createDefault(restaurantId, type, globalSettings);
          results.push(config);
        } catch (err) {
          // Se já existe, ignora e continua
          if (err.message.includes('já existe')) {
            logger.warn(`Layout tipo '${type}' já existe, pulando...`);
          } else {
            throw err;
          }
        }
      }
      return results;
    } catch (error) {
      logger.error('Erro ao criar configs padrão de layout:', error);
      throw error;
    }
  }

  /**
   * Cria configuração a partir de dados migrados do localStorage
   */
  async createFromMigration(restaurantId, localData, type = 'table') {
    try {
      const { globalSettings, blocks } = localData;

      // Validar tipo
      if (!VALID_LAYOUT_TYPES.includes(type)) {
        throw new Error(`Tipo de layout inválido: ${type}. Use: ${VALID_LAYOUT_TYPES.join(', ')}`);
      }

      const config = await prisma.printLayoutConfig.create({
        data: {
          restaurantId,
          type,
          fontFamily: globalSettings?.fontFamily || 'monospace',
          fontSize: globalSettings?.fontSize || 'medium',
          lineHeight: globalSettings?.lineHeight || 1.2,
          paperWidth: globalSettings?.paperWidth || 80,
          sectionSpacing: globalSettings?.sectionSpacing || 8,
          itemSpacing: globalSettings?.itemSpacing || 2,
          paperFeed: globalSettings?.paperFeed || 3,
          useInit: globalSettings?.useInit !== undefined ? globalSettings.useInit : true,
          blocks: {
            create: blocks.map((block, index) => ({
              blockType: block.blockType,
              label: block.label,
              isVisible: block.isVisible !== undefined ? block.isVisible : true,
              order: block.order !== undefined ? block.order : index,
              fontSize: block.fontSize || null,
              fontWeight: block.fontWeight || null,
              fontStyle: block.fontStyle || null,
              textAlign: block.textAlign || null,
              customContent: block.customContent || null,
            }))
          }
        },
        include: {
          blocks: {
            orderBy: { order: 'asc' }
          }
        }
      });
      return config;
    } catch (error) {
      logger.error('Erro ao criar config de layout por migração:', error);
      throw error;
    }
  }

  /**
   * Atualiza as configurações globais do layout
   */
  async updateGlobalSettings(restaurantId, data, type = 'table') {
    try {
      const config = await prisma.printLayoutConfig.update({
        where: { restaurantId_type: { restaurantId, type } },
        data: {
          fontFamily: data.fontFamily,
          fontSize: data.fontSize,
          lineHeight: data.lineHeight,
          paperWidth: data.paperWidth,
          sectionSpacing: data.sectionSpacing,
          itemSpacing: data.itemSpacing,
          paperFeed: data.paperFeed,
          useInit: data.useInit,
        },
        include: {
          blocks: {
            orderBy: { order: 'asc' }
          }
        }
      });
      return config;
    } catch (error) {
      logger.error('Erro ao atualizar config global de layout:', error);
      throw error;
    }
  }

  /**
   * Atualiza todos os blocos de uma vez (batch update)
   * Usado pelo drag-and-drop para reordenar, mostrar/esconder, personalizar
   */
  async updateBlocks(restaurantId, blocksData, type = 'table') {
    try {
      // Busca o layout config para obter o ID
      const config = await prisma.printLayoutConfig.findUnique({
        where: { restaurantId_type: { restaurantId, type } },
        select: { id: true }
      });

      if (!config) {
        throw new Error('Configuração de layout não encontrada');
      }

      // Atualiza cada bloco em transação
      const updatedBlocks = await prisma.$transaction(
        blocksData.map((block) =>
          prisma.printLayoutBlock.update({
            where: {
              layoutId_blockType: {
                layoutId: config.id,
                blockType: block.blockType
              }
            },
            data: {
              isVisible: block.isVisible,
              order: block.order,
              fontSize: block.fontSize || null,
              fontWeight: block.fontWeight || null,
              fontStyle: block.fontStyle || null,
              textAlign: block.textAlign || null,
              customContent: block.customContent || null,
            }
          })
        )
      );

      return updatedBlocks.sort((a, b) => a.order - b.order);
    } catch (error) {
      logger.error('Erro ao atualizar blocos de layout:', error);
      throw error;
    }
  }

  /**
   * Adiciona um bloco customizado ao layout
   */
  async addCustomBlock(restaurantId, blockData, type = 'table') {
    try {
      const config = await prisma.printLayoutConfig.findUnique({
        where: { restaurantId_type: { restaurantId, type } },
        select: { id: true }
      });

      if (!config) {
        throw new Error('Configuração de layout não encontrada');
      }

      // Descobre a próxima ordem
      const lastBlock = await prisma.printLayoutBlock.findFirst({
        where: { layoutId: config.id },
        orderBy: { order: 'desc' },
        select: { order: true }
      });

      const nextOrder = lastBlock ? lastBlock.order + 1 : 0;

      const block = await prisma.printLayoutBlock.create({
        data: {
          layoutId: config.id,
          blockType: `custom_${Date.now()}`,
          label: blockData.label || 'Bloco Customizado',
          isVisible: true,
          order: nextOrder,
          fontSize: blockData.fontSize || null,
          fontWeight: blockData.fontWeight || null,
          fontStyle: blockData.fontStyle || null,
          textAlign: blockData.textAlign || null,
          customContent: blockData.customContent || '',
        }
      });

      return block;
    } catch (error) {
      logger.error('Erro ao adicionar bloco customizado:', error);
      throw error;
    }
  }

  /**
   * Remove um bloco customizado
   */
  async removeBlock(restaurantId, blockId, type = 'table') {
    try {
      const config = await prisma.printLayoutConfig.findUnique({
        where: { restaurantId_type: { restaurantId, type } },
        select: { id: true }
      });

      if (!config) {
        throw new Error('Configuração de layout não encontrada');
      }

      // Só permite remover blocos customizados
      const block = await prisma.printLayoutBlock.findFirst({
        where: {
          id: blockId,
          layoutId: config.id,
          blockType: { startsWith: 'custom_' }
        }
      });

      if (!block) {
        throw new Error('Bloco não encontrado ou não é customizado');
      }

      await prisma.printLayoutBlock.delete({
        where: { id: blockId }
      });

      return { success: true };
    } catch (error) {
      logger.error('Erro ao remover bloco customizado:', error);
      throw error;
    }
  }

  /**
   * Retorna os tipos de bloco disponíveis para adicionar
   */
  getAvailableBlockTypes() {
    return AVAILABLE_BLOCK_TYPES;
  }

  /**
   * Deleta a configuração de layout do restaurante por tipo
   */
  async deleteByRestaurant(restaurantId, type = 'table') {
    try {
      await prisma.printLayoutConfig.delete({
        where: { restaurantId_type: { restaurantId, type } }
      });
      return { success: true };
    } catch (error) {
      logger.error('Erro ao deletar config de layout:', error);
      throw error;
    }
  }

  /**
   * Retorna os tipos de layout disponíveis
   */
  getValidLayoutTypes() {
    return VALID_LAYOUT_TYPES;
  }

  /**
   * Retorna labels dos tipos de layout
   */
  getLayoutTypeLabels() {
    return LAYOUT_TYPE_LABELS;
  }
}

module.exports = new PrintLayoutService();
