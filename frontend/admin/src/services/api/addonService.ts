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
  costPrice: number;
  promoPrice?: number;
  promoStartDate?: string | Date;
  promoEndDate?: string | Date;
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
  minQuantity?: number;
  maxQuantity?: number;
  order: number;
  saiposIntegrationCode?: string;
  addons: Addon[];
}

export const getAddonGroups = async () => {
  const response = await api.get<AddonGroup[]>('/addons');
  return response.data;
};

export const getAddonGroupById = async (id: string) => {
  const response = await api.get<AddonGroup>(`/addons/${id}`);
  return response.data;
};

export const createAddonGroup = async (data: AddonGroup) => {
  const response = await api.post<AddonGroup>('/addons', data);
  return response.data;
};

export const updateAddonGroup = async (id: string, data: AddonGroup) => {
  const response = await api.put<AddonGroup>(`/addons/${id}`, data);
  return response.data;
};

export const duplicateAddonGroup = async (id: string) => {
  const response = await api.post<AddonGroup>(`/addons/${id}/duplicate`);
  return response.data;
};

export const deleteAddonGroup = async (id: string) => {
  await api.delete(`/addons/${id}`);
};

export const reorderAddonGroups = async (items: { id: string, order: number }[]) => {
  const response = await api.patch('/addons/reorder', { items });
  return response.data;
};

export const updateAddon = async (id: string, data: Partial<Addon>) => {
  const response = await api.put(`/addons/item/${id}`, data);
  return response.data;
};

export const addonService = {
  getAll: getAddonGroups,
  getById: getAddonGroupById,
  create: createAddonGroup,
  update: updateAddonGroup,
  duplicate: duplicateAddonGroup,
  delete: deleteAddonGroup,
  reorder: reorderAddonGroups,
  updateAddon
};
