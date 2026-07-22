// Leave Management Types
export interface LeaveType {
  id: string;
  name: string;
  description?: string;
  maxDaysPerYear?: number;
  requiresApproval: boolean;
  requiresDocumentation: boolean;
  advanceNoticeDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewerComments?: string;
  emergencyLeave: boolean;
  halfDay: boolean;
  halfDayPeriod?: 'morning' | 'afternoon';
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveRequestDocument {
  id: string;
  leaveRequestId: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveBalanceWithType extends LeaveBalance {
  leaveType?: LeaveType;
}

export interface LeaveRequestHistory {
  id: string;
  leaveRequestId: string;
  action: string;
  previousStatus?: string;
  newStatus?: string;
  performedBy?: string;
  comments?: string;
  createdAt: Date;
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

// Add delegation interfaces
export interface ApprovalDelegation {
  id: string;
  delegatorId: string;
  delegateId: string;
  delegationType: 'leave_approval' | 'timesheet_approval' | 'all_approvals';
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveApprovalStep {
  id: string;
  leaveRequestId: string;
  approverId: string;
  approverRole: 'manager' | 'hr' | 'admin';
  stepOrder: number;
  status: 'pending' | 'approved' | 'rejected' | 'delegated' | 'skipped';
  approvedAt?: Date;
  comments?: string;
  isDelegated: boolean;
  delegatedTo?: string;
  delegationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DelegationHistory {
  id: string;
  delegationId: string;
  action: 'created' | 'activated' | 'deactivated' | 'extended' | 'terminated' | 'updated';
  performedBy: string;
  previousEndDate?: Date;
  newEndDate?: Date;
  reason?: string;
  createdAt: Date;
}

// Request/Response interfaces for delegation
export interface CreateDelegationRequest {
  delegateId: string;
  delegationType: 'leave_approval' | 'timesheet_approval' | 'all_approvals';
  startDate: string; // ISO date string
  endDate?: string; // ISO date string
  reason?: string;
}

export interface UpdateDelegationRequest {
  delegateId?: string;
  startDate?: string;
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

// Enhanced review request to support delegation
export interface ReviewLeaveRequestRequest {
  status: 'approved' | 'rejected';
  comments?: string;
  delegatedBy?: string; // If this approval is being done by a delegate
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

// Add missing pagination interface for delegations
export interface PaginatedDelegationResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
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
  balances: LeaveBalanceWithType[]; // Changed from LeaveBalance[]
  recentRequests: LeaveRequest[];
  statistics: {
    totalRequestsThisYear: number;
    totalDaysUsedThisYear: number;
    pendingRequests: number;
  };
}