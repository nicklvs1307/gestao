import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checklistKeys } from '../lib/queryClient';
import * as api from '../services/api/checklists';

export const useChecklists = (params?: Record<string, unknown>) => {
  return useQuery({
    queryKey: checklistKeys.list(params),
    queryFn: () => api.getChecklists(params),
    staleTime: 1000 * 60 * 2,
  });
};

export const useAvailableChecklists = (params?: Record<string, unknown>) => {
  return useQuery({
    queryKey: checklistKeys.available(),
    queryFn: () => api.getAvailableChecklists(params),
    enabled: false,
  });
};

export const useChecklistDetail = (id: string) => {
  return useQuery({
    queryKey: checklistKeys.detail(id),
    queryFn: () => api.getChecklistDetail(id),
    enabled: !!id,
  });
};

export const useCreateChecklist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createChecklist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.all });
    },
  });
};

export const useUpdateChecklist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.updateChecklist(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.all });
      queryClient.invalidateQueries({ queryKey: checklistKeys.detail(id) });
    },
  });
};

export const useDeleteChecklist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteChecklist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.all });
    },
  });
};

export const useChecklistExecutions = (params?: Record<string, unknown>) => {
  return useQuery({
    queryKey: checklistKeys.execution(params),
    queryFn: () => api.getChecklistExecutions(params),
    staleTime: 1000 * 60,
  });
};

export const useChecklistStats = (params?: Record<string, unknown>) => {
  return useQuery({
    queryKey: checklistKeys.stats(),
    queryFn: () => api.getChecklistStats(params),
    staleTime: 1000 * 60 * 5,
  });
};

export const useSectors = () => {
  return useQuery({
    queryKey: checklistKeys.sectors(),
    queryFn: api.getSectors,
    staleTime: 1000 * 60 * 10,
  });
};

export const useCreateSector = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createSector,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.sectors() });
    },
  });
};

export const useDeleteSector = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteSector,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.sectors() });
      queryClient.invalidateQueries({ queryKey: checklistKeys.all });
    },
  });
};

export const useChecklistReportSettings = () => {
  return useQuery({
    queryKey: checklistKeys.reportSettings(),
    queryFn: api.getChecklistReportSettings,
    staleTime: 1000 * 60 * 10,
  });
};

export const useUpdateChecklistReportSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateChecklistReportSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.reportSettings() });
    },
  });
};

export const useSendManualDailyReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.sendManualDailyReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.reportLogs() });
    },
  });
};

export const useSendManualIndividualReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.sendManualIndividualReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.reportLogs() });
    },
  });
};