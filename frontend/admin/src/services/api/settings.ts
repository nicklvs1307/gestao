import apiClient from './client';

export const getSettings = async () => {
  const response = await apiClient.get('/settings');
  return response.data;
};

export const updateSettings = async (settingsData: any) => {
  const response = await apiClient.put('/settings', settingsData);
  return response.data;
};

export const uploadLogo = async (file: File) => {
  const formData = new FormData();
  formData.append('logo', file);
  const response = await apiClient.post('/settings/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const toggleStoreStatus = async (isOpen: boolean) => {
    const response = await apiClient.put('/settings/status', { isOpen });
    return response.data;
};
