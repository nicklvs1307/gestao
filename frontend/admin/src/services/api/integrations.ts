import apiClient from './client';

export const getSaiposSettings = async () => {
  const response = await apiClient.get('/integrations/saipos');
  return response.data;
};

export const updateSaiposSettings = async (settingsData: Record<string, unknown>) => {
  const response = await apiClient.put('/integrations/saipos', settingsData);
  return response.data;
};

export const getUairangoSettings = async () => {
  const response = await apiClient.get('/integrations/uairango');
  return response.data;
};

export const updateUairangoSettings = async (settingsData: Record<string, unknown>) => {
  const response = await apiClient.put('/integrations/uairango', settingsData);
  return response.data;
};

export const importUairangoMenu = async () => {
    const response = await apiClient.post('/integrations/uairango/import');
    return response.data;
};

export const confirmUairangoOrder = async (orderId: string) => {
  const response = await apiClient.post('/integrations/uairango/confirm', { orderId });
  return response.data;
};

export const rejectUairangoOrder = async (orderId: string, cancellationCode?: number, reason?: string) => {
  const response = await apiClient.post('/integrations/uairango/reject', { orderId, cancellationCode, reason });
  return response.data;
};

export const markUairangoReady = async (orderId: string) => {
  const response = await apiClient.post('/integrations/uairango/ready', { orderId });
  return response.data;
};

export const startUairangoPreparation = async (orderId: string) => {
  const response = await apiClient.post('/integrations/uairango/start-preparation', { orderId });
  return response.data;
};

export const getUairangoConnectionStatus = async () => {
  const response = await apiClient.get('/integrations/uairango/status');
  return response.data;
};

export const updateUairangoMerchantStatus = async (status: string, operations?: { name: string; status: string; estimatedTime?: number }[]) => {
  const response = await apiClient.put('/integrations/uairango/merchant-status', { status, operations });
  return response.data;
};

export const dispatchUairangoOrder = async (orderId: string) => {
  const response = await apiClient.post('/integrations/uairango/dispatch', { orderId });
  return response.data;
};

export const getUairangoCancellationReasons = async (orderId: string) => {
  const response = await apiClient.get(`/integrations/uairango/cancellation-reasons/${orderId}`);
  return response.data;
};

export const requestUairangoCancellation = async (orderId: string, cancellationCode: number, reason?: string) => {
  const response = await apiClient.post('/integrations/uairango/cancel-order', { orderId, cancellationCode, reason });
  return response.data;
};

export const importSaiposMenu = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/integrations/saipos/import', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const getIfoodSettings = async () => {
  const response = await apiClient.get('/integrations/ifood');
  return response.data;
};

export const updateIfoodSettings = async (settingsData: Record<string, unknown>) => {
  const response = await apiClient.put('/integrations/ifood', settingsData);
  return response.data;
};

export const confirmIfoodOrder = async (orderId: string) => {
  const response = await apiClient.post('/integrations/ifood/confirm', { orderId });
  return response.data;
};

export const rejectIfoodOrder = async (orderId: string, reason?: string, force?: boolean) => {
  const response = await apiClient.post('/integrations/ifood/reject', { orderId, reason, force });
  return response.data;
};

export const startIfoodPreparation = async (orderId: string) => {
  const response = await apiClient.post('/integrations/ifood/start', { orderId });
  return response.data;
};

export const markIfoodReady = async (orderId: string) => {
  const response = await apiClient.post('/integrations/ifood/ready', { orderId });
  return response.data;
};

export const getIfoodConnectionStatus = async () => {
  const response = await apiClient.get('/integrations/ifood/status');
  return response.data;
};

// === IFOOD - Cancelamento (Homologação) ===

export const getIfoodCancellationReasons = async (orderId: string) => {
  const response = await apiClient.get(`/integrations/ifood/cancellation-reasons/${orderId}`);
  return response.data;
};

export const acceptIfoodCancellation = async (orderId: string) => {
  const response = await apiClient.post('/integrations/ifood/accept-cancellation', { orderId });
  return response.data;
};

export const refuseIfoodCancellation = async (orderId: string) => {
  const response = await apiClient.post('/integrations/ifood/refuse-cancellation', { orderId });
  return response.data;
};

export const validateIfoodPickupCode = async (orderId: string, code: string) => {
  const response = await apiClient.post('/integrations/ifood/validate-pickup', { orderId, code });
  return response.data;
};

export const acceptIfoodDispute = async (disputeId: string, orderId: string, reason?: string) => {
  const response = await apiClient.post('/integrations/ifood/accept-dispute', { disputeId, orderId, reason });
  return response.data;
};

export const rejectIfoodDispute = async (disputeId: string, orderId: string, reason?: string) => {
  const response = await apiClient.post('/integrations/ifood/reject-dispute', { disputeId, orderId, reason });
  return response.data;
};

export const offerIfoodAlternative = async (disputeId: string, orderId: string, alternativeType: string, value?: number) => {
  const response = await apiClient.post('/integrations/ifood/alternative-dispute', { disputeId, orderId, alternativeType, value });
  return response.data;
};

export const getFood99Settings = async () => {
  const response = await apiClient.get('/integrations/food99');
  return response.data;
};

export const updateFood99Settings = async (settingsData: Record<string, unknown>) => {
  const response = await apiClient.put('/integrations/food99', settingsData);
  return response.data;
};

export const confirmFood99Order = async (orderId: string) => {
  const response = await apiClient.post('/integrations/food99/confirm', { orderId });
  return response.data;
};

export const rejectFood99Order = async (orderId: string, reason?: string) => {
  const response = await apiClient.post('/integrations/food99/reject', { orderId, reason });
  return response.data;
};

export const markFood99Ready = async (orderId: string) => {
  const response = await apiClient.post('/integrations/food99/ready', { orderId });
  return response.data;
};

export const getFood99ConnectionStatus = async (appShopId?: string) => {
  const params = appShopId ? { app_shop_id: appShopId } : {};
  const response = await apiClient.get('/integrations/food99/status', { params });
  return response.data;
};

export const getFood99AuthorizationUrl = async () => {
  const response = await apiClient.post('/integrations/food99/authorize');
  return response.data;
};

export const listFood99Shops = async (pageNo = 1, pageSize = 30) => {
  const response = await apiClient.get('/integrations/food99/shops', { params: { pageNo, pageSize } });
  return response.data;
};

export const setFood99ShopOnline = async (online: boolean) => {
  const response = await apiClient.post('/integrations/food99/set-online', { online });
  return response.data;
};

export const setFood99ConfirmMethod = async (method: 1 | 2) => {
  const response = await apiClient.post('/integrations/food99/set-confirm-method', { method });
  return response.data;
};

export const getFood99ShopDetail = async () => {
  const response = await apiClient.get('/integrations/food99/shop-detail');
  return response.data;
};

export const syncFood99Menu = async () => {
  const response = await apiClient.post('/integrations/food99/sync-menu');
  return response.data;
};

export const getFood99MenuStatus = async (taskId: string) => {
  const response = await apiClient.get('/integrations/food99/menu-status', { params: { taskId } });
  return response.data;
};

export const getFood99CurrentMenu = async () => {
  const response = await apiClient.get('/integrations/food99/current-menu');
  return response.data;
};

export const updateFood99ItemStatus = async (integrationCode: string, available: boolean) => {
  const response = await apiClient.put('/integrations/food99/item-status', { integrationCode, available });
  return response.data;
};

export const refreshFood99Token = async () => {
  const response = await apiClient.post('/integrations/food99/refresh-token');
  return response.data;
};

export const unbindFood99Shop = async () => {
  const response = await apiClient.post('/integrations/food99/unbind');
  return response.data;
};

export const handleFood99CancelApply = async (orderId: number, applyId: number, agree: boolean, reason?: string) => {
  const response = await apiClient.post('/integrations/food99/cancel-apply', { orderId, applyId, agree, reason });
  return response.data;
};

export const handleFood99RefundApply = async (orderId: number, applyId: number, agree: boolean, reason?: string) => {
  const response = await apiClient.post('/integrations/food99/refund-apply', { orderId, applyId, agree, reason });
  return response.data;
};
