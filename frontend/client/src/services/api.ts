import axios from 'axios';
import type { Product, Category, Promotion, Restaurant, RestaurantSettings, Table, Order, LocalCartItem } from '../types';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

export const getRestaurantBySlug = async (slug: string): Promise<Restaurant> => {
  const response = await apiClient.get(`/delivery/restaurant/${slug}`);
  return response.data;
};

export const createDeliveryOrder = async (restaurantId: string, orderData: { items: LocalCartItem[], total: number, deliveryInfo: any }): Promise<Order> => {
  const response = await apiClient.post(`/delivery/restaurants/${restaurantId}/delivery-orders`, orderData);
  return response.data;
};

export const getProducts = async (restaurantId: string): Promise<Product[]> => {
  const response = await apiClient.get(`/client/products/${restaurantId}`);
  return response.data;
};

export const getCategories = async (restaurantId: string): Promise<Category[]> => {
  const response = await apiClient.get(`/client/categories/${restaurantId}`);
  return response.data;
};

export const getActivePromotions = async (restaurantId: string): Promise<Promotion[]> => {
    const response = await apiClient.get(`/client/promotions/active/${restaurantId}`);
    return response.data;
};

export const getIntegrationSettings = async (restaurantId: string) => {
  const response = await apiClient.get(`/client/integration-settings/${restaurantId}`);
  return response.data;
};

export const requestCloseOrder = async (orderId: string) => {
  const response = await apiClient.post(`/client/orders/${orderId}/request-close`);
  return response.data;
};

// Novas funções para TableMenu
export const getRestaurantSettings = async (restaurantId: string): Promise<RestaurantSettings> => {
  const response = await apiClient.get(`/client/settings/${restaurantId}`);
  return response.data;
};

export const getTableInfo = async (restaurantId: string, tableNumber: string): Promise<Table> => {
  const response = await apiClient.get(`/client/table-info?restaurantId=${restaurantId}&tableNumber=${tableNumber}`);
  return response.data;
};

export const getOrderForTable = async (restaurantId: string, tableNumber: string): Promise<Order> => {
  const response = await apiClient.get(`/client/order/table?restaurantId=${restaurantId}&tableNumber=${tableNumber}`);
  return response.data;
};

export const batchAddItemsToOrder = async (orderId: string, items: LocalCartItem[], userId?: string): Promise<Order> => {
  const response = await apiClient.post(`/client/orders/${orderId}/batch-add-items`, { items, userId });
  return response.data;
};

export const requestPayment = async (tableId: string) => {
  const response = await apiClient.post(`/tables/${tableId}/request-payment`);
  return response.data;
};

export const generatePixPayment = async (orderId: string) => {
  const response = await apiClient.post(`/payments/pix/${orderId}`);
  return response.data;
};

export const checkPixStatus = async (orderId: string) => {
  const response = await apiClient.get(`/payments/pix/${orderId}/status`);
  return response.data;
};

export const getOrderById = async (orderId: string): Promise<Order> => {
  const response = await apiClient.get(`/delivery/order/${orderId}`);
  return response.data;
};

export const getPaymentMethods = async (restaurantId: string): Promise<any[]> => {
  const response = await apiClient.get(`/payment-methods/public/${restaurantId}`);
  return response.data;
};

export const sendTableRequest = async (restaurantId: string, tableNumber: string, type: 'WAITER' | 'BILL') => {
  const response = await apiClient.post('/client/table-requests', { restaurantId, tableNumber, type });
  return response.data;
};