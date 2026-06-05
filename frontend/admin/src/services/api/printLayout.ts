import apiClient from './client';
import type {
  PrintLayoutConfig,
  PrintLayoutBlock,
  PrintLayoutGlobalSettings,
  PrintLayoutBlockUpdate,
  PrintLayoutBlockType,
  PrintLayoutMigrationData,
  PrintLayoutType,
} from '../../types/printLayout';

/**
 * GET /api/admin/print-layout
 * Busca a configuração de layout ativa do restaurante por tipo
 */
export const getPrintLayout = async (type: PrintLayoutType = 'table'): Promise<{ exists: boolean; config: PrintLayoutConfig | null }> => {
  const response = await apiClient.get('/admin/print-layout', { params: { type } });
  return response.data;
};

/**
 * GET /api/admin/print-layout/all
 * Busca todos os layouts do restaurante (delivery, pickup, table)
 */
export const getAllPrintLayouts = async (): Promise<{ configs: PrintLayoutConfig[] }> => {
  const response = await apiClient.get('/admin/print-layout/all');
  return response.data;
};

/**
 * POST /api/admin/print-layout
 * Cria a configuração padrão de layout para o restaurante
 */
export const createDefaultPrintLayout = async (
  type: PrintLayoutType = 'table',
  globalSettings?: Partial<PrintLayoutGlobalSettings>
): Promise<PrintLayoutConfig> => {
  const response = await apiClient.post('/admin/print-layout', { type, globalSettings });
  return response.data;
};

/**
 * POST /api/admin/print-layout/create-all
 * Cria todos os layouts padrão (delivery, pickup, table) de uma vez
 */
export const createAllDefaultPrintLayouts = async (
  globalSettings?: Partial<PrintLayoutGlobalSettings>
): Promise<{ configs: PrintLayoutConfig[] }> => {
  const response = await apiClient.post('/admin/print-layout/create-all', { globalSettings });
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
  data: Partial<PrintLayoutGlobalSettings>,
  type: PrintLayoutType = 'table'
): Promise<PrintLayoutConfig> => {
  const response = await apiClient.put('/admin/print-layout', data, { params: { type } });
  return response.data;
};

/**
 * PUT /api/admin/print-layout/blocks
 * Atualiza todos os blocos de uma vez (batch update)
 */
export const updatePrintLayoutBlocks = async (
  blocks: PrintLayoutBlockUpdate[],
  type: PrintLayoutType = 'table'
): Promise<PrintLayoutBlock[]> => {
  const response = await apiClient.put('/admin/print-layout/blocks', { blocks }, { params: { type } });
  return response.data;
};

/**
 * POST /api/admin/print-layout/blocks
 * Adiciona um bloco customizado
 */
export const addPrintLayoutCustomBlock = async (
  data: {
    label: string;
    customContent?: string;
    fontSize?: string;
    fontWeight?: string;
    fontStyle?: string;
    textAlign?: string;
  },
  type: PrintLayoutType = 'table'
): Promise<PrintLayoutBlock> => {
  const response = await apiClient.post('/admin/print-layout/blocks', data, { params: { type } });
  return response.data;
};

/**
 * DELETE /api/admin/print-layout/blocks/:blockId
 * Remove um bloco customizado
 */
export const removePrintLayoutBlock = async (
  blockId: string,
  type: PrintLayoutType = 'table'
): Promise<{ success: boolean }> => {
  const response = await apiClient.delete(`/admin/print-layout/blocks/${blockId}`, { params: { type } });
  return response.data;
};

/**
 * DELETE /api/admin/print-layout
 * Deleta a configuração de layout por tipo
 */
export const deletePrintLayout = async (type: PrintLayoutType = 'table'): Promise<{ success: boolean }> => {
  const response = await apiClient.delete('/admin/print-layout', { params: { type } });
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

/**
 * GET /api/admin/print-layout/types
 * Lista os tipos de layout disponíveis
 */
export const getPrintLayoutTypes = async (): Promise<{ types: PrintLayoutType[]; labels: Record<PrintLayoutType, string> }> => {
  const response = await apiClient.get('/admin/print-layout/types');
  return response.data;
};
