import apiClient from './client';

export const getSystemRoles = async () => {
    const response = await apiClient.get('/super-admin/roles');
    return response.data;
};

export const createRole = async (roleData: Record<string, unknown>) => {
    const response = await apiClient.post('/super-admin/roles', roleData);
    return response.data;
};

export const getPermissions = async () => {
    const response = await apiClient.get('/super-admin/permissions');
    return response.data;
};

export const getPermissionsWithModules = async () => {
    const response = await apiClient.get('/super-admin/permissions-with-modules');
    return response.data;
};

export const getFranchises = async () => {
    const response = await apiClient.get('/super-admin/franchises');
    return response.data;
};

export const createFranchise = async (data: Record<string, unknown>) => {
    const response = await apiClient.post('/super-admin/franchises', data);
    return response.data;
};

export const getRestaurantModules = async (restaurantId: string) => {
    const response = await apiClient.get(`/super-admin/restaurants/${restaurantId}/modules`);
    return response.data;
};

export const updateRestaurantModules = async (restaurantId: string, enabledModules: string[]) => {
    const response = await apiClient.put(`/super-admin/restaurants/${restaurantId}/modules`, { enabledModules });
    return response.data;
};

export const syncRestaurantModulesToPlan = async (restaurantId: string) => {
    const response = await apiClient.post(`/super-admin/restaurants/${restaurantId}/modules/sync-plan`);
    return response.data;
};
