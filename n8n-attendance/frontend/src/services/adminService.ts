import api from './api';

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalOffices: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  attendanceToday: {
    checkedIn: number;
    total: number;
    percentage: number;
  };
  pendingApprovals: {
    timesheets: number;
    leaveRequests: number;
    userRegistrations: number;
  };
  complianceScore: number;
  recentActivity: ActivityItem[];
  systemAlerts: SystemAlert[];
}

export interface ActivityItem {
  id: string;
  type: 'user_created' | 'user_updated' | 'system_config' | 'compliance_violation' | 'approval_action';
  description: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error';
  userId?: string;
  userName?: string;
}

export interface SystemAlert {
  id: string;
  type: 'system' | 'security' | 'compliance' | 'performance';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  resolved: boolean;
}

export interface UserManagementStats {
  totalUsers: number;
  activeUsers: number;
  pendingRegistrations: number;
  recentRegistrations: number;
  roleDistribution: {
    admin: number;
    manager: number;
    employee: number;
  };
}

export interface SystemHealthMetrics {
  uptime: number;
  responseTime: number;
  errorRate: number;
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
}

class AdminService {
  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(): Promise<SystemStats> {
    const response = await api.get('/admin/dashboard/stats');
    return response.data;
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth(): Promise<SystemHealthMetrics> {
    const response = await api.get('/admin/system/health');
    return response.data;
  }

  /**
   * Get user management statistics
   */
  async getUserManagementStats(): Promise<UserManagementStats> {
    const response = await api.get('/admin/users/stats');
    return response.data;
  }

  /**
   * Get recent system activity
   */
  async getRecentActivity(limit: number = 10): Promise<ActivityItem[]> {
    const response = await api.get(`/admin/activity/recent?limit=${limit}`);
    return response.data;
  }

  /**
   * Get system alerts
   */
  async getSystemAlerts(includeResolved: boolean = false): Promise<SystemAlert[]> {
    const response = await api.get(`/admin/alerts?includeResolved=${includeResolved}`);
    return response.data;
  }

  /**
   * Resolve a system alert
   */
  async resolveAlert(alertId: string, resolutionNotes?: string): Promise<void> {
    await api.put(`/admin/alerts/${alertId}/resolve`, { resolutionNotes });
  }

  /**
   * Get attendance statistics for today
   */
  async getTodayAttendanceStats(): Promise<{
    checkedIn: number;
    total: number;
    percentage: number;
    lateArrivals: number;
    earlyDepartures: number;
  }> {
    const response = await api.get('/admin/attendance/today');
    return response.data;
  }

  /**
   * Get pending approvals count
   */
  async getPendingApprovalsCount(): Promise<{
    timesheets: number;
    leaveRequests: number;
    userRegistrations: number;
    locationTransfers: number;
  }> {
    const response = await api.get('/admin/approvals/pending/count');
    return response.data;
  }

  /**
   * Get compliance score and metrics
   */
  async getComplianceMetrics(): Promise<{
    overallScore: number;
    attendanceCompliance: number;
    leaveCompliance: number;
    timesheetCompliance: number;
    policyCompliance: number;
    trends: {
      period: string;
      score: number;
    }[];
  }> {
    const response = await api.get('/admin/compliance/metrics');
    return response.data;
  }

  /**
   * Get system performance metrics
   */
  async getPerformanceMetrics(period: '24h' | '7d' | '30d' = '24h'): Promise<{
    responseTime: {
      average: number;
      p95: number;
      p99: number;
    };
    throughput: {
      requestsPerSecond: number;
      peakRps: number;
    };
    errorRate: number;
    availability: number;
    trends: {
      timestamp: string;
      responseTime: number;
      throughput: number;
      errorRate: number;
    }[];
  }> {
    const response = await api.get(`/admin/performance/metrics?period=${period}`);
    return response.data;
  }

  /**
   * Get office and location statistics
   */
  async getOfficeStats(): Promise<{
    totalOffices: number;
    activeOffices: number;
    totalWifiNetworks: number;
    officeUtilization: {
      officeId: string;
      officeName: string;
      currentOccupancy: number;
      maxCapacity: number;
      utilizationRate: number;
    }[];
  }> {
    const response = await api.get('/admin/offices/stats');
    return response.data;
  }

  /**
   * Get user activity analytics
   */
  async getUserActivityAnalytics(period: '24h' | '7d' | '30d' = '7d'): Promise<{
    totalLogins: number;
    uniqueUsers: number;
    averageSessionDuration: number;
    peakUsageHours: string[];
    userGrowth: {
      period: string;
      newUsers: number;
      activeUsers: number;
    }[];
    deviceBreakdown: {
      mobile: number;
      desktop: number;
      tablet: number;
    };
  }> {
    const response = await api.get(`/admin/analytics/users?period=${period}`);
    return response.data;
  }

  /**
   * Export system data
   */
  async exportSystemData(options: {
    dataType: 'users' | 'attendance' | 'timesheets' | 'audit' | 'all';
    format: 'csv' | 'xlsx' | 'json';
    startDate?: string;
    endDate?: string;
    includePersonalData?: boolean;
  }): Promise<Blob> {
    const response = await api.post('/admin/export', options, {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Get system configuration
   */
  async getSystemConfig(): Promise<{
    maintenance: {
      enabled: boolean;
      scheduledAt?: string;
      message?: string;
    };
    features: {
      [key: string]: boolean;
    };
    limits: {
      maxUsers: number;
      maxOffices: number;
      dataRetentionDays: number;
    };
    integrations: {
      n8n: {
        enabled: boolean;
        status: 'connected' | 'disconnected' | 'error';
      };
      payroll: {
        enabled: boolean;
        status: 'connected' | 'disconnected' | 'error';
      };
    };
  }> {
    const response = await api.get('/admin/system/config');
    return response.data;
  }

  /**
   * Update system configuration
   */
  async updateSystemConfig(config: any): Promise<void> {
    await api.put('/admin/system/config', config);
  }

  /**
   * Trigger system maintenance
   */
  async triggerMaintenance(options: {
    duration: number; // in minutes
    message: string;
    notifyUsers: boolean;
  }): Promise<void> {
    await api.post('/admin/system/maintenance', options);
  }

  /**
   * Get audit trail summary
   */
  async getAuditSummary(period: '24h' | '7d' | '30d' = '7d'): Promise<{
    totalEvents: number;
    criticalEvents: number;
    userActions: number;
    systemEvents: number;
    complianceViolations: number;
    topUsers: {
      userId: string;
      userName: string;
      actionCount: number;
    }[];
    eventTypes: {
      type: string;
      count: number;
    }[];
  }> {
    const response = await api.get(`/admin/audit/summary?period=${period}`);
    return response.data;
  }
}

export const adminService = new AdminService();
export default adminService;