import React, { useState, useEffect } from "react";
import { useAuthStore } from "../stores/authStore";
import LeaveRequestForm from "./LeaveRequestForm";
import TeamLeaveCalendar from "./TeamLeaveCalendar";
import ManagerLeaveApproval from "./ManagerLeaveApproval";
import leaveService from "../services/leaveService";

interface LeaveStats {
  totalRequests: number;
  pendingApprovals: number;
  totalApproved: number;
  totalRejected: number;
}

const LeaveManagement: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [stats, setStats] = useState<LeaveStats>({
    totalRequests: 0,
    pendingApprovals: 0,
    totalApproved: 0,
    totalRejected: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('Fetching leave statistics...');
        const response = await leaveService.getLeaveStatistics();
        console.log('API Response:', response);
        
        // Fix: Access the data property from the response
        const statsData = response;
        
        const newStats = {
          totalRequests: statsData.totalRequests,
          pendingApprovals: statsData.pendingRequests,
          totalApproved: statsData.approvedRequests,
          totalRejected: statsData.rejectedRequests,
        };
        
        console.log('Setting stats to:', newStats);
        setStats(newStats);
      } catch (error) {
        console.error("Failed to fetch leave statistics:", error);
      }
    };

    fetchStats();
  }, []);

  const isManager = user?.role === "manager" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      roles: ["employee", "manager", "admin"],
    },
    {
      id: "request",
      label: "New Request",
      roles: ["employee", "manager", "admin"],
    },
    { id: "calendar", label: "Team Calendar", roles: ["manager", "admin"] },
    {
      id: "approvals",
      label: "Pending Approvals",
      roles: ["manager", "admin"],
    },
  ];

  const availableTabs = tabs.filter((tab) =>
    tab.roles.includes(user?.role || "employee")
  );
  
  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        console.log('Rendering overview with stats:', stats);
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.totalRequests}
                </div>
                <div className="text-sm text-gray-600">Total Requests</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.pendingApprovals}
                </div>
                <div className="text-sm text-gray-600">Pending Approvals</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-2xl font-bold text-green-600">
                  {stats.totalApproved}
                </div>
                <div className="text-sm text-gray-600">Total Approved</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-2xl font-bold text-red-600">
                  {stats.totalRejected}
                </div>
                <div className="text-sm text-gray-600">Total Rejected</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">
                Recent Leave Activity
              </h3>
              <p className="text-gray-600">
                Recent leave requests and updates will appear here...
              </p>
            </div>
          </div>
        );
      case "request":
        return <LeaveRequestForm />;
      case "calendar":
        return <TeamLeaveCalendar />;
      case "approvals":
        return <ManagerLeaveApproval />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-600 mt-2">
            Manage leave requests and team schedules
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </div>
  );
};

export default LeaveManagement;
