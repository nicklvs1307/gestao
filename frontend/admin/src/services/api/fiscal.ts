import apiClient from './client';

export const getFiscalConfig = async () => {
    const response = await apiClient.get('/fiscal/config');
    return response.data;
};

export const saveFiscalConfig = async (data: any) => {
    const response = await apiClient.post('/fiscal/config', data);
    return response.data;
};

export const emitInvoice = async (orderId: string) => {
    const response = await apiClient.post('/fiscal/emit', { orderId });
    return response.data;
};

export const getInvoices = async () => {
    const response = await apiClient.get('/fiscal/invoices');
    return response.data;
};
