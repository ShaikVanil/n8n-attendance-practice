import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { Alert, AlertDescription } from "./ui/Alert";
import {
  Clock,
  MapPin,
  Wifi,
  Calendar,
  FileText,
  TrendingUp,
  Bell,
  Play,
  Square,
  Coffee,
  BarChart3,
  Plus,
} from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { useSmartClockIn } from "../hooks/useSmartClockIn";
import { attendanceService } from "../services/attendanceService";
import { AttendanceStatus } from "../types/attendance";
import {
  dashboardService,
  DashboardStats,
  RecentActivity,
  UpcomingEvent,
  DashboardNotification,
  TodayWorkSummary,
} from "../services/dashboardService";
import { notificationService } from "../services/notificationService";
import { useAttendanceStore } from '../stores/attendanceStore';
import { getCurrentTimeInOfficeTimezone } from '../utils/dateUtils';

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const smartClockIn = useSmartClockIn();
  
  // Use shared attendance store instead of local state
  const { status: attendanceStatus, fetchStatus, updateStatus } = useAttendanceStore();
  
  const [todayWorkSummary, setTodayWorkSummary] =
    useState<TodayWorkSummary | null>(null);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  
  // Add dynamic time state
  // Add this state near other useState declarations
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
  
  // Add this useEffect to update time every second
  // Update the time state update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTimeInOfficeTimezone('HH:mm'));
    }, 1000);
  
    return () => clearInterval(timer);
  }, []);
  
  // Update the display to use dynamic time
  <div className="text-3xl font-bold text-gray-900 mb-2">
    {currentTime}
  </div>

  // Load attendance status using shared store
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Add real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }));
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  // Extract values from useSmartClockIn with proper destructuring
  const {
    status,
    wifiResult,
    userLocation,
    isLoading: smartClockInLoading,
    error: smartClockInError,
    performSmartClockIn,
  } = smartClockIn;

  // Helper functions to extract needed values - FIXED
  const canClockIn = status?.canAutoClockIn || false;
  const currentStatus = status?.recommendedAction || "unknown";

  // Add missing variables using attendance status
  const isConnected = canClockIn;
  const clockInStatus = attendanceStatus?.is_checked_in
    ? "clocked_in"
    : "clocked_out";

  // Create proper status objects for UI
  const wifiStatus = {
    connected: wifiResult?.isConnected || false,
    networkName: wifiResult?.currentNetwork?.ssid,
  };

  const locationStatus = {
    inOffice: status?.locationStatus?.isValid || false,
    distance: status?.locationStatus?.distance,
  };

  const handleClockOut = async () => {
    try {
      if (userLocation) {
        await attendanceService.checkOut({
          checkOutType: "manual",
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          timestamp: new Date().toISOString(),
        });
        await loadDashboardData();
      }
    } catch (error) {
      console.error("Clock out failed:", error);
    }
  };

  const [stats, setStats] = useState<DashboardStats>({
    todayHours: "0:00",
    breakTime: "0:00",
    weeklyHours: "0:00",
    monthlyHours: "0:00",
    attendanceRate: 0,
    leaveBalance: {
      annual: 0,
      sick: 0,
      personal: 0,
    },
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Real-time updates subscription
  useEffect(() => {
    if (!realTimeUpdates) return;

    const unsubscribe = dashboardService.subscribeToUpdates((data) => {
      switch (data.type) {
        case "attendance_update":
          updateStatus(data.payload); // Use store method instead of setAttendanceStatus
          break;
        case "work_summary_update":
          setTodayWorkSummary(data.payload);
          break;
        case "stats_update":
          setStats((prev) => ({ ...prev, ...data.payload }));
          break;
        case "notification_update":
          setNotifications((prev) => [data.payload, ...prev.slice(0, 9)]);
          break;
        default:
          break;
      }
    });

    return unsubscribe;
  }, [realTimeUpdates, updateStatus]); // Add updateStatus to dependencies

  // Enhanced data loading with real-time work summary
  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [
        statsRes,
        activityRes,
        eventsRes,
        notificationsRes,
        workSummaryRes,
      ] = await Promise.all([
        dashboardService.getEmployeeStats(),
        dashboardService.getRecentActivity(),
        dashboardService.getUpcomingEvents(),
        dashboardService.getUnreadNotifications(),
        dashboardService.getTodayWorkSummary(),
      ]);

      setStats(statsRes);
      setRecentActivity(activityRes);
      setUpcomingEvents(eventsRes);
      setNotifications(notificationsRes);
      setTodayWorkSummary(workSummaryRes);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      // Fallback to mock data if API fails
      setStats({
        todayHours: "0:00",
        breakTime: "0:00",
        weeklyHours: "0:00",
        monthlyHours: "0:00",
        attendanceRate: 0,
        leaveBalance: { annual: 0, sick: 0, personal: 0 },
      });
      setRecentActivity([]);
      setUpcomingEvents([]);
      setNotifications([]);
      setTodayWorkSummary(null);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced clock-in handler with real-time feedback
  const handleClockIn = async () => {
    try {
      setLoading(true);
      const success = await performSmartClockIn();
      if (success) {
        // Immediately update work summary
        const updatedSummary = await dashboardService.getTodayWorkSummary();
        setTodayWorkSummary(updatedSummary);
        await loadDashboardData();
      }
    } catch (error) {
      console.error("Clock in failed:", error);
    } finally {
      setLoading(false);
    }
  };

  // Add these navigation handler functions after the existing handlers
  const handleLeaveRequest = () => {
    navigate("/leave");
  };

  // Update the handleCreateTimesheet function (around line 254):
  const handleCreateTimesheet = () => {
    navigate("/daily-timesheets");
  };

  // Update the button text (around line 545) - already shows "Daily Timesheet"
  <Button
    className="w-full justify-start"
    variant="outline"
    onClick={handleCreateTimesheet}
  >
    <FileText className="w-4 h-4 mr-2" />
    Daily Timesheet
  </Button>
  const handleViewReports = () => {
    navigate("/reports");
  };

  const handleViewAllActivity = () => {
    navigate("/activity");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "timesheet":
        return <FileText className="w-4 h-4" />;
      case "leave_request":
        return <Calendar className="w-4 h-4" />;
      case "attendance":
        return <Clock className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
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
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-blue-100">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Smart Clock-In Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Clock In/Out</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Clock In/Out Button */}
            <div className="md:col-span-1">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {currentTime}
                </div>
                <Button
                  onClick={
                    clockInStatus === "clocked_in"
                      ? handleClockOut
                      : handleClockIn
                  }
                  disabled={loading} // Only disable when loading, not based on connectivity
                  className={`w-full py-3 ${
                    clockInStatus === "clocked_in"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : clockInStatus === "clocked_in" ? (
                    <Square className="w-4 h-4 mr-2" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  {clockInStatus === "clocked_in" ? "Clock Out" : "Clock In"}
                </Button>
              </div>
            </div>

            {/* Connectivity Status */}
            <div className="md:col-span-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Wifi
                    className={`w-5 h-5 ${
                      wifiStatus.connected ? "text-green-600" : "text-red-600"
                    }`}
                  />
                  <div>
                    <div className="font-medium text-sm">
                      WiFi:{" "}
                      {wifiStatus.connected ? "Connected" : "Disconnected"}
                    </div>
                    {wifiStatus.networkName && (
                      <div className="text-xs text-gray-600">
                        {wifiStatus.networkName}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin
                    className={`w-5 h-5 ${
                      locationStatus.inOffice
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  />
                  <div>
                    <div className="font-medium text-sm">
                      Location:{" "}
                      {locationStatus.inOffice ? "In Office" : "Outside"}
                    </div>
                    {locationStatus.distance && (
                      <div className="text-xs text-gray-600">
                        {locationStatus.distance}m from office
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Today's Hours
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.todayHours}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Break Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.breakTime}
                </p>
              </div>
              <Coffee className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Weekly Hours
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.weeklyHours}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Attendance Rate
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.attendanceRate}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Recent Activity</span>
              </span>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {getActivityIcon(activity.type)}
                      <div>
                        <div className="font-medium text-sm">
                          {activity.title}
                        </div>
                        <div className="text-xs text-gray-600">
                          {activity.date}
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusColor(activity.status)}>
                      {activity.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions & Leave Balance */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={handleLeaveRequest}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Submit Leave Request
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={handleCreateTimesheet}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Daily Timesheet
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={handleViewReports}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Reports
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity - Enhanced View All Button */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Recent Activity</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewAllActivity}
                >
                  View All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {getActivityIcon(activity.type)}
                        <div>
                          <div className="font-medium text-sm">
                            {activity.title}
                          </div>
                          <div className="text-xs text-gray-600">
                            {activity.date}
                          </div>
                        </div>
                      </div>
                      <Badge className={getStatusColor(activity.status)}>
                        {activity.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leave Balance */}
          <Card>
            <CardHeader>
              <CardTitle>Leave Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Annual Leave</span>
                  <span className="font-medium">
                    {stats.leaveBalance.annual} days
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Sick Leave</span>
                  <span className="font-medium">
                    {stats.leaveBalance.sick} days
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Personal Leave</span>
                  <span className="font-medium">
                    {stats.leaveBalance.personal} days
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upcoming Events & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Upcoming Events</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No upcoming events</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{event.title}</div>
                      <div className="text-xs text-gray-600">{event.date}</div>
                      {event.description && (
                        <div className="text-xs text-gray-500">
                          {event.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Notifications</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No new notifications</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded"
                  >
                    <div className="font-medium text-sm text-blue-900">
                      {notification.title}
                    </div>
                    <div className="text-xs text-blue-700">
                      {notification.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
