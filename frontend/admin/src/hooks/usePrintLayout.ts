import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type {
  PrintLayoutConfig,
  PrintLayoutBlock,
  PrintLayoutGlobalSettings,
  PrintLayoutBlockUpdate,
  PrintLayoutMigrationData,
  LegacyReceiptSettings,
} from '../types/printLayout';
import {
  getPrintLayout,
  createDefaultPrintLayout,
  migratePrintLayout,
  updatePrintLayoutGlobalSettings,
  updatePrintLayoutBlocks,
  addPrintLayoutCustomBlock,
  removePrintLayoutBlock,
} from '../services/api/printLayout';

interface UsePrintLayoutReturn {
  config: PrintLayoutConfig | null;
  blocks: PrintLayoutBlock[];
  globalSettings: PrintLayoutGlobalSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  exists: boolean;
  // Actions
  createDefault: (settings?: Partial<PrintLayoutGlobalSettings>) => Promise<void>;
  updateGlobalSettings: (settings: Partial<PrintLayoutGlobalSettings>) => Promise<void>;
  updateBlocks: (blocks: PrintLayoutBlockUpdate[]) => Promise<void>;
  addCustomBlock: (label: string, content?: string) => Promise<void>;
  removeBlock: (blockId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

// Default block structure for new layouts
const DEFAULT_BLOCKS: { blockType: string; label: string; defaultOrder: number }[] = [
  { blockType: 'logo', label: 'Logo do Restaurante', defaultOrder: 0 },
  { blockType: 'address', label: 'Endereço', defaultOrder: 1 },
  { blockType: 'orderDate', label: 'Data do Pedido', defaultOrder: 2 },
  { blockType: 'header', label: 'Texto de Cabeçalho', defaultOrder: 3 },
  { blockType: 'orderNumber', label: 'Número do Pedido', defaultOrder: 4 },
  { blockType: 'customerInfo', label: 'Dados do Cliente', defaultOrder: 5 },
  { blockType: 'tableInfo', label: 'Dados da Mesa', defaultOrder: 6 },
  { blockType: 'items', label: 'Itens do Pedido', defaultOrder: 7 },
  { blockType: 'observations', label: 'Observações', defaultOrder: 8 },
  { blockType: 'totals', label: 'Totais', defaultOrder: 9 },
  { blockType: 'payment', label: 'Pagamento', defaultOrder: 10 },
  { blockType: 'change', label: 'Troco', defaultOrder: 11 },
  { blockType: 'footer', label: 'Rodapé', defaultOrder: 12 },
];

const DEFAULT_VISIBLE = [
  'logo', 'address', 'orderDate', 'header', 'orderNumber',
  'customerInfo', 'tableInfo', 'items', 'totals', 'payment', 'change', 'footer'
];

/**
 * Migrates localStorage receipt settings to backend migration format
 */
function buildMigrationData(): PrintLayoutMigrationData | null {
  try {
    const savedReceipt = localStorage.getItem('receipt_layout') || localStorage.getItem('receipt_settings');
    if (!savedReceipt) return null;

    const local: LegacyReceiptSettings = JSON.parse(savedReceipt);

    const globalSettings: Partial<PrintLayoutGlobalSettings> = {
      fontFamily: 'monospace',
      fontSize: local.fontSize || 'medium',
      lineHeight: 1.2,
      paperWidth: 80,
      sectionSpacing: 8,
      itemSpacing: local.itemSpacing ?? 2,
      paperFeed: local.paperFeed ?? 3,
      useInit: local.useInit ?? true,
    };

    const blocks = DEFAULT_BLOCKS.map((block) => {
      let isVisible = DEFAULT_VISIBLE.includes(block.blockType);

      // Map legacy visibility settings
      if (block.blockType === 'logo' && local.showLogo !== undefined) {
        isVisible = local.showLogo;
      }
      if (block.blockType === 'address' && local.showAddress !== undefined) {
        isVisible = local.showAddress;
      }
      if (block.blockType === 'orderDate' && local.showOrderDate !== undefined) {
        isVisible = local.showOrderDate;
      }

      // Map legacy text content
      let customContent: string | null = null;
      if (block.blockType === 'header' && local.headerText) {
        customContent = local.headerText;
      }
      if (block.blockType === 'footer' && local.footerText) {
        customContent = local.footerText;
      }

      return {
        blockType: block.blockType,
        label: block.label,
        isVisible,
        order: block.defaultOrder,
        customContent,
      };
    });

    return { globalSettings, blocks };
  } catch {
    return null;
  }
}

export function usePrintLayout(): UsePrintLayoutReturn {
  const [config, setConfig] = useState<PrintLayoutConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchLayout = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getPrintLayout();

      if (result.exists && result.config) {
        setConfig(result.config);
        // Cache in localStorage for the printer service to use synchronously
        localStorage.setItem('print_layout_config', JSON.stringify(result.config));
      } else {
        // No layout exists yet - try to migrate from localStorage
        const migrationData = buildMigrationData();

        if (migrationData) {
          try {
            const migrated = await migratePrintLayout(migrationData);
            setConfig(migrated);
            localStorage.setItem('print_layout_config', JSON.stringify(migrated));
            toast.success('Configurações de impressão migradas com sucesso!');
            // Clean up legacy localStorage after successful migration
            localStorage.removeItem('receipt_layout');
            localStorage.removeItem('receipt_settings');
          } catch {
            // Migration conflict (already exists) or error - create default
            try {
              const defaultConfig = await createDefaultPrintLayout();
              setConfig(defaultConfig);
              localStorage.setItem('print_layout_config', JSON.stringify(defaultConfig));
            } catch {
              toast.error('Erro ao criar configuração de layout.');
            }
          }
        } else {
          // No local data - don't create automatically (let user decide)
          setConfig(null);
        }
      }
    } catch {
      toast.error('Erro ao carregar configurações de layout.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLayout();
  }, [fetchLayout]);

  const createDefault = useCallback(async (settings?: Partial<PrintLayoutGlobalSettings>) => {
    try {
      setIsSaving(true);
      const newConfig = await createDefaultPrintLayout(settings);
      setConfig(newConfig);
      toast.success('Configuração de layout criada!');
    } catch {
      toast.error('Erro ao criar configuração de layout.');
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateGlobalSettings = useCallback(async (settings: Partial<PrintLayoutGlobalSettings>) => {
    if (!config) return;
    try {
      setIsSaving(true);
      const updated = await updatePrintLayoutGlobalSettings(settings);
      setConfig(updated);
      localStorage.setItem('print_layout_config', JSON.stringify(updated));
      toast.success('Configurações atualizadas!');
    } catch {
      toast.error('Erro ao atualizar configurações.');
    } finally {
      setIsSaving(false);
    }
  }, [config]);

  const updateBlocks = useCallback(async (blocks: PrintLayoutBlockUpdate[]) => {
    if (!config) return;
    try {
      setIsSaving(true);
      const updatedBlocks = await updatePrintLayoutBlocks(blocks);
      const updatedConfig = { ...config, blocks: updatedBlocks };
      setConfig(updatedConfig);
      localStorage.setItem('print_layout_config', JSON.stringify(updatedConfig));
    } catch {
      toast.error('Erro ao atualizar blocos.');
    } finally {
      setIsSaving(false);
    }
  }, [config]);

  const addCustomBlock = useCallback(async (label: string, content?: string) => {
    if (!config) return;
    try {
      setIsSaving(true);
      const newBlock = await addPrintLayoutCustomBlock({
        label,
        customContent: content,
      });
      const updatedConfig = {
        ...config,
        blocks: [...config.blocks, newBlock].sort((a, b) => a.order - b.order)
      };
      setConfig(updatedConfig);
      localStorage.setItem('print_layout_config', JSON.stringify(updatedConfig));
      toast.success('Bloco adicionado!');
    } catch {
      toast.error('Erro ao adicionar bloco.');
    } finally {
      setIsSaving(false);
    }
  }, [config]);

  const removeBlock = useCallback(async (blockId: string) => {
    if (!config) return;
    try {
      setIsSaving(true);
      await removePrintLayoutBlock(blockId);
      const updatedConfig = {
        ...config,
        blocks: config.blocks.filter(b => b.id !== blockId)
      };
      setConfig(updatedConfig);
      localStorage.setItem('print_layout_config', JSON.stringify(updatedConfig));
      toast.success('Bloco removido!');
    } catch {
      toast.error('Erro ao remover bloco.');
    } finally {
      setIsSaving(false);
    }
  }, [config]);

  const blocks = useMemo(() => config?.blocks || [], [config]);
  const globalSettings = useMemo(() => {
    if (!config) return null;
    return {
      fontFamily: config.fontFamily,
      fontSize: config.fontSize,
      lineHeight: config.lineHeight,
      paperWidth: config.paperWidth,
      sectionSpacing: config.sectionSpacing,
      itemSpacing: config.itemSpacing,
      paperFeed: config.paperFeed,
      useInit: config.useInit,
    };
  }, [config]);

  return useMemo(() => ({
    config,
    blocks,
    globalSettings,
    isLoading,
    isSaving,
    exists: !!config,
    createDefault,
    updateGlobalSettings,
    updateBlocks,
    addCustomBlock,
    removeBlock,
    refresh: fetchLayout,
  }), [config, blocks, globalSettings, isLoading, isSaving, createDefault, updateGlobalSettings, updateBlocks, addCustomBlock, removeBlock, fetchLayout]);
}
