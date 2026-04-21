import apiClient from './client';
import type {
  Checklist,
  ChecklistFormData,
  Sector,
  ChecklistExecution,
  ChecklistStats,
  ReportSettings,
  ReportLog,
  TaskResponse,
} from '../../types/checklist';

const handleResponse = <T>(response: { data: T }): T => {
  const result = response.data;
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object' && 'data' in result && Array.isArray((result as { data: unknown }).data)) {
    return (result as { data: T }).data;
  }
  return result;
};

export const getSectors = async (): Promise<Sector[]> => {
  const response = await apiClient.get('/sectors');
  return handleResponse<Sector[]>(response);
};

export const createSector = async (data: { name: string }): Promise<Sector> => {
  const response = await apiClient.post('/sectors', data);
  return response.data;
};

export const updateSector = async (id: string, data: Partial<Sector>): Promise<Sector> => {
  const response = await apiClient.put(`/sectors/${id}`, data);
  return response.data;
};

export const deleteSector = async (id: string): Promise<{ message: string }> => {
  const response = await apiClient.delete(`/sectors/${id}`);
  return response.data;
};

export const getChecklists = async (params?: Record<string, unknown>): Promise<Checklist[]> => {
  const response = await apiClient.get('/checklists', { params });
  return handleResponse<Checklist[]>(response);
};

export const getAvailableChecklists = async (params?: Record<string, unknown>): Promise<Checklist[]> => {
  const response = await apiClient.get('/checklists/available', { params });
  return response.data;
};

export const getChecklistDetail = async (id: string): Promise<Checklist> => {
  const response = await apiClient.get(`/checklists/${id}`);
  return response.data;
};

export const createChecklist = async (data: ChecklistFormData): Promise<Checklist> => {
  const response = await apiClient.post('/checklists', data);
  return response.data;
};

export const updateChecklist = async (id: string, data: Partial<ChecklistFormData>): Promise<Checklist> => {
  const response = await apiClient.put(`/checklists/${id}`, data);
  return response.data;
};

export const deleteChecklist = async (id: string): Promise<{ message: string }> => {
  const response = await apiClient.delete(`/checklists/${id}`);
  return response.data;
};

export const duplicateChecklist = async (id: string): Promise<Checklist> => {
  const original = await getChecklistDetail(id);
  const { id: _, ...data } = original;
  const duplicated: ChecklistFormData = {
    ...(data as ChecklistFormData),
    title: `${original.title} (Cópia)`,
  };
  return createChecklist(duplicated);
};

export const submitChecklistExecution = async (data: {
  checklistId: string;
  userName?: string;
  notes?: string;
  startedAt?: string;
  responses: TaskResponse[];
}): Promise<ChecklistExecution> => {
  const response = await apiClient.post('/checklists/execute', data);
  return response.data;
};

export const getChecklistExecutions = async (params?: Record<string, unknown>): Promise<{
  data: ChecklistExecution[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> => {
  const response = await apiClient.get('/checklists/history', { params });
  return handleResponse<{
    data: ChecklistExecution[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>(response);
};

export const getChecklistStats = async (params?: Record<string, unknown>): Promise<ChecklistStats> => {
  const response = await apiClient.get('/checklists/stats', { params });
  return response.data;
};

export const getChecklistReportSettings = async (): Promise<ReportSettings> => {
  const response = await apiClient.get('/checklists/settings/report');
  return response.data;
};

export const updateChecklistReportSettings = async (data: Partial<ReportSettings>): Promise<ReportSettings> => {
  const response = await apiClient.put('/checklists/settings/report', data);
  return response.data;
};

export const sendManualDailyReport = async (): Promise<{ message: string }> => {
  const response = await apiClient.post('/checklists/reports/daily');
  return response.data;
};

export const sendManualIndividualReport = async (id: string): Promise<{ message: string }> => {
  const response = await apiClient.post(`/checklists/${id}/reports/individual`);
  return response.data;
};

export const getReportLogs = async (params?: Record<string, unknown>): Promise<ReportLog[]> => {
  const response = await apiClient.get('/checklists/settings/report/logs', { params });
  return handleResponse<ReportLog[]>(response);
};
