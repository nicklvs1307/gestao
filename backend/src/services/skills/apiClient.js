/**
 * ApiClient - Cliente HTTP para skills chamarem APIs REST internas
 * 
 * Centraliza todas as chamadas HTTP para as APIs do backend.
 * As APIs de cliente são públicas (sem autenticação).
 */

const axios = require('axios');
const logger = require('../../config/logger');

const BASE_URL = process.env.INTERNAL_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor para logging de erros
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    logger.error(`[ApiClient] Erro ${status}: ${message}`);
    return Promise.reject({ status, message, data: error.response?.data });
  }
);

class ApiClient {
  // ============================================================
  // PRODUTOS / CARDÁPIO
  // ============================================================

  async getProducts(restaurantId) {
    const { data } = await apiClient.get(`/products/client/${restaurantId}`);
    return data;
  }

  async getCategories(restaurantId) {
    const { data } = await apiClient.get(`/client/categories/${restaurantId}`);
    return data;
  }

  async getActivePromotions(restaurantId) {
    const { data } = await apiClient.get(`/promotions/active/${restaurantId}`);
    return data;
  }

  // ============================================================
  // CLIENTES
  // ============================================================

  async searchCustomers(restaurantId, query) {
    const { data } = await apiClient.get(`/customers/search`, {
      params: { restaurantId, q: query }
    });
    return data;
  }

  async createCustomer(data) {
    const { data: result } = await apiClient.post('/customers', data);
    return result;
  }

  async updateCustomer(id, data) {
    const { data: result } = await apiClient.put(`/customers/${id}`, data);
    return result;
  }

  // ============================================================
  // PEDIDOS
  // ============================================================

  async createDeliveryOrder(restaurantId, orderData) {
    const { data } = await apiClient.post(
      `/delivery/restaurants/${restaurantId}/delivery-orders`,
      orderData
    );
    return data;
  }

  async getOrder(orderId) {
    const { data } = await apiClient.get(`/delivery/order/${orderId}`);
    return data;
  }

  async getOrderByPhone(phone) {
    const { data } = await apiClient.get('/admin/orders', {
      params: { phone }
    });
    return data;
  }

  async cancelOrder(orderId, reason) {
    const { data } = await apiClient.put(`/admin/orders/${orderId}/status`, {
      status: 'CANCELED',
      reason
    });
    return data;
  }

  // ============================================================
  // ENTREGA
  // ============================================================

  async getDeliveryAreas(restaurantId) {
    const { data } = await apiClient.get('/delivery-areas', {
      params: { restaurantId }
    });
    return data;
  }

  async getRestaurantSettings(restaurantId) {
    const { data } = await apiClient.get(`/settings/${restaurantId}`);
    return data;
  }

  // ============================================================
  // PAGAMENTOS
  // ============================================================

  async getPaymentMethods(restaurantId) {
    const { data } = await apiClient.get(`/payment-methods/public/${restaurantId}`);
    return data;
  }

  // ============================================================
  // FIDELIDADE
  // ============================================================

  async getLoyaltyInfo(restaurantId) {
    const { data } = await apiClient.get(`/settings/${restaurantId}`);
    return data;
  }

  async getCustomerLoyaltyBalance(customerId) {
    const { data } = await apiClient.get(`/customers/${customerId}`);
    return data;
  }

  // ============================================================
  // INFORMAÇÕES DA LOJA
  // ============================================================

  async getRestaurantBySlug(slug) {
    const { data } = await apiClient.get(`/settings/slug/${slug}`);
    return data;
  }

  async getKnowledgeBase(restaurantId, query) {
    const { data } = await apiClient.get('/whatsapp/knowledge', {
      params: { restaurantId, q: query }
    });
    return data;
  }
}

module.exports = new ApiClient();
