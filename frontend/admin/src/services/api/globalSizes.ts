import apiClient from './client';

export interface GlobalSize {
    id?: string;
    name: string;
    description?: string;
}

export const globalSizeService = {
    getAll: async () => {
        const response = await apiClient.get<GlobalSize[]>('/global-sizes');
        return response.data;
    },
    create: async (data: GlobalSize) => {
        const response = await apiClient.post<GlobalSize>('/global-sizes', data);
        return response.data;
    },
    update: async (id: string, data: GlobalSize) => {
        const response = await apiClient.put<GlobalSize>(`/global-sizes/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        await apiClient.delete(`/global-sizes/${id}`);
    }
};
