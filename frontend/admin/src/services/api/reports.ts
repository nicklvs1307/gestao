import apiClient from './client';

export const getDre = async (startDate: string, endDate: string) => {
    const response = await apiClient.get('/admin/reports/dre', {
        params: { startDate, endDate }
    });
    return response.data;
};

export const getStaffPerformance = async (startDate: string, endDate: string) => {
    const response = await apiClient.get('/admin/reports/performance/staff', {
        params: { startDate, endDate }
    });
    return response.data;
};

export const getReportsSummary = async () => {
    const response = await apiClient.get('/admin/reports/summary');
    return response.data;
};

export const getSalesHistory = async () => {
    const response = await apiClient.get('/admin/reports/sales-history');
    return response.data;
};

export const getTopProducts = async () => {
    const response = await apiClient.get('/admin/reports/top-products');
    return response.data;
};

export const getPaymentMethodsReport = async () => {
    const response = await apiClient.get('/admin/reports/payment-methods');
    return response.data;
};

export const getDashboardStats = async () => {
    const [ordersResponse, summaryResponse] = await Promise.all([
        apiClient.get('/admin/orders'),
        apiClient.get('/admin/reports/summary'),
    ]);

    const orders = ordersResponse.data;
    const summary = summaryResponse.data;
    
    const today = new Date().toISOString().split('T')[0];
    const ordersToday = orders.filter((order: any) => order.createdAt.startsWith(today));
    
    return {
        ordersToday: ordersToday.length,
        revenueToday: summary.totalRevenue,
        activeProducts: summary.activeProducts,
        customersToday: new Set(ordersToday.map((o: any) => o.tableNumber)).size,
    };
};