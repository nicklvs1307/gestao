import apiClient from './client';

export const getCategories = async (flat = false) => {
    const url = flat ? '/categories/flat' : '/categories';
    const response = await apiClient.get(url);
    return response.data;
};

export const createCategory = async (categoryData: any) => {
  const response = await apiClient.post('/categories', categoryData);
  return response.data;
};

export const updateCategory = async (id: string, categoryData: any) => {
  const response = await apiClient.put(`/categories/${id}`, categoryData);
  return response.data;
};

export const deleteCategory = async (id: string) => {
  const response = await apiClient.delete(`/categories/${id}`);
  return response.data;
};

export const reorderCategories = async (items: { id: string, order: number }[]) => {
  const response = await apiClient.patch('/categories/reorder', { items });
  return response.data;
};
