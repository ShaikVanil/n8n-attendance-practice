import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import ManagerLocationTransferApproval from './ManagerLocationTransferApproval';
import ManagerLeaveApproval from './ManagerLeaveApproval';
import ManagerGracePeriodApproval from './ManagerGracePeriodApproval';
import TeamLeaveCalendar from './TeamLeaveCalendar';
import { locationService } from '../services/locationService';
import { managerService } from '../services/managerService';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
// Add clock-in functionality imports
import { useSmartClockIn } from '../hooks/useSmartClockIn';
import { useAttendanceStore } from '../stores/attendanceStore';
import { attendanceService } from '../services/attendanceService';

interface DashboardStats {
  pendingLocationTransfers: number;
  pendingLeaveRequests: number;
  pendingGracePeriodRequests: number;
  pendingTimesheets: number;
  teamMembersPresent: number;
  totalTeamMembers: number;
  attendanceRate: number;
  overdueApprovals: number;
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  status: 'present' | 'absent' | 'late' | 'on_leave';
  checkInTime?: string;
  location?: string;
  workingHours: number;
}

export const ManagerDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  // Add clock-in functionality
const { status, wifiResult, userLocation, isLoading: smartClockInLoading, error: smartClockInError, performSmartClockIn } = useSmartClockIn();
const { status: attendanceStatus, fetchStatus } = useAttendanceStore();
const [clockInLoading, setClockInLoading] = useState(false);

  
  const [stats, setStats] = useState<DashboardStats>({
    pendingLocationTransfers: 0,
    pendingLeaveRequests: 0,
    pendingGracePeriodRequests: 0,
    pendingTimesheets: 0,
    teamMembersPresent: 0,
    totalTeamMembers: 0,
    attendanceRate: 0,
    overdueApprovals: 0
  });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Add clock-in handlers
  const handleClockIn = async () => {
  try {
    setClockInLoading(true);
    
    // Use the smart clock-in functionality if available
    if (status?.canAutoClockIn) {
      await performSmartClockIn();
    } else {
      // Manual clock-in with required data
      const checkInData = {
        checkInType: 'manual' as const,
        notes: 'Manager manual clock-in',
        location: userLocation ? undefined : 'office', // Use detected location or default
        latitude: userLocation?.latitude,
        longitude: userLocation?.longitude
      };
      await attendanceService.checkIn(checkInData);
    }
    
    // Refresh data after clock-in
    await fetchStatus(true);
    loadDashboardData();
  } catch (error) {
    console.error('Clock-in failed:', error);
  } finally {
    setClockInLoading(false);
  }
};

  const handleClockOut = async () => {
  try {
    setClockInLoading(true);
    
    // Manual clock-out with required data
    const checkOutData = {
      checkOutType: 'manual' as const,
      notes: 'Manager manual clock-out',
      latitude: userLocation?.latitude,
      longitude: userLocation?.longitude
    };
    await attendanceService.checkOut(checkOutData);
    
    // Refresh data after clock-out
    await fetchStatus(true);
    loadDashboardData();
  } catch (error) {
    console.error('Clock-out failed:', error);
  } finally {
    setClockInLoading(false);
  }
};

  // WiFi and location status for clock-in
  const wifiStatus = {
  connected: wifiResult?.isConnected || false,
  networkName: wifiResult?.currentNetwork?.ssid || 'Unknown'
};

const locationStatus = {
  inOffice: status?.locationStatus?.isValid || false,
  distance: status?.locationStatus?.distance || 0,
  available: !!userLocation // Add the missing available property
};

const clockInStatus = attendanceStatus?.is_checked_in ? 'clocked_in' : 'clocked_out';
const isConnected = status?.canAutoClockIn || false;

  useEffect(() => {
    loadDashboardData();
    
    // Subscribe to real-time updates
    const unsubscribe = managerService.subscribeToTeamUpdates((update) => {
      if (update.type === 'attendance_change') {
        loadTeamAttendance();
      } else if (update.type === 'new_approval') {
        loadPendingApprovals();
      }
    });

    return unsubscribe;
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadTeamAttendance(),
        loadPendingApprovals(),
        loadTeamAlerts(),
        loadPerformanceMetrics()
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamAttendance = async () => {
    try {
      const attendanceData = await managerService.getTeamAttendanceOverview();
      setTeamMembers(attendanceData.teamMembers);
      setStats(prev => ({
        ...prev,
        teamMembersPresent: attendanceData.presentMembers,
        totalTeamMembers: attendanceData.totalMembers,
        attendanceRate: attendanceData.attendanceRate
      }));
    } catch (error) {
      console.error('Failed to load team attendance:', error);
    }
  };

  const loadPendingApprovals = async () => {
    try {
      const [pendingTransfers, pendingApprovals] = await Promise.all([
        locationService.getPendingLocationTransfers(),
        managerService.getPendingApprovals()
      ]);
      
      setStats(prev => ({
        ...prev,
        pendingLocationTransfers: pendingTransfers.length,
        pendingLeaveRequests: pendingApprovals.leaveRequests.length,
        pendingTimesheets: pendingApprovals.timesheets.length,
        overdueApprovals: pendingApprovals.timesheets.filter(t => t.daysOverdue && t.daysOverdue > 0).length +
                         pendingApprovals.leaveRequests.filter(l => l.daysOverdue && l.daysOverdue > 0).length
      }));
    } catch (error) {
      console.error('Failed to load pending approvals:', error);
    }
  };

  const loadTeamAlerts = async () => {
    try {
      const alertsData = await managerService.getTeamAlerts();
      setAlerts(alertsData);
    } catch (error) {
      console.error('Failed to load team alerts:', error);
    }
  };

  const loadPerformanceMetrics = async () => {
    try {
      const metrics = await managerService.getTeamPerformanceMetrics();
      setPerformanceMetrics(metrics);
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
    }
  };

  const handleQuickApproval = async (requestId: string, type: 'timesheet' | 'leave' | 'overtime', action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await managerService.approveRequest(requestId, type);
      } else {
        await managerService.rejectRequest(requestId, type, 'Quick rejection from dashboard');
      }
      await loadPendingApprovals();
    } catch (error) {
      console.error('Failed to process approval:', error);
    }
  };

  const handleTransferProcessed = () => {
    loadDashboardData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-600 bg-green-100';
      case 'late': return 'text-orange-600 bg-orange-100';
      case 'absent': return 'text-red-600 bg-red-100';
      case 'on_leave': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', count: null },
    { id: 'team-attendance', label: 'Team Attendance', count: null },
    { id: 'approvals', label: 'Pending Approvals', count: stats.pendingLeaveRequests + stats.pendingTimesheets },
    { id: 'performance', label: 'Team Performance', count: null },
    { id: 'transfers', label: 'Location Transfers', count: stats.pendingLocationTransfers },
    { id: 'leave', label: 'Leave Requests', count: stats.pendingLeaveRequests },
    { id: 'grace-period', label: 'Grace Period', count: stats.pendingGracePeriodRequests },
    { id: 'team-calendar', label: 'Team Calendar', count: null }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Manager Dashboard
        </h1>
        <p className="text-gray-600">
          Welcome back, {user?.firstName}. Manage your team's requests and view attendance overview.
        </p>
        
        {/* Add Manager Clock-In Section */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Attendance</h3>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    wifiStatus.connected ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-gray-600">
                    WiFi: {wifiStatus.connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    locationStatus.available ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-gray-600">
                    Location: {locationStatus.available ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={clockInStatus === 'clocked_in' ? handleClockOut : handleClockIn}
                disabled={loading}
                className={`px-6 py-3 font-semibold rounded-lg transition-all duration-200 ${
                  clockInStatus === 'clocked_in'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d={clockInStatus === 'clocked_in' 
                          ? "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                          : "M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                        } 
                      />
                    </svg>
                    <span>
                      {clockInStatus === 'clocked_in' ? 'Clock Out' : 'Clock In'}
                    </span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="mt-4 space-y-2">
            {alerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${
                alert.severity === 'high' ? 'bg-red-50 border-red-400' :
                alert.severity === 'medium' ? 'bg-orange-50 border-orange-400' :
                'bg-yellow-50 border-yellow-400'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{alert.actionRequired}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => managerService.resolveAlert(alert.id)}
                  >
                    Resolve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Team Present</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.teamMembersPresent}/{stats.totalTeamMembers}
                </p>
                <p className="text-xs text-gray-500">{stats.attendanceRate.toFixed(1)}% attendance</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.pendingLeaveRequests + stats.pendingTimesheets}
                </p>
                {stats.overdueApprovals > 0 && (
                  <p className="text-xs text-red-500">{stats.overdueApprovals} overdue</p>
                )}
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Timesheets</p>
                <p className="text-2xl font-bold text-purple-600">{stats.pendingTimesheets}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Alerts</p>
                <p className="text-2xl font-bold text-red-600">{alerts.length}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Card>
        <CardHeader>
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== null && tab.count > 0 && (
                  <Badge variant="default" className="ml-2">
                    {tab.count}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </CardHeader>
        
        <CardContent>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Team Performance Summary */}
                {performanceMetrics && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Team Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Avg. Attendance Rate</span>
                          <span className="font-semibold">{performanceMetrics.averageAttendanceRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Avg. Working Hours</span>
                          <span className="font-semibold">{performanceMetrics.averageWorkingHours.toFixed(1)}h</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Punctuality Score</span>
                          <span className="font-semibold">{performanceMetrics.punctualityScore.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Total Overtime</span>
                          <span className="font-semibold">{performanceMetrics.totalOvertimeHours}h</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-3">
                      <Button 
                        onClick={() => setActiveTab('approvals')}
                        className="justify-start"
                        variant="outline"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Review Pending Approvals
                        {(stats.pendingLeaveRequests + stats.pendingTimesheets) > 0 && (
                          <Badge className="ml-auto">{stats.pendingLeaveRequests + stats.pendingTimesheets}</Badge>
                        )}
                      </Button>
                      
                      <Button 
                        onClick={() => setActiveTab('team-attendance')}
                        className="justify-start"
                        variant="outline"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        View Team Attendance
                      </Button>
                      
                      <Button 
                        onClick={() => navigate('/reports')}
                        className="justify-start"
                        variant="outline"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Team Reports & Analytics
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'team-attendance' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Team Attendance Overview</h3>
                <Button onClick={loadTeamAttendance} variant="outline" size="sm">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamMembers.map((member) => (
                  <Card key={member.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {member.firstName} {member.lastName}
                          </h4>
                          <p className="text-sm text-gray-500">{member.location || 'No location'}</p>
                        </div>
                        <Badge className={getStatusColor(member.status)}>
                          {member.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        {member.checkInTime && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Check-in:</span>
                            <span>{new Date(member.checkInTime).toLocaleTimeString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Working Hours:</span>
                          <span>{member.workingHours.toFixed(1)}h</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'approvals' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Pending Approvals</h3>
              
              {/* Quick approval interface will be implemented here */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  Quick approval interface for timesheets and leave requests will be displayed here.
                  This includes bulk approval capabilities and side-by-side comparison with attendance records.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Team Performance Metrics</h3>
              
              {performanceMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Attendance Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Average Rate:</span>
                          <span className="font-semibold">{performanceMetrics.averageAttendanceRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Punctuality:</span>
                          <span className="font-semibold">{performanceMetrics.punctualityScore.toFixed(1)}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Work Hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Average Hours:</span>
                          <span className="font-semibold">{performanceMetrics.averageWorkingHours.toFixed(1)}h</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Overtime:</span>
                          <span className="font-semibold">{performanceMetrics.totalOvertimeHours}h</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Leave Utilization</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Utilization Rate:</span>
                          <span className="font-semibold">{performanceMetrics.leaveUtilization.toFixed(1)}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* Existing tab content */}
          {activeTab === 'transfers' && (
            <ManagerLocationTransferApproval onTransferProcessed={handleTransferProcessed} />
          )}

          {activeTab === 'leave' && (
            <ManagerLeaveApproval />
          )}

          {activeTab === 'grace-period' && (
            <ManagerGracePeriodApproval />
          )}

          {activeTab === 'team-calendar' && (
            <TeamLeaveCalendar />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagerDashboard;
