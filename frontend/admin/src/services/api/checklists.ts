import apiClient from './client';

export const getSectors = async () => {
    const response = await apiClient.get('/sectors');
    return response.data;
};

export const createSector = async (data: Record<string, unknown>) => {
    const response = await apiClient.post('/sectors', data);
    return response.data;
};

export const updateSector = async (id: string, data: Record<string, unknown>) => {
    const response = await apiClient.put(`/sectors/${id}`, data);
    return response.data;
};

export const deleteSector = async (id: string) => {
    const response = await apiClient.delete(`/sectors/${id}`);
    return response.data;
};

export const getChecklists = async () => {
    const response = await apiClient.get('/checklists');
    // response.data is { data: [...], total: N }
    const result = response.data;
    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.data)) return result.data;
    return [];
};

export const createChecklist = async (data: Record<string, unknown>) => {
    const response = await apiClient.post('/checklists', data);
    return response.data;
};

export const updateChecklist = async (id: string, data: Record<string, unknown>) => {
    const response = await apiClient.put(`/checklists/${id}`, data);
    return response.data;
};

export const deleteChecklist = async (id: string) => {
    const response = await apiClient.delete(`/checklists/${id}`);
    return response.data;
};

export const submitChecklistExecution = async (data: Record<string, unknown>) => {
    const response = await apiClient.post('/checklists/execute', data);
    return response.data;
};

export const getChecklistExecutions = async (params?: Record<string, unknown>) => {
    const response = await apiClient.get('/checklists/history', { params });
    const result = response.data;
    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.data)) return result.data;
    return [];
};

export const getChecklistStats = async (params?: Record<string, unknown>) => {
    const response = await apiClient.get('/checklists/stats', { params });
    return response.data;
};
export const getChecklistReportSettings = async () => {
    const response = await apiClient.get('/checklists/settings/report');
    return response.data;
};

export const updateChecklistReportSettings = async (data: Record<string, unknown>) => {
    const response = await apiClient.put('/checklists/settings/report', data);
    return response.data;
};

export const sendManualDailyReport = async () => {
    const response = await apiClient.post('/checklists/reports/daily');
    return response.data;
};

export const sendManualIndividualReport = async (id: string) => {
    const response = await apiClient.post(`/checklists/${id}/reports/individual`);
    return response.data;
};

export const getReportLogs = async (params?: Record<string, unknown>) => {
    const response = await apiClient.get('/checklists/settings/report/logs', { params });
    return response.data;
};
