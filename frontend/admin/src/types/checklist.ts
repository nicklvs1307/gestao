export type TaskType = 'CHECKBOX' | 'PHOTO' | 'TEXT' | 'NUMBER';
export type ProcedureType = 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO';
export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type ExecutionStatus = 'COMPLETED' | 'INCOMPLETE';
export type WeekDay = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface ChecklistTask {
  id: string;
  content: string;
  isRequired: boolean;
  order: number;
  type: TaskType;
  isActive: boolean;
  procedureType: ProcedureType;
  procedureContent?: string;
  days?: WeekDay[];
  checklistId?: string;
}

export interface Checklist {
  id: string;
  title: string;
  description?: string;
  frequency: Frequency;
  deadlineTime?: string;
  days?: WeekDay[];
  isActive: boolean;
  sectorId: string;
  sector?: Sector;
  restaurantId?: string;
  tasks?: ChecklistTask[];
  _count?: {
    tasks: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ChecklistFormData {
  title: string;
  description?: string;
  frequency: Frequency;
  sectorId: string;
  deadlineTime?: string;
  days?: WeekDay[];
  tasks: Omit<ChecklistTask, 'id' | 'checklistId' | 'days'> & { days?: WeekDay[] }[];
  isActive?: boolean;
}

export interface Sector {
  id: string;
  name: string;
  restaurantId?: string;
}

export interface TaskResponse {
  taskId: string;
  value: string | boolean | number;
  isOk?: boolean;
  notes?: string;
}

export interface ChecklistResponse {
  id: string;
  executionId?: string;
  taskId: string;
  task?: ChecklistTask;
  value: string;
  isOk: boolean;
  notes?: string;
  createdAt?: string;
}

export interface ChecklistExecution {
  id: string;
  checklistId: string;
  checklist?: Checklist;
  userId?: string;
  user?: {
    name?: string;
  };
  externalUserName?: string;
  restaurantId?: string;
  status: ExecutionStatus;
  notes?: string;
  responses?: ChecklistResponse[];
  startedAt: string;
  completedAt: string;
  durationSeconds?: number;
}

export interface ChecklistStats {
  totalChecklists: number;
  totalExecutions: number;
  avgConformity: number;
  todayExecutions: number;
}

export interface ReportSettings {
  enabled: boolean;
  recipientPhone?: string;
  recipientPhones?: string[];
  sendTime: string;
  turnStartHour: string;
  reportFormat: 'PDF' | 'TEXT' | 'BOTH' | 'LINK';
  customMessage?: string;
}

export interface ReportLog {
  id: string;
  restaurantId: string;
  type: 'DAILY' | 'INDIVIDUAL' | 'DEADLINE_ALERT' | 'DEADLINE_OK';
  checklistId?: string;
  recipientPhone: string;
  status: 'SUCCESS' | 'FAILED' | 'RETRY';
  errorMessage?: string;
  retryCount: number;
  sentAt: string;
  summary?: string;
}