import api from './api';
import {
  LeaveType,
  LeaveRequest,
  LeaveBalance,
  CreateLeaveRequestRequest,
  UpdateLeaveRequestRequest,
  ReviewLeaveRequestRequest,
  LeaveRequestFilters,
  LeaveBalanceFilters,
  PaginatedLeaveResponse,
  LeaveStatistics,
  UserLeaveOverview,
  LeaveRequestWithDetails,
  LeaveBalanceWithType,
  LeaveRequestHistory
} from '../types/leave';

class LeaveService {
  // Leave Types Management
  async getLeaveTypes(): Promise<LeaveType[]> {
    const response = await api.get('/leave/types');
    return response.data.data; // Extract the actual array from response.data.data
  }

  async createLeaveType(data: Omit<LeaveType, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveType> {
    const response = await api.post('/leave/types', data);
    return response.data;
  }

  async updateLeaveType(id: string, data: Partial<Omit<LeaveType, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeaveType> {
    const response = await api.put(`/leave/types/${id}`, data);
    return response.data;
  }

  async deleteLeaveType(id: string): Promise<void> {
    await api.delete(`/leave/types/${id}`);
  }

  // Leave Requests Management
  async submitLeaveRequest(data: CreateLeaveRequestRequest): Promise<LeaveRequest> {
    const response = await api.post('/leave/requests', data);
    return response.data;
  }

  async getLeaveRequests(filters: LeaveRequestFilters = {}): Promise<PaginatedLeaveResponse<LeaveRequestWithDetails>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    const response = await api.get(`/leave/requests?${queryParams}`);
    return response.data;
  }

  async getLeaveRequest(id: string): Promise<LeaveRequestWithDetails> {
    const response = await api.get(`/leave/requests/${id}`);
    return response.data;
  }

  async updateLeaveRequest(id: string, data: UpdateLeaveRequestRequest): Promise<LeaveRequest> {
    const response = await api.put(`/leave/requests/${id}`, data);
    return response.data;
  }

  async cancelLeaveRequest(id: string): Promise<LeaveRequest> {
    const response = await api.delete(`/leave/requests/${id}`);
    return response.data;
  }

  async reviewLeaveRequest(id: string, data: ReviewLeaveRequestRequest): Promise<LeaveRequest> {
    const response = await api.put(`/leave/requests/${id}/review`, data);
    return response.data;
  }

  // Leave Balances
  async getLeaveBalances(filters: LeaveBalanceFilters = {}): Promise<LeaveBalanceWithType[]> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    const response = await api.get(`/leave/balances?${queryParams}`);
    return response.data;
  }

  async getUserLeaveBalance(userId: string, year?: number): Promise<LeaveBalanceWithType[]> {
    const queryParams = new URLSearchParams();
    if (year) queryParams.append('year', year.toString());
    
    const response = await api.get(`/leave/balances/user/${userId}?${queryParams}`);
    return response.data;
  }

  async updateLeaveBalance(id: string, data: { allocatedDays: number }): Promise<LeaveBalance> {
    const response = await api.put(`/leave/balances/${id}`, data);
    return response.data;
  }

  // Analytics and Reports
  async getLeaveStatistics(filters: {
    startDate?: string;
    endDate?: string;
    leaveTypeId?: string;
    userId?: string;
  } = {}): Promise<LeaveStatistics> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    const response = await api.get(`/leave/statistics?${queryParams}`);
    return response.data.data;
  }

  async getUserLeaveOverview(userId: string): Promise<UserLeaveOverview> {
    const response = await api.get(`/leave/overview/${userId}`);
    return response.data.data;
  }

  async getTeamLeaveOverview(): Promise<UserLeaveOverview[]> {
    const response = await api.get('/leave/overview/team');
    return response.data;
  }

  // Add method for current user's overview
  async getMyLeaveOverview(): Promise<UserLeaveOverview> {
    const response = await api.get('/leave/my-overview');
    return response.data.data;
  }

  // Document Management
  async uploadLeaveDocument(leaveRequestId: string, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('document', file);
    
    await api.post(`/leave/requests/${leaveRequestId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async deleteLeaveDocument(leaveRequestId: string, documentId: string): Promise<void> {
    await api.delete(`/leave/requests/${leaveRequestId}/documents/${documentId}`);
  }

  // Utility methods
  async calculateLeaveDays(startDate: string, endDate: string, halfDay: boolean = false): Promise<{ totalDays: number }> {
    const response = await api.post('/leave/calculate-days', {
      startDate,
      endDate,
      halfDay
    });
    return response.data;
  }

  async checkLeaveEligibility(leaveTypeId: string, startDate: string, endDate: string): Promise<{
    eligible: boolean;
    reason?: string;
    availableDays: number;
  }> {
    const response = await api.post('/leave/check-eligibility', {
      leaveTypeId,
      startDate,
      endDate
    });
    return response.data;
  }

  // Leave Request History and Audit Trail
  async getLeaveRequestHistory(leaveRequestId: string): Promise<LeaveRequestHistory[]> {
    const response = await api.get(`/leave/requests/${leaveRequestId}/history`);
    return response.data.data;
  }

  async getUserLeaveHistory(userId: string, filters: {
    startDate?: string;
    endDate?: string;
    action?: string;
  } = {}): Promise<LeaveRequestHistory[]> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    const response = await api.get(`/leave/history/user/${userId}?${queryParams}`);
    return response.data.data;
  }

  async getMyLeaveHistory(filters: {
    startDate?: string;
    endDate?: string;
    action?: string;
  } = {}): Promise<LeaveRequestHistory[]> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    const response = await api.get(`/leave/history/my?${queryParams}`);
    return response.data.data;
  }

  async getAuditTrail(filters: {
    userId?: string;
    performedBy?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<PaginatedLeaveResponse<LeaveRequestHistory & { leaveRequest?: LeaveRequest }>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    const response = await api.get(`/leave/audit-trail?${queryParams}`);
    return response.data;
  }
}

export const leaveService = new LeaveService();
export default leaveService;