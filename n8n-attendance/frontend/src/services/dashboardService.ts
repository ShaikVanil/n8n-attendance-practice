import api from './api';

export interface DashboardStats {
  todayHours: string;
  breakTime: string;
  weeklyHours: string;
  monthlyHours: string;
  attendanceRate: number;
  leaveBalance: {
    annual: number;
    sick: number;
    personal: number;
  };
}

export interface RecentActivity {
  id: string;
  type: 'timesheet' | 'leave_request' | 'attendance';
  title: string;
  date: string;
  status: string;
}

export interface UpcomingEvent {
  id: string;
  type: 'leave' | 'meeting' | 'deadline';
  title: string;
  date: string;
  description?: string;
}

export interface DashboardNotification {
  id: string;
  type: 'approval' | 'reminder' | 'alert' | 'info';
  title: string;
  message: string;
  createdAt: string;
  isRead?: boolean;
  actionUrl?: string;
}

export interface AttendanceTrends {
  weeklyTrend: {
    week: string;
    hours: number;
    attendanceRate: number;
  }[];
  monthlyComparison: {
    thisMonth: number;
    lastMonth: number;
    change: number;
  };
  punctualityScore: number;
}

export interface TodayWorkSummary {
  clockInTime?: string;
  clockOutTime?: string;
  totalHours: string;
  breakTime: string;
  status: 'clocked_in' | 'clocked_out' | 'on_break';
  location?: string;
  isLate?: boolean;
  expectedClockIn?: string;
}

export interface QuickAccessData {
  pendingTimesheets: number;
  pendingLeaveRequests: number;
  upcomingLeave: number;
  recentTimesheets: RecentActivity[];
  recentLeaveRequests: RecentActivity[];
}

class DashboardService {
  /**
   * Get employee dashboard statistics
   */
  async getEmployeeStats(): Promise<DashboardStats> {
    const response = await api.get('/dashboard/employee/stats');
    return response.data;
  }

  /**
   * Get recent activity for employee
   */
  async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
    const response = await api.get(`/dashboard/employee/activity?limit=${limit}`);
    return response.data;
  }

  /**
   * Get upcoming events for employee
   */
  async getUpcomingEvents(limit: number = 5): Promise<UpcomingEvent[]> {
    const response = await api.get(`/dashboard/employee/events?limit=${limit}`);
    return response.data;
  }

  /**
   * Get unread notifications for employee
   */
  async getUnreadNotifications(limit: number = 10): Promise<DashboardNotification[]> {
    const response = await api.get(`/dashboard/employee/notifications?limit=${limit}&unread=true`);
    return response.data;
  }

  /**
   * Get attendance trends and analytics
   */
  async getAttendanceTrends(period: 'week' | 'month' | 'quarter' = 'month'): Promise<AttendanceTrends> {
    const response = await api.get(`/dashboard/employee/trends?period=${period}`);
    return response.data;
  }

  /**
   * Get today's work summary with real-time updates
   */
  async getTodayWorkSummary(): Promise<TodayWorkSummary> {
    const response = await api.get('/dashboard/employee/today');
    return response.data;
  }

  /**
   * Get quick access links and counts
   */
  async getQuickAccessData(): Promise<QuickAccessData> {
    const response = await api.get('/dashboard/employee/quick-access');
    return response.data;
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    await api.patch(`/notifications/${notificationId}/read`);
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(): Promise<void> {
    await api.patch('/notifications/mark-all-read');
  }

  /**
   * Get leave balance details
   */
  async getLeaveBalance(): Promise<{
    annual: { used: number; remaining: number; total: number };
    sick: { used: number; remaining: number; total: number };
    personal: { used: number; remaining: number; total: number };
    carryOver: number;
  }> {
    const response = await api.get('/dashboard/employee/leave-balance');
    return response.data;
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    attendanceRate: number;
    punctualityScore: number;
    overtimeHours: number;
    averageWorkingHours: number;
    complianceScore: number;
  }> {
    const response = await api.get('/dashboard/employee/performance');
    return response.data;
  }

  /**
   * Subscribe to real-time dashboard updates
   */
  subscribeToUpdates(callback: (data: any) => void): () => void {
    // WebSocket connection for real-time updates
    const ws = new WebSocket(`${process.env.REACT_APP_WS_URL || 'ws://localhost:3001'}/dashboard/employee/updates`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callback(data);
    };

    ws.onerror = (error) => {
      console.error('Dashboard WebSocket error:', error);
    };

    // Return cleanup function
    return () => {
      ws.close();
    };
  }
}

export const dashboardService = new DashboardService();