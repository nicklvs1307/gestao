import apiClient from './client';
import type {
  PrintLayoutConfig,
  PrintLayoutBlock,
  PrintLayoutGlobalSettings,
  PrintLayoutBlockUpdate,
  PrintLayoutBlockType,
  PrintLayoutMigrationData,
} from '../../types/printLayout';

/**
 * GET /api/admin/print-layout
 * Busca a configuração de layout ativa do restaurante
 */
export const getPrintLayout = async (): Promise<{ exists: boolean; config: PrintLayoutConfig | null }> => {
  const response = await apiClient.get('/admin/print-layout');
  return response.data;
};

/**
 * POST /api/admin/print-layout
 * Cria a configuração padrão de layout para o restaurante
 */
export const createDefaultPrintLayout = async (
  globalSettings?: Partial<PrintLayoutGlobalSettings>
): Promise<PrintLayoutConfig> => {
  const response = await apiClient.post('/admin/print-layout', { globalSettings });
  return response.data;
};

/**
 * POST /api/admin/print-layout/migrate
 * Migra configuração do localStorage para o backend
 */
export const migratePrintLayout = async (
  data: PrintLayoutMigrationData
): Promise<PrintLayoutConfig> => {
  const response = await apiClient.post('/admin/print-layout/migrate', data);
  return response.data;
};

/**
 * PUT /api/admin/print-layout
 * Atualiza as configurações globais do layout
 */
export const updatePrintLayoutGlobalSettings = async (
  data: Partial<PrintLayoutGlobalSettings>
): Promise<PrintLayoutConfig> => {
  const response = await apiClient.put('/admin/print-layout', data);
  return response.data;
};

/**
 * PUT /api/admin/print-layout/blocks
 * Atualiza todos os blocos de uma vez (batch update)
 */
export const updatePrintLayoutBlocks = async (
  blocks: PrintLayoutBlockUpdate[]
): Promise<PrintLayoutBlock[]> => {
  const response = await apiClient.put('/admin/print-layout/blocks', { blocks });
  return response.data;
};

/**
 * POST /api/admin/print-layout/blocks
 * Adiciona um bloco customizado
 */
export const addPrintLayoutCustomBlock = async (data: {
  label: string;
  customContent?: string;
  fontSize?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
}): Promise<PrintLayoutBlock> => {
  const response = await apiClient.post('/admin/print-layout/blocks', data);
  return response.data;
};

/**
 * DELETE /api/admin/print-layout/blocks/:blockId
 * Remove um bloco customizado
 */
export const removePrintLayoutBlock = async (blockId: string): Promise<{ success: boolean }> => {
  const response = await apiClient.delete(`/admin/print-layout/blocks/${blockId}`);
  return response.data;
};

/**
 * GET /api/admin/print-layout/block-types
 * Lista os tipos de bloco disponíveis
 */
export const getPrintLayoutBlockTypes = async (): Promise<PrintLayoutBlockType[]> => {
  const response = await apiClient.get('/admin/print-layout/block-types');
  return response.data;
};
