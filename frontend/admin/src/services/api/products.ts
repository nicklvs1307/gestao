import apiClient from './client';

export const getProducts = async (): Promise<Product[]> => {
  const response = await apiClient.get('/products');
  return response.data;
};

export const getPricingAnalysis = async () => {
  const response = await apiClient.get('/products/pricing-analysis');
  return response.data;
};

export const createProduct = async (data: Partial<Product>): Promise<Product> => {
  const response = await apiClient.post('/products', productData);
  return response.data;
};

export const updateProduct = async (id: string, productData: any) => {
  const response = await apiClient.put(`/products/${id}`, productData);
  return response.data;
};

export const deleteProduct = async (id: string) => {
  const response = await apiClient.delete(`/products/${id}`);
  return response.data;
};

export const uploadProductImage = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  const response = await apiClient.post('/products/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
