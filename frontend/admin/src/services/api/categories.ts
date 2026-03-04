import apiClient from './client';

export async function getCategories(flat = false) {
    const url = flat ? '/categories/flat' : '/categories';
    const response = await apiClient.get(url);
    return response.data;
}

export async function getCategoryById(id: string) {
  const response = await apiClient.get(`/categories/${id}`);
  return response.data;
}

export async function createCategory(categoryData: any) {
  const response = await apiClient.post('/categories', categoryData);
  return response.data;
}

export async function updateCategory(id: string, categoryData: any) {
  const response = await apiClient.put(`/categories/${id}`, categoryData);
  return response.data;
}

export async function deleteCategory(id: string) {
  const response = await apiClient.delete(`/categories/${id}`);
  return response.data;
}

export async function reorderCategories(items: { id: string, order: number }[]) {
  const response = await apiClient.patch('/categories/reorder', { items });
  return response.data;
}
