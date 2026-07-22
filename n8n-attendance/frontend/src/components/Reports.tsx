import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import AttendanceReports from './AttendanceReports';

interface ReportData {
  id: string;
  name: string;
  type: 'attendance' | 'timesheet' | 'leave' | 'productivity';
  description: string;
  lastGenerated?: string;
}

const Reports: React.FC = () => {
  const { user } = useAuthStore();
  const [selectedReport, setSelectedReport] = useState<string>('attendance');
  const [reports] = useState<ReportData[]>([
    {
      id: 'attendance',
      name: 'Attendance Report',
      type: 'attendance',
      description: 'Comprehensive attendance tracking and analysis'
    },
    {
      id: 'timesheet',
      name: 'Timesheet Report',
      type: 'timesheet',
      description: 'Employee timesheet summaries and approvals'
    },
    {
      id: 'leave',
      name: 'Leave Report',
      type: 'leave',
      description: 'Leave requests, balances, and utilization'
    },
    {
      id: 'productivity',
      name: 'Productivity Report',
      type: 'productivity',
      description: 'Team productivity metrics and insights'
    }
  ]);

  const renderReportContent = () => {
    switch (selectedReport) {
      case 'attendance':
        return <AttendanceReports />;
      case 'timesheet':
        return (
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Timesheet Reports</h3>
            <p className="text-gray-600">Timesheet reporting functionality coming soon...</p>
          </div>
        );
      case 'leave':
        return (
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Leave Reports</h3>
            <p className="text-gray-600">Leave reporting functionality coming soon...</p>
          </div>
        );
      case 'productivity':
        return (
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Productivity Reports</h3>
            <p className="text-gray-600">Productivity reporting functionality coming soon...</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reports Dashboard</h1>
          <p className="text-gray-600 mt-2">Generate and view comprehensive reports</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Report Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">Available Reports</h2>
              <nav className="space-y-2">
                {reports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report.id)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      selectedReport === report.id
                        ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium">{report.name}</div>
                    <div className="text-sm text-gray-500">{report.description}</div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Report Content */}
          <div className="lg:col-span-3">
            {renderReportContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;