import apiClient from './client';

export const getAdminOrders = async () => {
  const response = await apiClient.get('/admin/orders');
  return response.data;
};

export const updateOrderStatus = async (orderId: string, status: string) => {
  const response = await apiClient.put(`/admin/orders/${orderId}/status`, { status });
  return response.data;
};

export const updateOrderPaymentMethod = async (orderId: string, newMethod: string) => {
  const response = await apiClient.patch(`/admin/orders/${orderId}/payment-method`, { newMethod });
  return response.data;
};

export const updateDeliveryType = async (orderId: string, deliveryType: 'delivery' | 'pickup') => {
    const response = await apiClient.patch(`/admin/orders/${orderId}/delivery-type`, { deliveryType });
    return response.data;
};

export const transferTable = async (currentTableNumber: number, targetTableNumber: number, restaurantId: string) => {
    const response = await apiClient.post('/admin/orders/transfer-table', { currentTableNumber, targetTableNumber, restaurantId });
    return response.data;
};

export const transferItems = async (sourceOrderId: string, targetTableNumber: number, itemIds: string[], restaurantId: string, userId: string) => {
    const response = await apiClient.post('/admin/orders/transfer-items', { sourceOrderId, targetTableNumber, itemIds, restaurantId, userId });
    return response.data;
};

export const removeOrderItem = async (orderId: string, itemId: string) => {
    const response = await apiClient.delete(`/admin/orders/${orderId}/items/${itemId}`);
    return response.data;
};

export const sendTableRequest = async (restaurantId: string, tableNumber: string, type: 'WAITER' | 'BILL') => {
    const response = await apiClient.post('/client/table-requests', { restaurantId, tableNumber, type });
    return response.data;
};

export const assignDriver = async (orderId: string, driverId: string) => {
    const response = await apiClient.patch(`/delivery/delivery-orders/${orderId}/assign-driver`, { driverId });
    return response.data;
};

export const createOrder = async (orderData: any) => {
  const response = await apiClient.post('/admin/orders', orderData);
  return response.data;
};

export const markOrderAsPrinted = async (orderId: string) => {
  const response = await apiClient.patch(`/admin/orders/${orderId}/printed`);
  return response.data;
};

export const payDriverSettlement = async (data: { driverName: string, amount: number, date: string }) => {
    const response = await apiClient.post('/admin/orders/drivers/settlement/pay', data);
    return response.data;
};
