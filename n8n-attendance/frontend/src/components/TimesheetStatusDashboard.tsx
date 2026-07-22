import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, XCircle, FileText } from 'lucide-react';
import { dailyTimesheetService } from '../services/dailyTimesheetService';
import { DailyTimesheet } from '../types/timesheet';

interface StatusSummary {
  draft: number;
  submitted: number;
  approved: number;
  rejected: number;
}

const TimesheetStatusDashboard: React.FC = () => {
  const [statusSummary, setStatusSummary] = useState<StatusSummary>({
    draft: 0,
    submitted: 0,
    approved: 0,
    rejected: 0
  });
  const [recentTimesheets, setRecentTimesheets] = useState<DailyTimesheet[]>([]);

  useEffect(() => {
    loadStatusData();
  }, []);

  const loadStatusData = async () => {
    try {
      // Get timesheets from the last 30 days
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const timesheets = await dailyTimesheetService.getDailyTimesheets({
        dateFrom: startDate,
        dateTo: endDate,
        limit: 50
      });

      // Calculate status summary with explicit typing
      const summary = timesheets.reduce((acc: StatusSummary, timesheet: DailyTimesheet) => {
        acc[timesheet.status]++;
        return acc;
      }, { draft: 0, submitted: 0, approved: 0, rejected: 0 });

      setStatusSummary(summary);
      setRecentTimesheets(timesheets.slice(0, 10)); // Show last 10 timesheets
    } catch (error) {
      console.error('Error loading status data:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-800">Draft</p>
              <p className="text-2xl font-bold text-yellow-900">{statusSummary.draft}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-800">Submitted</p>
              <p className="text-2xl font-bold text-blue-900">{statusSummary.submitted}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">Approved</p>
              <p className="text-2xl font-bold text-green-900">{statusSummary.approved}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="w-8 h-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">Rejected</p>
              <p className="text-2xl font-bold text-red-900">{statusSummary.rejected}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Timesheets */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium">Recent Timesheets</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentTimesheets.map((timesheet) => (
            <div key={timesheet.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{timesheet.taskName}</p>
                <p className="text-sm text-gray-500">{timesheet.date}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  timesheet.status === 'approved' ? 'bg-green-100 text-green-800' :
                  timesheet.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                  timesheet.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
                </span>
                <span className="text-sm text-gray-500">{timesheet.workHours}h</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimesheetStatusDashboard;