import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type {
  PrintLayoutConfig,
  PrintLayoutBlock,
  PrintLayoutGlobalSettings,
  PrintLayoutBlockUpdate,
  PrintLayoutType,
  PrintLayoutMigrationData,
} from '../types/printLayout';
import {
  getAllPrintLayouts,
  createDefaultPrintLayout,
  createAllDefaultPrintLayouts,
  migratePrintLayout,
  updatePrintLayoutGlobalSettings,
  updatePrintLayoutBlocks,
  addPrintLayoutCustomBlock,
  removePrintLayoutBlock,
} from '../services/api/printLayout';

interface UsePrintLayoutMultiReturn {
  // All layouts indexed by type
  layouts: Record<PrintLayoutType, PrintLayoutConfig | null>;
  // Current selected type
  selectedType: PrintLayoutType;
  // Current layout (based on selectedType)
  currentLayout: PrintLayoutConfig | null;
  currentBlocks: PrintLayoutBlock[];
  currentGlobalSettings: PrintLayoutGlobalSettings | null;
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  // Check if all layouts exist
  allExist: boolean;
  // Actions
  setSelectedType: (type: PrintLayoutType) => void;
  createDefault: (type?: PrintLayoutType, settings?: Partial<PrintLayoutGlobalSettings>) => Promise<void>;
  createAllDefaults: (settings?: Partial<PrintLayoutGlobalSettings>) => Promise<void>;
  updateGlobalSettings: (settings: Partial<PrintLayoutGlobalSettings>) => Promise<void>;
  updateBlocks: (blocks: PrintLayoutBlockUpdate[]) => Promise<void>;
  addCustomBlock: (label: string, content?: string) => Promise<void>;
  removeBlock: (blockId: string) => Promise<void>;
  refresh: () => Promise<void>;
  refreshType: (type: PrintLayoutType) => Promise<void>;
}

const VALID_TYPES: PrintLayoutType[] = ['delivery', 'pickup', 'table'];

export function usePrintLayoutMulti(): UsePrintLayoutMultiReturn {
  const [layouts, setLayouts] = useState<Record<PrintLayoutType, PrintLayoutConfig | null>>({
    delivery: null,
    pickup: null,
    table: null,
  });
  const [selectedType, setSelectedType] = useState<PrintLayoutType>('table');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchAllLayouts = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getAllPrintLayouts();
      
      const newLayouts: Record<PrintLayoutType, PrintLayoutConfig | null> = {
        delivery: null,
        pickup: null,
        table: null,
      };

      for (const config of result.configs) {
        if (config.type && VALID_TYPES.includes(config.type as PrintLayoutType)) {
          newLayouts[config.type as PrintLayoutType] = config;
        }
      }

      setLayouts(newLayouts);

      // Cache each layout in localStorage for printer service
      for (const type of VALID_TYPES) {
        if (newLayouts[type]) {
          localStorage.setItem(`print_layout_config_${type}`, JSON.stringify(newLayouts[type]));
        }
      }

      // Also keep backward compatibility cache
      if (newLayouts.table) {
        localStorage.setItem('print_layout_config', JSON.stringify(newLayouts.table));
      }
    } catch {
      toast.error('Erro ao carregar configurações de layout.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllLayouts();
  }, [fetchAllLayouts]);

  const fetchLayoutByType = useCallback(async (type: PrintLayoutType) => {
    try {
      const { getPrintLayout } = await import('../services/api/printLayout');
      const result = await getPrintLayout(type);
      
      if (result.exists && result.config) {
        setLayouts(prev => ({ ...prev, [type]: result.config }));
        localStorage.setItem(`print_layout_config_${type}`, JSON.stringify(result.config));
        
        // Backward compatibility for table type
        if (type === 'table') {
          localStorage.setItem('print_layout_config', JSON.stringify(result.config));
        }
      }
    } catch {
      // Silent fail for individual type fetch
    }
  }, []);

  const createDefault = useCallback(async (type: PrintLayoutType = 'table', settings?: Partial<PrintLayoutGlobalSettings>) => {
    try {
      setIsSaving(true);
      const newConfig = await createDefaultPrintLayout(type, settings);
      setLayouts(prev => ({ ...prev, [type]: newConfig }));
      localStorage.setItem(`print_layout_config_${type}`, JSON.stringify(newConfig));
      
      if (type === 'table') {
        localStorage.setItem('print_layout_config', JSON.stringify(newConfig));
      }
      
      toast.success(`Configuração de layout ${type === 'delivery' ? 'Delivery' : type === 'pickup' ? 'Retirada' : 'Mesa'} criada!`);
    } catch {
      toast.error('Erro ao criar configuração de layout.');
    } finally {
      setIsSaving(false);
    }
  }, []);

  const createAllDefaults = useCallback(async (settings?: Partial<PrintLayoutGlobalSettings>) => {
    try {
      setIsSaving(true);
      const result = await createAllDefaultPrintLayouts(settings);
      
      const newLayouts: Record<PrintLayoutType, PrintLayoutConfig | null> = {
        delivery: null,
        pickup: null,
        table: null,
      };

      for (const config of result.configs) {
        if (config.type && VALID_TYPES.includes(config.type as PrintLayoutType)) {
          newLayouts[config.type as PrintLayoutType] = config;
          localStorage.setItem(`print_layout_config_${config.type}`, JSON.stringify(config));
        }
      }

      setLayouts(newLayouts);
      toast.success('Configurações de layout criadas para Delivery, Retirada e Mesa!');
    } catch {
      toast.error('Erro ao criar configurações de layout.');
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateGlobalSettings = useCallback(async (settings: Partial<PrintLayoutGlobalSettings>) => {
    const currentLayout = layouts[selectedType];
    if (!currentLayout) return;
    
    try {
      setIsSaving(true);
      const updated = await updatePrintLayoutGlobalSettings(settings, selectedType);
      setLayouts(prev => ({ ...prev, [selectedType]: updated }));
      localStorage.setItem(`print_layout_config_${selectedType}`, JSON.stringify(updated));
      
      if (selectedType === 'table') {
        localStorage.setItem('print_layout_config', JSON.stringify(updated));
      }
      
      toast.success('Configurações atualizadas!');
    } catch {
      toast.error('Erro ao atualizar configurações.');
    } finally {
      setIsSaving(false);
    }
  }, [layouts, selectedType]);

  const updateBlocks = useCallback(async (blocks: PrintLayoutBlockUpdate[]) => {
    const currentLayout = layouts[selectedType];
    if (!currentLayout) return;
    
    try {
      setIsSaving(true);
      const updatedBlocks = await updatePrintLayoutBlocks(blocks, selectedType);
      const updatedLayout = { ...currentLayout, blocks: updatedBlocks };
      setLayouts(prev => ({ ...prev, [selectedType]: updatedLayout }));
      localStorage.setItem(`print_layout_config_${selectedType}`, JSON.stringify(updatedLayout));
      
      if (selectedType === 'table') {
        localStorage.setItem('print_layout_config', JSON.stringify(updatedLayout));
      }
    } catch {
      toast.error('Erro ao atualizar blocos.');
    } finally {
      setIsSaving(false);
    }
  }, [layouts, selectedType]);

  const addCustomBlock = useCallback(async (label: string, content?: string) => {
    const currentLayout = layouts[selectedType];
    if (!currentLayout) return;
    
    try {
      setIsSaving(true);
      const newBlock = await addPrintLayoutCustomBlock({
        label,
        customContent: content,
      }, selectedType);
      
      const updatedLayout = {
        ...currentLayout,
        blocks: [...currentLayout.blocks, newBlock].sort((a, b) => a.order - b.order)
      };
      setLayouts(prev => ({ ...prev, [selectedType]: updatedLayout }));
      localStorage.setItem(`print_layout_config_${selectedType}`, JSON.stringify(updatedLayout));
      
      if (selectedType === 'table') {
        localStorage.setItem('print_layout_config', JSON.stringify(updatedLayout));
      }
      
      toast.success('Bloco adicionado!');
    } catch {
      toast.error('Erro ao adicionar bloco.');
    } finally {
      setIsSaving(false);
    }
  }, [layouts, selectedType]);

  const removeBlock = useCallback(async (blockId: string) => {
    const currentLayout = layouts[selectedType];
    if (!currentLayout) return;
    
    try {
      setIsSaving(true);
      await removePrintLayoutBlock(blockId, selectedType);
      
      const updatedLayout = {
        ...currentLayout,
        blocks: currentLayout.blocks.filter(b => b.id !== blockId)
      };
      setLayouts(prev => ({ ...prev, [selectedType]: updatedLayout }));
      localStorage.setItem(`print_layout_config_${selectedType}`, JSON.stringify(updatedLayout));
      
      if (selectedType === 'table') {
        localStorage.setItem('print_layout_config', JSON.stringify(updatedLayout));
      }
      
      toast.success('Bloco removido!');
    } catch {
      toast.error('Erro ao remover bloco.');
    } finally {
      setIsSaving(false);
    }
  }, [layouts, selectedType]);

  const refreshType = useCallback(async (type: PrintLayoutType) => {
    await fetchLayoutByType(type);
  }, [fetchLayoutByType]);

  // Computed values
  const currentLayout = layouts[selectedType];
  const currentBlocks = useMemo(() => currentLayout?.blocks || [], [currentLayout]);
  const currentGlobalSettings = useMemo(() => {
    if (!currentLayout) return null;
    return {
      fontFamily: currentLayout.fontFamily,
      fontSize: currentLayout.fontSize,
      lineHeight: currentLayout.lineHeight,
      paperWidth: currentLayout.paperWidth,
      sectionSpacing: currentLayout.sectionSpacing,
      itemSpacing: currentLayout.itemSpacing,
      paperFeed: currentLayout.paperFeed,
      useInit: currentLayout.useInit,
    };
  }, [currentLayout]);

  const allExist = useMemo(() => {
    return VALID_TYPES.every(type => layouts[type] !== null);
  }, [layouts]);

  return useMemo(() => ({
    layouts,
    selectedType,
    currentLayout,
    currentBlocks,
    currentGlobalSettings,
    isLoading,
    isSaving,
    allExist,
    setSelectedType,
    createDefault,
    createAllDefaults,
    updateGlobalSettings,
    updateBlocks,
    addCustomBlock,
    removeBlock,
    refresh: fetchAllLayouts,
    refreshType,
  }), [
    layouts,
    selectedType,
    currentLayout,
    currentBlocks,
    currentGlobalSettings,
    isLoading,
    isSaving,
    allExist,
    setSelectedType,
    createDefault,
    createAllDefaults,
    updateGlobalSettings,
    updateBlocks,
    addCustomBlock,
    removeBlock,
    fetchAllLayouts,
    refreshType,
  ]);
}
