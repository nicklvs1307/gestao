import api from './client';

export interface AddonIngredient {
  ingredientId: string;
  quantity: number;
}

export interface Addon {
  id?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  maxQuantity: number;
  order: number;
  saiposIntegrationCode?: string;
  ingredients?: AddonIngredient[];
}

export interface AddonGroup {
  id?: string;
  name: string;
  type: 'single' | 'multiple';
  isRequired: boolean;
  isFlavorGroup?: boolean;
  minQuantity?: number; // Mínimo total de itens no grupo
  maxQuantity?: number; // Máximo total de itens no grupo
  order: number;
  saiposIntegrationCode?: string;
  addons: Addon[];
}

export const addonService = {
  getAll: async () => {
    const response = await api.get<AddonGroup[]>('/addons');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<AddonGroup>(`/addons/${id}`);
    return response.data;
  },

  create: async (data: AddonGroup) => {
    const response = await api.post<AddonGroup>('/addons', data);
    return response.data;
  },

  update: async (id: string, data: AddonGroup) => {
    const response = await api.put<AddonGroup>(`/addons/${id}`, data);
    return response.data;
  },

  duplicate: async (id: string) => {
    const response = await api.post<AddonGroup>(`/addons/${id}/duplicate`);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/addons/${id}`);
  },

  reorder: async (items: { id: string, order: number }[]) => {
    const response = await api.patch('/addons/reorder', { items });
    return response.data;
  }
};
