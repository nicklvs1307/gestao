import apiClient from './client';

export const getRoles = async () => {
    const response = await apiClient.get('/super-admin/roles');
    return response.data;
};

export const createRole = async (roleData: any) => {
    const response = await apiClient.post('/super-admin/roles', roleData);
    return response.data;
};

export const getPermissions = async () => {
    const response = await apiClient.get('/super-admin/permissions');
    return response.data;
};

export const getFranchises = async () => {
    const response = await apiClient.get('/super-admin/franchises');
    return response.data;
};

export const createFranchise = async (data: any) => {
    const response = await apiClient.post('/super-admin/franchises', data);
    return response.data;
};
