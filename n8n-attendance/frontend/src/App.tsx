import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { DeviceList } from "./components/devices/DeviceList";
import { DeviceForm } from "./components/devices/DeviceForm";
import AttendanceHistory from "./components/AttendanceHistory";
import LeaveRequestForm from "./components/LeaveRequestForm";
import { useAuthStore } from "./stores/authStore";
import "./App.css";
import UserManagement from "./components/UserManagement";
import RoleBasedRoute from "./components/auth/RoleBasedRoute";
import RoleBasedNavigation from "./components/navigation/RoleBasedNavigation";
import ActivityViewer from "./components/ActivityViewer";
import PolicyTemplateManagement from "./components/PolicyTemplateManagement";
import TeamLeaveCalendar from "./components/TeamLeaveCalendar";
import ManagerLeaveApproval from "./components/ManagerLeaveApproval";
import DataRetentionManager from "./components/DataRetentionManager";
import GracePeriodExceptionRequestForm from "./components/GracePeriodExceptionRequestForm";
import ManagerGracePeriodApproval from "./components/ManagerGracePeriodApproval";
import ManagerDashboard from "./components/ManagerDashboard";
import LocationTransferRequestForm from "./components/LocationTransferRequestForm";
import LocationTransferHistory from "./components/LocationTransferHistory";
import LoginForm from "./components/LoginForm";
import Timesheets from "./components/Timesheets";
import TeamAttendance from "./components/manager/TeamAttendance";
import TimesheetApproval from "./components/manager/TimesheetApproval";
import AdminDashboard from "./components/AdminDashboard";
import AuditLogs from "./components/AuditLogs";
import { WiFiProvider } from "./contexts/WiFiContext";
import { AuthService } from "./services/authService";
import EmployeeDashboard from "./components/EmployeeDashboard";
// Add missing imports - these components may need to be created if they don't exist
import Reports from "./components/Reports";
import LeaveManagement from "./components/LeaveManagement";
import SystemAdmin from "./components/SystemAdmin";
import ComplianceDashboard from "./components/ComplianceDashboard";
import AdminReports from "./components/AdminReports";
import EmployeeLeaveHistory from "./components/EmployeeLeaveHistory";
// Add import for DailyTimesheetList
import DailyTimesheetList from "./components/DailyTimesheetList";
// Add import for enhanced component
import EnhancedDailyTimesheetPage from "./components/EnhancedDailyTimesheetPage";
// Add project-related imports
import EmployeeProjectDashboard from "./components/EmployeeProjectDashboard";
import ProjectAssignmentManagement from "./components/ProjectAssignmentManagement";
import ProjectTeamView from "./components/ProjectTeamView";
import ProjectManagement from "./components/ProjectManagement";
import EnhancedTopbar from "./components/navigation/EnhancedTopbar";
import DailyTimesheetReview from "./components/manager/DailyTimesheetReview";
import { TimezoneProvider } from "./contexts/TimezoneContext";

function App() {
  const { user, logout, checkAuth } = useAuthStore();
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const isAuthenticated = AuthService.isAuthenticated() && user;
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Get role-specific home component
  const getRoleBasedHome = () => {
    switch (user?.role) {
      case "admin":
        return <AdminDashboard />;
      case "manager":
        return <ManagerDashboard />;
      case "employee":
      default:
        return <EmployeeDashboard />;
    }
  };

  return (
    <TimezoneProvider>
      <Router>
        <WiFiProvider>
          <div className="min-h-screen bg-gray-50">
            {/* Replace the old nav with enhanced topbar */}
            <EnhancedTopbar />

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
              <Routes>
                {/* Role-based home routes */}
                <Route path="/" element={getRoleBasedHome()} />

                {/* Specific dashboard routes */}
                <Route
                  path="/employeedashboard"
                  element={<EmployeeDashboard />}
                />
                <Route
                  path="/managerdashboard"
                  element={
                    <RoleBasedRoute allowedRoles={["manager", "admin"]}>
                      <ManagerDashboard />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="/admindashboard"
                  element={
                    <RoleBasedRoute allowedRoles={["admin"]}>
                      <AdminDashboard />
                    </RoleBasedRoute>
                  }
                />
                {/* Removed redundant routes - functionality now in dashboards */}
                {/* <Route path="/attendance" element={<AttendanceDashboard />} /> */}
                {/* <Route path="/clockin" element={<SmartClockIn />} /> */}
                <Route path="/history" element={<AttendanceHistory />} />
                <Route path="/devices" element={<DeviceList />} />
                <Route path="/devices/new" element={<DeviceForm />} />
                <Route path="/devices/:id/edit" element={<DeviceForm />} />
                <Route
                  path="/daily-timesheets"
                  element={<EnhancedDailyTimesheetPage />}
                />
                <Route
                  path="/timesheets/review"
                  element={
                    <RoleBasedRoute allowedRoles={["manager", "admin"]}>
                      <DailyTimesheetReview />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="/timesheets/approval"
                  element={
                    <RoleBasedRoute allowedRoles={["manager", "admin"]}>
                      <TimesheetApproval />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="/attendance/team"
                  element={
                    <RoleBasedRoute allowedRoles={["manager", "admin"]}>
                      <TeamAttendance />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="/manager"
                  element={
                    <RoleBasedRoute allowedRoles={["manager", "admin"]}>
                      <ManagerDashboard />
                    </RoleBasedRoute>
                  }
                />
                {/* Employee Routes */}
                <Route
                  path="/projects/my-assignments"
                  element={<EmployeeProjectDashboard />}
                />

                {/* Manager Routes */}
                <Route
                  path="/projects/manage"
                  element={<ProjectAssignmentManagement />}
                />
                <Route
                  path="/projects/team-view"
                  element={<ProjectTeamView showProjectSelector={true} />}
                />
                <Route
                  path="/manager/projects"
                  element={<ProjectAssignmentManagement />}
                />
                <Route
                  path="/admin/projects"
                  element={<ProjectAssignmentManagement />}
                />
                <Route
                  path="/admin/project-management"
                  element={<ProjectManagement />}
                />

                {/* Admin Routes */}
                <Route
                  path="/admin/projects"
                  element={<ProjectAssignmentManagement />}
                />
                <Route
                  path="/leave-management"
                  element={
                    <RoleBasedRoute allowedRoles={["manager", "admin"]}>
                      <LeaveManagement />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <RoleBasedRoute allowedRoles={["admin"]}>
                      <UserManagement />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <RoleBasedRoute allowedRoles={["manager", "admin"]}>
                      <Reports />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <RoleBasedRoute allowedRoles={["admin"]}>
                      <AdminDashboard />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="/admin/system"
                  element={
                    <RoleBasedRoute allowedRoles={["admin"]}>
                      <SystemAdmin />
                    </RoleBasedRoute>
                  }
                />
                {/* Manager Routes */}
                <Route
                  path="/manager/dashboard"
                  element={
                    <RoleBasedRoute allowedRoles={["manager", "admin"]}>
                      <ManagerDashboard />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="/manager/team-attendance"
                  element={
                    <RoleBasedRoute allowedRoles={["manager", "admin"]}>
                      <TeamAttendance />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="/manager/timesheet-approval"
                  element={
                    <RoleBasedRoute allowedRoles={["manager", "admin"]}>
                      <TimesheetApproval />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="/manager/leave-approval"
                  element={
                    <RoleBasedRoute allowedRoles={["manager", "admin"]}>
                      <ManagerLeaveApproval />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="/manager/grace-period-approval"
                  element={
                    <RoleBasedRoute allowedRoles={["manager", "admin"]}>
                      <ManagerGracePeriodApproval />
                    </RoleBasedRoute>
                  }
                />
                {/* Admin Routes */}
                <Route
                  path="/admin/dashboard"
                  element={
                    <RoleBasedRoute allowedRoles={["admin"]}>
                      <AdminDashboard />
                    </RoleBasedRoute>
                  }
                />
                <Route path="/leave" element={<LeaveRequestForm />} />
                <Route
                  path="/leave/history"
                  element={<EmployeeLeaveHistory />}
                />
                <Route
                  path="/attendance/history"
                  element={<AttendanceHistory />}
                />
                <Route
                  path="/admin/users"
                  element={
                    <RoleBasedRoute allowedRoles={["admin"]}>
                      <UserManagement />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="/admin/compliance"
                  element={
                    <RoleBasedRoute allowedRoles={["admin"]}>
                      <ComplianceDashboard />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="/admin/reports"
                  element={
                    <RoleBasedRoute allowedRoles={["admin"]}>
                      <AdminReports />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="/admin/audit-logs"
                  element={
                    <RoleBasedRoute allowedRoles={["admin"]}>
                      <AuditLogs />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="/admin/policy-templates"
                  element={
                    <RoleBasedRoute allowedRoles={["admin"]}>
                      <PolicyTemplateManagement />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="/admin/data-retention"
                  element={
                    <RoleBasedRoute allowedRoles={["admin"]}>
                      <DataRetentionManager />
                    </RoleBasedRoute>
                  }
                />
                {/* Shared Routes */}
                <Route path="/leave-calendar" element={<TeamLeaveCalendar />} />
                <Route
                  path="/grace-period-request"
                  element={<GracePeriodExceptionRequestForm />}
                />
                <Route
                  path="/location-transfer"
                  element={<LocationTransferRequestForm />}
                />
                <Route
                  path="/location-transfer-history"
                  element={<LocationTransferHistory />}
                />
                <Route path="/activity" element={<ActivityViewer />} />
              </Routes>
            </main>
          </div>
        </WiFiProvider>
      </Router>
    </TimezoneProvider>
  );
}

export default App;
