import apiClient from './client';

export const login = async (credentials: any) => {
  const response = await apiClient.post('/auth/login', credentials);
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
  }
  return response.data;
};

export const getUsers = async () => {
    const response = await apiClient.get('/auth/users');
    return response.data;
};

export const createUser = async (userData: any) => {
    const response = await apiClient.post('/auth/users', userData);
    return response.data;
};

export const updateUser = async (id: string, userData: any) => {
    const response = await apiClient.put(`/auth/users/${id}`, userData);
    return response.data;
};

export const deleteUser = async (id: string) => {
    const response = await apiClient.delete(`/auth/users/${id}`);
    return response.data;
};

export const getDrivers = async () => {
    const response = await apiClient.get('/auth/drivers');
    return response.data;
};
