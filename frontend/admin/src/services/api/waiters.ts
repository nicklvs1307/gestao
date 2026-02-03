import apiClient from './client';

export const getWaiterSettlement = async (date: string) => {
  const response = await apiClient.get(`/admin/waiters/settlement?date=${date}`);
  return response.data;
};

export const payWaiterCommission = async (data: { waiterId: string, amount: number, date: string }) => {
  const response = await apiClient.post('/admin/waiters/settlement/pay', data);
  return response.data;
};
