import apiClient from './client';

export const getCustomers = async () => {
    const response = await apiClient.get('/customers');
    return response.data;
};

export const searchCustomers = async (query: string) => {
    const response = await apiClient.get(`/customers/search?query=${query}`);
    return response.data;
};

export const createCustomer = async (data: Record<string, unknown>) => {
    const response = await apiClient.post('/customers', data);
    return response.data;
};

export const updateCustomer = async (id: string, data: Record<string, unknown>) => {
    const response = await apiClient.put(`/customers/${id}`, data);
    return response.data;
};

export const deleteCustomer = async (id: string) => {
    const response = await apiClient.delete(`/customers/${id}`);
    return response.data;
};

export const getCustomerAddresses = async (customerId: string) => {
    const response = await apiClient.get(`/customers/${customerId}/addresses`);
    return response.data;
};

export const createCustomerAddress = async (customerId: string, data: Record<string, unknown>) => {
    const response = await apiClient.post(`/customers/${customerId}/addresses`, data);
    return response.data;
};

export const updateCustomerAddress = async (addressId: string, data: Record<string, unknown>) => {
    const response = await apiClient.put(`/customers/addresses/${addressId}`, data);
    return response.data;
};

export const deleteCustomerAddress = async (addressId: string) => {
    const response = await apiClient.delete(`/customers/addresses/${addressId}`);
    return response.data;
};
