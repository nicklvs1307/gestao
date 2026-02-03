import apiClient from './client';

export const getIngredients = async () => {
  const response = await apiClient.get('/ingredients');
  return response.data;
};

export const createIngredient = async (data: any) => {
  const response = await apiClient.post('/ingredients', data);
  return response.data;
};

export const updateIngredient = async (id: string, data: any) => {
  const response = await apiClient.put(`/ingredients/${id}`, data);
  return response.data;
};

export const deleteIngredient = async (id: string) => {
  const response = await apiClient.delete(`/ingredients/${id}`);
  return response.data;
};

export const getStockEntries = async () => {
    const response = await apiClient.get('/stock/entries');
    return response.data;
};

export const createStockEntry = async (data: any) => {
    const response = await apiClient.post('/stock/entries', data);
    return response.data;
};

export const confirmStockEntry = async (id: string) => {
    const response = await apiClient.put(`/stock/entries/${id}/confirm`);
    return response.data;
};

// Produção / Beneficiamento
export const getProductionHistory = async () => {
    const response = await apiClient.get('/production/history');
    return response.data;
};

export const produceIngredient = async (data: { ingredientId: string, quantity: number }) => {
    const response = await apiClient.post('/production/produce', data);
    return response.data;
};

export const getIngredientRecipes = async () => {
    const response = await apiClient.get('/production/recipes');
    return response.data;
};

export const saveIngredientRecipe = async (id: string, items: { componentIngredientId: string, quantity: number }[]) => {
    const response = await apiClient.post(`/production/${id}/recipe`, { items });
    return response.data;
};

// Perdas
export const getStockLosses = async () => {
    const response = await apiClient.get('/stock/losses');
    return response.data;
};

export const createStockLoss = async (data: { ingredientId: string, quantity: number, reason: string, notes?: string }) => {
    const response = await apiClient.post('/stock/losses', data);
    return response.data;
};

// Inventário / Balanço
export const performAuditStock = async (items: { ingredientId: string, physicalStock: number }[]) => {
    const response = await apiClient.post('/stock/audit', { items });
    return response.data;
};
