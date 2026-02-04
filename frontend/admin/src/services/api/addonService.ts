import api from '../api';

export interface AddonIngredient {
  ingredientId: string;
  quantity: number;
}

export interface Addon {
  id?: string;
  name: string;
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
  order: number;
  saiposIntegrationCode?: string;
  addons: Addon[];
}

export const addonService = {
  getAll: async () => {
    const response = await api.get<AddonGroup[]>('/addons');
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

  delete: async (id: string) => {
    await api.delete(`/addons/${id}`);
  }
};
