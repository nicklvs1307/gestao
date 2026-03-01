import apiClient from './client';

export const getSaiposSettings = async () => {
  const response = await apiClient.get('/integrations/saipos');
  return response.data;
};

export const updateSaiposSettings = async (settingsData: any) => {
  const response = await apiClient.put('/integrations/saipos', settingsData);
  return response.data;
};

export const getUairangoSettings = async () => {
  const response = await apiClient.get('/integrations/uairango');
  return response.data;
};

export const updateUairangoSettings = async (settingsData: any) => {
  const response = await apiClient.put('/integrations/uairango', settingsData);
  return response.data;
};

export const importUairangoMenu = async () => {
    const response = await apiClient.post('/integrations/uairango/import');
    return response.data;
};
