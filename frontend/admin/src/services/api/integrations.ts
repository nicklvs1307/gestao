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

export const rejectUairangoOrder = async (orderId: string, reason?: string) => {
  const response = await apiClient.post('/integrations/uairango/reject', { orderId, reason });
  return response.data;
};

export const markUairangoReady = async (orderId: string) => {
  const response = await apiClient.post('/integrations/uairango/ready', { orderId });
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

export const rejectIfoodOrder = async (orderId: string, reason?: string) => {
  const response = await apiClient.post('/integrations/ifood/reject', { orderId, reason });
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
