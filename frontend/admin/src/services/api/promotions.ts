import apiClient from './client';

export const getPromotions = async () => {
  const response = await apiClient.get('/promotions');
  return response.data;
};

export const createPromotion = async (promotionData: any) => {
  const response = await apiClient.post('/promotions', promotionData);
  return response.data;
};

export const updatePromotion = async (id: string, promotionData: any) => {
  const response = await apiClient.put(`/promotions/${id}`, promotionData);
  return response.data;
};

export const deletePromotion = async (id: string) => {
  const response = await apiClient.delete(`/promotions/${id}`);
  return response.data;
};

export const getActivePromotions = async (restaurantId: string) => {
  const response = await apiClient.get(`/client/promotions/active/${restaurantId}`);
  return response.data;
};
