export interface Timesheet {
  id: string;
  userId: string;
  managerId: string;
  weekStartDate: string;
  weekEndDate: string;
  totalHours: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  managerComments?: string;
  createdAt: string;
  updatedAt: string;
  entries?: TimesheetEntry[];
}

export interface TimesheetEntry {
  id: string;
  timesheetId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  breakDuration: number;
  workHours: number;
  description?: string;
  projectCode?: string;
  locationId?: string;
  isAutoPopulated: boolean;
  attendanceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTimesheetRequest {
  weekStartDate: string;
  entries?: Partial<TimesheetEntry>[];
}

export interface UpdateTimesheetRequest {
  entries?: Partial<TimesheetEntry>[];
  status?: 'draft' | 'submitted';
}

export interface TimesheetFilters {
  userId?: string;
  managerId?: string;
  status?: string;
  weekStartDate?: string;
  limit?: number;
  offset?: number;
}

export interface TimesheetListResponse {
  timesheets: Timesheet[];
  total: number;
}

export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';