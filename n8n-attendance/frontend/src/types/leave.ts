// Leave Management Types for Frontend
export interface LeaveType {
  id: string;
  name: string;
  description?: string;
  maxDaysPerYear?: number;
  requiresApproval: boolean;
  requiresDocumentation: boolean;
  advanceNoticeDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewerComments?: string;
  emergencyLeave: boolean;
  halfDay: boolean;
  halfDayPeriod?: 'morning' | 'afternoon';
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequestDocument {
  id: string;
  leaveRequestId: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt: string;
}

export interface LeaveBalance {
  id: string;
  userId: string;
  leaveTypeId: string;
  year: number;
  allocatedDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  carriedForwardDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequestHistory {
  id: string;
  leaveRequestId: string;
  action: string;
  previousStatus?: string;
  newStatus?: string;
  performedBy?: string;
  comments?: string;
  createdAt: string;
}

// Request/Response interfaces
export interface CreateLeaveRequestRequest {
  leaveTypeId: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  reason?: string;
  emergencyLeave?: boolean;
  halfDay?: boolean;
  halfDayPeriod?: 'morning' | 'afternoon';
}

export interface UpdateLeaveRequestRequest {
  startDate?: string;
  endDate?: string;
  reason?: string;
  halfDay?: boolean;
  halfDayPeriod?: 'morning' | 'afternoon';
}

export interface ReviewLeaveRequestRequest {
  status: 'approved' | 'rejected';
  comments?: string;
}

export interface LeaveRequestFilters {
  userId?: string;
  leaveTypeId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  emergencyLeave?: boolean;
  submittedAfter?: string;
  submittedBefore?: string;
  page?: number;
  limit?: number;
}

export interface LeaveBalanceFilters {
  userId?: string;
  leaveTypeId?: string;
  year?: number;
}

export interface PaginatedLeaveResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface LeaveStatistics {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  totalDaysRequested: number;
  totalDaysApproved: number;
  averageRequestDays: number;
  mostRequestedLeaveType: string;
}

export interface UserLeaveOverview {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  balances: LeaveBalanceWithType[]; // Changed from LeaveBalance[] to LeaveBalanceWithType[]
  recentRequests: LeaveRequest[];
  statistics: {
    totalRequestsThisYear: number;
    totalDaysUsedThisYear: number;
    pendingRequests: number;
  };
}

// Additional frontend-specific types
export interface LeaveRequestWithDetails extends LeaveRequest {
  leaveType?: LeaveType;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: string;
    role?: string;
  };
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  documents?: LeaveRequestDocument[];
}

export interface LeaveRequestWithDetails extends LeaveRequest {
  leaveType?: LeaveType;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: string;
    role?: string;
  };
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  documents?: LeaveRequestDocument[];
}

export interface LeaveBalanceWithType extends LeaveBalance {
  leaveType?: LeaveType;
}

// Add delegation interfaces
export interface ApprovalDelegation {
  id: string;
  delegatorId: string;
  delegateId: string;
  delegationType: 'leave_approval' | 'timesheet_approval' | 'all_approvals';
  startDate: string;
  endDate?: string;
  isActive: boolean;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveApprovalStep {
  id: string;
  leaveRequestId: string;
  approverId: string;
  approverRole: 'manager' | 'hr' | 'admin';
  stepOrder: number;
  status: 'pending' | 'approved' | 'rejected' | 'delegated' | 'skipped';
  approvedAt?: string;
  comments?: string;
  isDelegated: boolean;
  delegatedTo?: string;
  delegationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DelegationHistory {
  id: string;
  delegationId: string;
  action: 'created' | 'activated' | 'deactivated' | 'extended' | 'terminated';
  performedBy: string;
  previousEndDate?: string;
  newEndDate?: string;
  reason?: string;
  createdAt: string;
}

export interface CreateDelegationRequest {
  delegateId: string;
  delegationType?: 'leave_approval' | 'timesheet_approval' | 'all_approvals'; // Make optional with default
  startDate: string; // ISO date string
  endDate?: string; // ISO date string
  reason?: string;
}

export interface UpdateDelegationRequest {
  endDate?: string;
  isActive?: boolean;
  reason?: string;
}

export interface DelegationFilters {
  delegatorId?: string;
  delegateId?: string;
  delegationType?: string;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedDelegationResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}