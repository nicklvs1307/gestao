import apiClient from './client';

export const getTables = async () => {
  const response = await apiClient.get('/tables');
  return response.data;
};

export const createTable = async (tableData: any) => {
  const response = await apiClient.post('/tables', tableData);
  return response.data;
};

export const updateTable = async (id: string, tableData: any) => {
  const response = await apiClient.put(`/tables/${id}`, tableData);
  return response.data;
};

export const deleteTable = async (id: string) => {
  const response = await apiClient.delete(`/tables/${id}`);
  return response.data;
};

export const getPosTableSummary = async () => {
    const response = await apiClient.get('/tables/summary');
    return response.data;
};

export const checkoutTable = async (tableId: string, payments: { method: string, amount: number }[], orderIds?: string[]) => {
    const response = await apiClient.post(`/tables/${tableId}/checkout`, { payments, orderIds });
    return response.data;
};

export const partialTablePayment = async (tableId: string, itemIds: string[], payments: { method: string, amount: number }[]) => {
    const response = await apiClient.post(`/tables/${tableId}/partial-payment`, { itemIds, payments });
    return response.data;
};

export const partialValuePayment = async (tableId: string, orderId: string, payments: { method: string, amount: number }[]) => {
    const response = await apiClient.post(`/tables/${tableId}/partial-value-payment`, { orderId, payments });
    return response.data;
};

export const getTableRequests = async () => {
    const response = await apiClient.get('/tables/requests/pending');
    return response.data;
};

export const resolveTableRequest = async (id: string) => {
    const response = await apiClient.put(`/tables/requests/${id}/resolve`);
    return response.data;
};
