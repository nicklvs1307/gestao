import apiClient from './client';

export interface FichaTecnicaIngredient {
  id?: string;
  ingredientId: string;
  quantity: number;
  ingredient?: {
    id: string;
    name: string;
    averageCost: number;
    unit: string;
    lastUnitCost?: number;
  };
}

export interface FichaTecnica {
  id: string;
  name: string;
  description?: string;
  yieldAmount: number;
  costPrice: number;
  restaurantId: string;
  ingredients: FichaTecnicaIngredient[];
  products?: { id: string; name: string; price: number; costPrice: number }[];
  addons?: { id: string; name: string; price: number; costPrice: number }[];
  _count?: { products: number; addons: number };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateFichaTecnicaDTO {
  name: string;
  description?: string;
  yieldAmount?: number;
  ingredients: { ingredientId: string; quantity: number }[];
}

export interface UpdateFichaTecnicaDTO {
  name?: string;
  description?: string;
  yieldAmount?: number;
  ingredients?: { ingredientId: string; quantity: number }[];
}

// Listar todas as fichas técnicas
export const getAll = async (search?: string): Promise<FichaTecnica[]> => {
  const params = search ? { search } : {};
  const response = await apiClient.get('/fichas-tecnicas', { params });
  return response.data.fichasTecnicas;
};

// Buscar ficha por ID
export const getById = async (id: string): Promise<FichaTecnica> => {
  const response = await apiClient.get(`/fichas-tecnicas/${id}`);
  return response.data;
};

// Criar ficha técnica
export const create = async (data: CreateFichaTecnicaDTO): Promise<FichaTecnica> => {
  const response = await apiClient.post('/fichas-tecnicas', data);
  return response.data;
};

// Atualizar ficha técnica
export const update = async (id: string, data: UpdateFichaTecnicaDTO): Promise<FichaTecnica> => {
  const response = await apiClient.put(`/fichas-tecnicas/${id}`, data);
  return response.data;
};

// Deletar ficha técnica
export const remove = async (id: string): Promise<void> => {
  await apiClient.delete(`/fichas-tecnicas/${id}`);
};

// Duplicar ficha técnica
export const duplicate = async (id: string, name?: string): Promise<FichaTecnica> => {
  const response = await apiClient.post(`/fichas-tecnicas/${id}/duplicate`, { name });
  return response.data;
};

// Vincular ficha a produto
export const linkProduct = async (fichaId: string, productId: string): Promise<void> => {
  await apiClient.put(`/fichas-tecnicas/${fichaId}/link-product/${productId}`);
};

// Vincular ficha a adicional
export const linkAddon = async (fichaId: string, addonId: string): Promise<void> => {
  await apiClient.put(`/fichas-tecnicas/${fichaId}/link-addon/${addonId}`);
};

// Desvincular ficha de produto
export const unlinkProduct = async (fichaId: string, productId: string): Promise<void> => {
  await apiClient.put(`/fichas-tecnicas/${fichaId}/unlink-product/${productId}`);
};

// Desvincular ficha de adicional
export const unlinkAddon = async (fichaId: string, addonId: string): Promise<void> => {
  await apiClient.put(`/fichas-tecnicas/${fichaId}/unlink-addon/${addonId}`);
};
