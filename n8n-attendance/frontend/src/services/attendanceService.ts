import api from './api';
import {
  CheckInRequest,
  CheckOutRequest,
  AttendanceStatus,
  AttendanceHistoryParams,
  AttendanceHistoryResponse,
  Attendance,
  OvertimeStatus,
  OvertimeHistoryResponse,
  OvertimeStats
} from '../types/attendance';

// Remove the custom axios instance and API_BASE_URL
// Remove the custom api.interceptors.request.use block

export interface ManualOverrideRequest {
  reason: string;
  auto_failure_reason?: string;
  location?: string;
  notes?: string;
}

class AttendanceService {
  // Check in
  async checkIn(data: CheckInRequest): Promise<Attendance> {
    try {
      const response = await api.post('/attendance/checkin', data);
      return response.data;
    } catch (error: any) {
      // Handle leave blocking errors with user-friendly messages
      if (error.response?.status === 400 && error.response?.data?.details?.leaveType) {
        const details = error.response.data.details;
        throw new Error(`Cannot check in: ${details.message}`);
      }
      throw error;
    }
  }

  // Check out
  async checkOut(data: CheckOutRequest): Promise<Attendance> {
    try {
      const response = await api.post('/attendance/checkout', data);
      return response.data;
    } catch (error: any) {
      // Handle leave blocking errors with user-friendly messages
      if (error.response?.status === 400 && error.response?.data?.details?.leaveType) {
        const details = error.response.data.details;
        throw new Error(`Cannot check out: ${details.message}`);
      }
      throw error;
    }
  }

  // Get current attendance status
  async getStatus(): Promise<AttendanceStatus> {
    const response = await api.get('/attendance/status');
    return response.data;
  }

  // Get attendance history
  async getHistory(params: AttendanceHistoryParams = {}): Promise<AttendanceHistoryResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.startDate) queryParams.append('start_date', params.startDate);
    if (params.endDate) queryParams.append('end_date', params.endDate);
    if (params.status_filter) queryParams.append('status_filter', params.status_filter);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());
    
    const response = await api.get(`/attendance/history?${queryParams}`);
    return response.data;
  }

  // Manual override
  async manualOverride(data: ManualOverrideRequest): Promise<void> {
    const response = await api.post('/attendance/manual-override', data);
    return response.data;
  }

  // Get override stats
  async getOverrideStats(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await api.get(`/attendance/override-stats?${params}`);
    return response.data;
  }

  // Get current overtime status
  async getCurrentOvertimeStatus(): Promise<OvertimeStatus> {
    const response = await api.get('/attendance/overtime/current');
    return response.data;
  }

  // Get overtime history
  async getOvertimeHistory(params: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<OvertimeHistoryResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.startDate) queryParams.append('start_date', params.startDate);
    if (params.endDate) queryParams.append('end_date', params.endDate);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());
    
    const response = await api.get(`/attendance/overtime/history?${queryParams}`);
    return response.data;
  }

  // Get overtime statistics
  async getOvertimeStats(params: {
    startDate?: string;
    endDate?: string;
    userId?: string;
  } = {}): Promise<OvertimeStats> {
    const queryParams = new URLSearchParams();
    
    if (params.startDate) queryParams.append('start_date', params.startDate);
    if (params.endDate) queryParams.append('end_date', params.endDate);
    if (params.userId) queryParams.append('user_id', params.userId);
    
    const response = await api.get(`/attendance/overtime/stats?${queryParams}`);
    return response.data;
  }

  // Add the missing clockOut method
  async clockOut(data: CheckOutRequest): Promise<Attendance> {
    return this.checkOut(data);
  }
}

// Export single instance
export const attendanceService = new AttendanceService();