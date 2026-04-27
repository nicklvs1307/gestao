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

export const initiateIfoodLink = async () => {
  const response = await apiClient.post('/integrations/ifood/initiate-link');
  return response.data;
};

export const completeIfoodLink = async (authorizationCode: string) => {
  const response = await apiClient.post('/integrations/ifood/complete-link', { authorizationCode });
  return response.data;
};

export const disconnectIfood = async () => {
  const response = await apiClient.post('/integrations/ifood/disconnect');
  return response.data;
};
