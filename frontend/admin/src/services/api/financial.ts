import apiClient from './client';

export const getSuppliers = async () => {
  const response = await apiClient.get('/financial/suppliers');
  return response.data;
};

export const createSupplier = async (data: any) => {
  const response = await apiClient.post('/financial/suppliers', data);
  return response.data;
};

export const updateSupplier = async (id: string, data: any) => {
  const response = await apiClient.put(`/financial/suppliers/${id}`, data);
  return response.data;
};

export const deleteSupplier = async (id: string) => {
  const response = await apiClient.delete(`/financial/suppliers/${id}`);
  return response.data;
};

export const getFinancialCategories = async () => {
  const response = await apiClient.get('/financial/categories');
  return response.data;
};

export const createFinancialCategory = async (data: any) => {
  const response = await apiClient.post('/financial/categories', data);
  return response.data;
};

export const getTransactions = async () => {
  const response = await apiClient.get('/financial/transactions');
  return response.data;
};

export const createTransaction = async (data: any) => {
  const response = await apiClient.post('/financial/transactions', data);
  return response.data;
};

export const getBankAccounts = async () => {
  const response = await apiClient.get('/financial/bank-accounts');
  return response.data;
};

export const getCashierStatus = async () => {
    const response = await apiClient.get('/cashier/status');
    return response.data;
};

export const getCashierSummary = async () => {
    const response = await apiClient.get('/cashier/summary');
    return response.data;
};

export const openCashier = async (initialAmount: number) => {
    const response = await apiClient.post('/cashier/open', { initialAmount });
    return response.data;
};

export const closeCashier = async (finalAmount: number, notes?: string) => {
    const response = await apiClient.post('/cashier/close', { finalAmount, notes });
    return response.data;
};

export const addCashierTransaction = async (data: { description: string, amount: number, type: 'INCOME' | 'EXPENSE' }) => {
    const response = await apiClient.post('/cashier/transaction', data);
    return response.data;
};

export const getCashierHistory = async () => {
    const response = await apiClient.get('/cashier/history');
    return response.data;
};
