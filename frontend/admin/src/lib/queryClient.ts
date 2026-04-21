import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const checklistKeys = {
  all: ['checklists'] as const,
  lists: () => [...checklistKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...checklistKeys.lists(), filters] as const,
  details: () => [...checklistKeys.all, 'detail'] as const,
  detail: (id: string) => [...checklistKeys.details(), id] as const,
  available: () => [...checklistKeys.all, 'available'] as const,
  executions: () => [...checklistKeys.all, 'execution'] as const,
  execution: (filters?: Record<string, unknown>) => [...checklistKeys.executions(), filters] as const,
  stats: () => [...checklistKeys.all, 'stats'] as const,
  sectors: () => [...checklistKeys.all, 'sector'] as const,
  reportSettings: () => [...checklistKeys.all, 'reportSettings'] as const,
  reportLogs: () => [...checklistKeys.all, 'reportLogs'] as const,
} as const;