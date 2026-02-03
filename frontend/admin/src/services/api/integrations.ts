import apiClient from './client';

export const getSaiposSettings = async () => {
  const response = await apiClient.get('/integrations/saipos');
  return response.data;
};

export const updateSaiposSettings = async (settingsData: any) => {
  const response = await apiClient.put('/integrations/saipos', settingsData);
  return response.data;
};
