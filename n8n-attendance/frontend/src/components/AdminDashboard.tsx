import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Alert, AlertDescription } from './ui/Alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import { 
  Users, 
  Settings, 
  Shield, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Database,
  Clock,
  UserCheck,
  FileText,
  Calendar,
  Monitor,
  Wifi,
  Server,
  BarChart3,
  UserPlus,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import UserManagement from './UserManagement';
import SystemConfig from './SystemConfig';
import ComplianceDashboard from './ComplianceDashboard';
import { useAuthStore } from '../stores/authStore';
import PermissionGate from './auth/PermissionGate';
import AuditLogs from './AuditLogs';
import adminService, { SystemStats, ActivityItem, SystemAlert } from '../services/adminService';

// Remove duplicate interface definitions - use the ones from adminService
export const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalOffices: 0,
    systemHealth: 'healthy',
    attendanceToday: { checkedIn: 0, total: 0, percentage: 0 },
    pendingApprovals: { timesheets: 0, leaveRequests: 0, userRegistrations: 0 },
    complianceScore: 0,
    recentActivity: [],
    systemAlerts: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState<string | null>(null);
  const [userActivityData, setUserActivityData] = useState<any>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [userRegistrations, setUserRegistrations] = useState<any>(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics') {
      loadAnalyticsData();
    }
  }, [activeTab]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get dashboard statistics from API
      const dashboardStats = await adminService.getDashboardStats();
      setStats(dashboardStats);
      
      // Load additional data for overview
      const [configData, registrationData] = await Promise.all([
        adminService.getSystemConfig(),
        adminService.getUserManagementStats()
      ]);
      
      setSystemConfig(configData);
      setUserRegistrations(registrationData);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard statistics');
      console.error('Dashboard stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      const [activityData, perfMetrics] = await Promise.all([
        adminService.getUserActivityAnalytics('7d'),
        adminService.getPerformanceMetrics('24h')
      ]);
      
      setUserActivityData(activityData);
      setPerformanceMetrics(perfMetrics);
    } catch (err: any) {
      console.error('Analytics data error:', err);
    }
  };

  const getHealthStatusColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info': return 'bg-blue-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getIntegrationStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'disconnected': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <PermissionGate module="admin" roles={['admin']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">System overview and administration</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getHealthStatusColor(stats.systemHealth)}>
              <Activity className="w-3 h-3 mr-1" />
              System {stats.systemHealth}
            </Badge>
          </div>
        </div>

        {error && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* System Alerts */}
        {stats.systemAlerts.length > 0 && (
          <div className="space-y-2">
            {stats.systemAlerts.map((alert) => (
              <Alert key={alert.id} className="border-l-4 border-l-orange-500">
                <AlertTriangle className="h-4 w-4" />
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">{alert.title}</span>
                      <Badge className={getAlertSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </div>
                    <AlertDescription className="mt-1">
                      {alert.message}
                    </AlertDescription>
                  </div>
                  {!alert.resolved && (
                    <Button variant="outline" size="sm">
                      Resolve
                    </Button>
                  )}
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="system">System Config</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                      <p className="text-xs text-green-600">{stats.activeUsers} active</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Attendance Today</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.attendanceToday.percentage}%</p>
                      <p className="text-xs text-gray-600">
                        {stats.attendanceToday.checkedIn}/{stats.attendanceToday.total} checked in
                      </p>
                    </div>
                    <UserCheck className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats.pendingApprovals.timesheets + stats.pendingApprovals.leaveRequests + stats.pendingApprovals.userRegistrations}
                      </p>
                      <p className="text-xs text-orange-600">Requires attention</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Compliance Score</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.complianceScore}%</p>
                      <p className="text-xs text-green-600">Excellent</p>
                    </div>
                    <Shield className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Integration Status */}
            {systemConfig && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Wifi className="h-5 w-5" />
                    <span>Integration Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getIntegrationStatusIcon(systemConfig.integrations?.n8n?.status)}
                        <div>
                          <p className="font-medium">N8N Workflow</p>
                          <p className="text-sm text-gray-600">
                            {systemConfig.integrations?.n8n?.enabled ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                      </div>
                      <Badge className={systemConfig.integrations?.n8n?.status === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {systemConfig.integrations?.n8n?.status || 'Unknown'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getIntegrationStatusIcon(systemConfig.integrations?.payroll?.status)}
                        <div>
                          <p className="font-medium">Payroll System</p>
                          <p className="text-sm text-gray-600">
                            {systemConfig.integrations?.payroll?.enabled ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                      </div>
                      <Badge className={systemConfig.integrations?.payroll?.status === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {systemConfig.integrations?.payroll?.status || 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent User Registrations */}
            {userRegistrations && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <UserPlus className="h-5 w-5" />
                    <span>Recent User Activity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{userRegistrations.recentRegistrations}</p>
                      <p className="text-sm text-gray-600">New Users (7 days)</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">{userRegistrations.pendingRegistrations}</p>
                      <p className="text-sm text-gray-600">Pending Approvals</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{userRegistrations.activeUsers}</p>
                      <p className="text-sm text-gray-600">Active Users</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Role Distribution</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-lg font-semibold">{userRegistrations.roleDistribution?.admin || 0}</p>
                        <p className="text-xs text-gray-600">Admins</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold">{userRegistrations.roleDistribution?.manager || 0}</p>
                        <p className="text-xs text-gray-600">Managers</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold">{userRegistrations.roleDistribution?.employee || 0}</p>
                        <p className="text-xs text-gray-600">Employees</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detailed Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Recent Activity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(activity.severity)}`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Button variant="outline" size="sm" className="w-full">
                      View All Activity
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col items-center justify-center space-y-2"
                      onClick={() => setActiveTab('users')}
                    >
                      <Users className="h-6 w-6" />
                      <span className="text-sm">Manage Users</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col items-center justify-center space-y-2"
                      onClick={() => setActiveTab('system')}
                    >
                      <Settings className="h-6 w-6" />
                      <span className="text-sm">System Config</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col items-center justify-center space-y-2"
                      onClick={() => setActiveTab('compliance')}
                    >
                      <Shield className="h-6 w-6" />
                      <span className="text-sm">Compliance</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="h-20 flex flex-col items-center justify-center space-y-2"
                      onClick={() => setActiveTab('analytics')}
                    >
                      <TrendingUp className="h-6 w-6" />
                      <span className="text-sm">Analytics</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="system">
            <SystemConfig />
          </TabsContent>

          <TabsContent value="compliance">
            <ComplianceDashboard />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* User Activity Analytics */}
            {userActivityData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5" />
                      <span>User Activity Overview</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">{userActivityData.totalLogins}</p>
                          <p className="text-sm text-gray-600">Total Logins (7d)</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">{userActivityData.uniqueUsers}</p>
                          <p className="text-sm text-gray-600">Unique Users</p>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-2">Average Session Duration</p>
                        <p className="text-xl font-bold">{Math.round(userActivityData.averageSessionDuration / 60)} minutes</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Peak Usage Hours</p>
                        <div className="flex flex-wrap gap-2">
                          {userActivityData.peakUsageHours?.map((hour: string, index: number) => (
                            <Badge key={index} variant="outline">{hour}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Monitor className="h-5 w-5" />
                      <span>Device Analytics</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Desktop</span>
                          <span className="font-medium">{userActivityData.deviceBreakdown?.desktop || 0}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${((userActivityData.deviceBreakdown?.desktop || 0) / userActivityData.uniqueUsers) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Mobile</span>
                          <span className="font-medium">{userActivityData.deviceBreakdown?.mobile || 0}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${((userActivityData.deviceBreakdown?.mobile || 0) / userActivityData.uniqueUsers) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Tablet</span>
                          <span className="font-medium">{userActivityData.deviceBreakdown?.tablet || 0}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full" 
                            style={{ width: `${((userActivityData.deviceBreakdown?.tablet || 0) / userActivityData.uniqueUsers) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* System Performance Metrics */}
            {performanceMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Server className="h-5 w-5" />
                    <span>System Performance Metrics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{performanceMetrics.responseTime?.average}ms</p>
                      <p className="text-sm text-gray-600">Avg Response Time</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{performanceMetrics.throughput?.requestsPerSecond}</p>
                      <p className="text-sm text-gray-600">Requests/sec</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">{(performanceMetrics.errorRate * 100).toFixed(2)}%</p>
                      <p className="text-sm text-gray-600">Error Rate</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">{(performanceMetrics.availability * 100).toFixed(1)}%</p>
                      <p className="text-sm text-gray-600">Availability</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* User Growth Trends */}
            {userActivityData?.userGrowth && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>User Growth Trends</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userActivityData.userGrowth.map((period: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{period.period}</p>
                          <p className="text-sm text-gray-600">{period.newUsers} new users</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{period.activeUsers}</p>
                          <p className="text-sm text-gray-600">active users</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGate>
  );
};

export default AdminDashboard;