import api from './api';

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  position: string;
  status: 'present' | 'absent' | 'late' | 'on_leave';
  checkInTime?: string;
  checkOutTime?: string;
  location?: string;
  workingHours: number;
  breakTime: number;
}

interface TeamAttendanceOverview {
  totalMembers: number;
  presentMembers: number;
  absentMembers: number;
  lateMembers: number;
  onLeaveMembers: number;
  attendanceRate: number;
  teamMembers: TeamMember[];
}

interface PendingApproval {
  id: string;
  type: 'timesheet' | 'leave' | 'overtime';
  employeeName: string;
  employeeId: string;
  submittedDate: string;
  requestDetails: any;
  priority: 'high' | 'medium' | 'low';
  daysOverdue?: number;
}

interface TeamPerformanceMetrics {
  averageAttendanceRate: number;
  averageWorkingHours: number;
  totalOvertimeHours: number;
  punctualityScore: number;
  leaveUtilization: number;
  productivityTrend: {
    period: string;
    value: number;
  }[];
}

interface TeamAlert {
  id: string;
  type: 'overdue_approval' | 'attendance_issue' | 'policy_violation';
  severity: 'high' | 'medium' | 'low';
  message: string;
  employeeName?: string;
  actionRequired: string;
  createdAt: string;
}

interface TeamCalendarEvent {
  id: string;
  title: string;
  type: 'leave' | 'holiday' | 'meeting' | 'deadline';
  startDate: string;
  endDate: string;
  employeeName?: string;
  description?: string;
}

class ManagerService {
  /**
   * Get team attendance overview with real-time status
   */
  async getTeamAttendanceOverview(): Promise<TeamAttendanceOverview> {
    const response = await api.get('/manager/team/attendance-overview');
    return response.data;
  }

  /**
   * Get pending approval queues
   */
  async getPendingApprovals(): Promise<{
    timesheets: PendingApproval[];
    leaveRequests: PendingApproval[];
    overtimeRequests: PendingApproval[];
    totalPending: number;
  }> {
    const response = await api.get('/manager/approvals/pending');
    return response.data;
  }

  /**
   * Get team performance metrics and trends
   */
  async getTeamPerformanceMetrics(period: '7d' | '30d' | '90d' = '30d'): Promise<TeamPerformanceMetrics> {
    const response = await api.get(`/manager/team/performance?period=${period}`);
    return response.data;
  }

  /**
   * Quick approval actions
   */
  async approveRequest(requestId: string, type: 'timesheet' | 'leave' | 'overtime', comments?: string): Promise<void> {
    await api.post(`/manager/approvals/${type}/${requestId}/approve`, { comments });
  }

  async rejectRequest(requestId: string, type: 'timesheet' | 'leave' | 'overtime', reason: string): Promise<void> {
    await api.post(`/manager/approvals/${type}/${requestId}/reject`, { reason });
  }

  /**
   * Bulk approval actions
   */
  async bulkApprove(requestIds: string[], type: 'timesheet' | 'leave' | 'overtime'): Promise<void> {
    await api.post(`/manager/approvals/${type}/bulk-approve`, { requestIds });
  }

  /**
   * Get team calendar with upcoming leave and events
   */
  async getTeamCalendar(startDate: string, endDate: string): Promise<TeamCalendarEvent[]> {
    const response = await api.get(`/manager/team/calendar?start=${startDate}&end=${endDate}`);
    return response.data;
  }

  /**
   * Get alerts for overdue approvals or attendance issues
   */
  async getTeamAlerts(): Promise<TeamAlert[]> {
    const response = await api.get('/manager/team/alerts');
    return response.data;
  }

  /**
   * Mark alert as resolved
   */
  async resolveAlert(alertId: string): Promise<void> {
    await api.post(`/manager/alerts/${alertId}/resolve`);
  }

  /**
   * Get team reports access
   */
  async getTeamReports(): Promise<{
    attendanceReport: any;
    leaveReport: any;
    performanceReport: any;
    complianceReport: any;
  }> {
    const response = await api.get('/manager/team/reports');
    return response.data;
  }

  /**
   * Generate custom team report
   */
  async generateCustomReport(filters: {
    startDate: string;
    endDate: string;
    reportType: 'attendance' | 'leave' | 'performance' | 'compliance';
    employeeIds?: string[];
    format: 'pdf' | 'excel' | 'csv';
  }): Promise<{ downloadUrl: string }> {
    const response = await api.post('/manager/reports/generate', filters);
    return response.data;
  }

  /**
   * Get team member details
   */
  async getTeamMemberDetails(employeeId: string): Promise<TeamMember & {
    recentActivity: any[];
    performanceMetrics: any;
    leaveBalance: any;
  }> {
    const response = await api.get(`/manager/team/member/${employeeId}`);
    return response.data;
  }

  /**
   * Subscribe to real-time team updates
   */
  subscribeToTeamUpdates(callback: (update: any) => void): () => void {
    // WebSocket or EventSource implementation for real-time updates
    const eventSource = new EventSource(`${api.defaults.baseURL}/manager/team/updates`);
    
    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data);
      callback(update);
    };

    return () => {
      eventSource.close();
    };
  }
}

export const managerService = new ManagerService();
export default managerService;