import apiClient from './client';
import type { PaymentMethod } from '../../types';

export const getPaymentMethods = async (restaurantId: string): Promise<PaymentMethod[]> => {
  const response = await apiClient.get(`/payment-methods/${restaurantId}`);
  return response.data;
};

export const createPaymentMethod = async (restaurantId: string, data: Partial<PaymentMethod>): Promise<PaymentMethod> => {
  const response = await apiClient.post(`/payment-methods/${restaurantId}`, data);
  return response.data;
};

export const updatePaymentMethod = async (id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod> => {
  const response = await apiClient.put(`/payment-methods/${id}`, data);
  return response.data;
};

export const deletePaymentMethod = async (id: string): Promise<void> => {
  await apiClient.delete(`/payment-methods/${id}`);
};
