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
  status?: 'draft' | 'submitted' | 'approved' | 'rejected';
  weekStartDate?: string;
  limit?: number;
  offset?: number;
}

export interface TimesheetListResponse {
  timesheets: Timesheet[];
  total: number;
}

export interface TimesheetFormData {
  weekStartDate: string;
  entries: TimesheetEntryFormData[];
}

export interface TimesheetEntryFormData {
  id?: string;
  date: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  description: string;
  projectCode: string;
}

// Daily Timesheet Types
export interface DailyTimesheet {
  id: string;
  userId: string;
  date: string;
  taskName: string; // Added task name field
  startTime?: string;
  endTime?: string;
  breakDuration: number;
  workHours: number;
  description?: string;
  projectCode?: string;
  locationId?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  managerComments?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyTimesheetFormData {
  date: string;
  taskName: string; // Added task name field
  startTime: string;
  endTime: string;
  breakDuration: number;
  description: string;
  projectCode: string;
}

// Update CreateDailyTimesheetRequest to make required fields non-optional
export interface CreateDailyTimesheetRequest {
  date: string;
  taskName: string;
  startTime: string;  // Make required
  endTime: string;    // Make required
  breakDuration?: number;
  description?: string;
  projectCode?: string;
  locationId?: string;
}

export interface UpdateDailyTimesheetRequest {
  taskName?: string; // Added task name field
  startTime?: string;
  endTime?: string;
  breakDuration?: number;
  description?: string;
  projectCode?: string;
  status?: 'draft' | 'submitted';
}

// New interface for daily summary
export interface DailyTimesheetSummary {
  userId: string;
  date: string;
  totalEntries: number;
  totalHours: number;
  tasks: string;
  earliestStart?: string;
  latestEnd?: string;
  overallStatus: 'draft' | 'submitted' | 'approved' | 'rejected';
}

export interface DailyTimesheetFilters {
  status?: 'draft' | 'submitted' | 'approved' | 'rejected';
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

// Add this interface for the review response
export interface DailyTimesheetWithUser extends DailyTimesheet {
  user?: {
    id: string;
    name: string;
    department?: string;
  };
  creator?: {
    name: string;
  };
}

export interface DailyTimesheetReviewResponse {
  timesheets: DailyTimesheetWithUser[];
  total: number;
  limit: number;
  offset: number;
}

export interface DailyTimesheetListResponse {
  timesheets: DailyTimesheet[];
  total: number;
}

export const TIMESHEET_STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected'
} as const;

export const TIMESHEET_STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
} as const;