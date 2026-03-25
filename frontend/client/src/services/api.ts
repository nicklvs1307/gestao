import axios from 'axios';
import type { Product, Category, Promotion, Restaurant, RestaurantSettings, Table, Order, LocalCartItem } from '../types';

// Create axios instance with base URL and timeout
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

// Request interceptor: attach token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      // Remove token and user data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to login page
      // Note: In a real app, you might want to use a navigation service or event
      // For now, we'll use window.location
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Handle 403 Forbidden errors
    if (error.response?.status === 403) {
      // You might want to show a notification or redirect to an error page
      console.error('Access forbidden');
    }
    
    return Promise.reject(error);
  }
);

// Export the axios instance for direct use if needed
export { api };

// Export individual service functions using the axios instance with interceptors
export const getRestaurantBySlug = async (slug: string): Promise<Restaurant> => {
  const response = await api.get(`/delivery/restaurant/${slug}`);
  return response.data;
};

export const createDeliveryOrder = async (restaurantId: string, orderData: { items: LocalCartItem[], total: number, deliveryInfo: any }): Promise<Order> => {
  const response = await api.post(`/delivery/restaurants/${restaurantId}/delivery-orders`, orderData);
  return response.data;
};

export const getProducts = async (restaurantId: string): Promise<Product[]> => {
  const response = await api.get(`/client/products/${restaurantId}`);
  return response.data;
};

export const getCategories = async (restaurantId: string): Promise<Category[]> => {
  const response = await api.get(`/client/categories/${restaurantId}`);
  return response.data;
};

export const getActivePromotions = async (restaurantId: string): Promise<Promotion[]> => {
    const response = await api.get(`/client/promotions/active/${restaurantId}`);
    return response.data;
};

export const getIntegrationSettings = async (restaurantId: string) => {
  const response = await api.get(`/client/integration-settings/${restaurantId}`);
  return response.data;
};

export const requestCloseOrder = async (orderId: string) => {
  const response = await api.post(`/client/orders/${orderId}/request-close`);
  return response.data;
};

// Novas funções para TableMenu
export const getRestaurantSettings = async (restaurantId: string): Promise<RestaurantSettings> => {
  const response = await api.get(`/client/settings/${restaurantId}`);
  return response.data;
};

export const getTableInfo = async (restaurantId: string, tableNumber: string): Promise<Table> => {
  const response = await api.get(`/client/table-info?restaurantId=${restaurantId}&tableNumber=${tableNumber}`);
  return response.data;
};

export const getOrderForTable = async (restaurantId: string, tableNumber: string): Promise<Order> => {
  const response = await api.get(`/client/order/table?restaurantId=${restaurantId}&tableNumber=${tableNumber}`);
  return response.data;
};

export const batchAddItemsToOrder = async (orderId: string, items: LocalCartItem[], userId?: string): Promise<Order> => {
  const response = await api.post(`/client/orders/${orderId}/batch-add-items`, { items, userId });
  return response.data;
};

export const requestPayment = async (tableId: string) => {
  const response = await api.post(`/tables/${tableId}/request-payment`);
  return response.data;
};

export const generatePixPayment = async (orderId: string) => {
  const response = await api.post(`/payments/pix/${orderId}`);
  return response.data;
};

export const checkPixStatus = async (orderId: string) => {
  const response = await api.get(`/payments/pix/${orderId}/status`);
  return response.data;
};

export const getOrderById = async (orderId: string): Promise<Order> => {
  const response = await api.get(`/delivery/public/order/${orderId}`);
  return response.data;
};

export const getPaymentMethods = async (restaurantId: string): Promise<any[]> => {
  const response = await api.get(`/payment-methods/public/${restaurantId}`);
  return response.data;
};

export const sendTableRequest = async (restaurantId: string, tableNumber: string, type: 'WAITER' | 'BILL') => {
  const response = await api.post('/client/table-requests', { restaurantId, tableNumber, type });
  return response.data;
};