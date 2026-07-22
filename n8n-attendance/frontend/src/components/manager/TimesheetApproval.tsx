import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import PermissionGate from '../auth/PermissionGate';

interface TimesheetEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  weekStartDate: string;
  weekEndDate: string;
  totalHours: number;
  overtimeHours: number;
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  submittedAt: string;
  comments?: string;
  entries: DailyEntry[];
}

interface DailyEntry {
  date: string;
  startTime: string;
  endTime: string;
  breakTime: number;
  workHours: number;
  project?: string;
  notes?: string;
}

const TimesheetApproval: React.FC = () => {
  const { user } = useAuthStore();
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [approvalComment, setApprovalComment] = useState('');

  useEffect(() => {
    fetchTimesheets();
  }, [filter]);

  const fetchTimesheets = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/timesheets/team?status=${filter}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTimesheets(data.timesheets || []);
      }
    } catch (error) {
      console.error('Error fetching timesheets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (timesheetId: string, action: 'approve' | 'reject' | 'request_revision') => {
    try {
      const response = await fetch(`/api/timesheets/${timesheetId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          comments: approvalComment
        })
      });

      if (response.ok) {
        setApprovalComment('');
        setSelectedTimesheet(null);
        fetchTimesheets();
      }
    } catch (error) {
      console.error('Error processing timesheet approval:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'revision_requested': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <PermissionGate module="timesheets" roles={['manager', 'admin']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Timesheet Approval</h1>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="all">All Timesheets</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {timesheets.filter(t => t.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">
                {timesheets.filter(t => t.status === 'approved').length}
              </div>
              <div className="text-sm text-gray-600">Approved</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">
                {timesheets.filter(t => t.status === 'rejected').length}
              </div>
              <div className="text-sm text-gray-600">Rejected</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-600">
                {timesheets.filter(t => t.status === 'revision_requested').length}
              </div>
              <div className="text-sm text-gray-600">Revision Requested</div>
            </div>
          </div>
        </div>

        {/* Timesheets List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Week Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Overtime
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timesheets.map((timesheet) => (
                  <tr key={timesheet.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{timesheet.employeeName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(timesheet.weekStartDate).toLocaleDateString()} - 
                        {new Date(timesheet.weekEndDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{timesheet.totalHours.toFixed(1)}h</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{timesheet.overtimeHours.toFixed(1)}h</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(timesheet.status)}`}>
                        {timesheet.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(timesheet.submittedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedTimesheet(timesheet)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Review
                      </button>
                      {timesheet.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproval(timesheet.id, 'approve')}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleApproval(timesheet.id, 'reject')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Timesheet Detail Modal */}
        {selectedTimesheet && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Timesheet Details - {selectedTimesheet.employeeName}
                  </h3>
                  <button
                    onClick={() => setSelectedTimesheet(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                {/* Daily Entries */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {selectedTimesheet.entries.map((entry, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">{new Date(entry.date).toLocaleDateString()}</h4>
                        <span className="text-sm text-gray-600">{entry.workHours.toFixed(1)}h</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>Start: {entry.startTime}</div>
                        <div>End: {entry.endTime}</div>
                        <div>Break: {entry.breakTime}min</div>
                        <div>Project: {entry.project || 'N/A'}</div>
                      </div>
                      {entry.notes && (
                        <div className="mt-2 text-sm text-gray-600">
                          Notes: {entry.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Approval Actions */}
                {selectedTimesheet.status === 'pending' && (
                  <div className="mt-6 space-y-4">
                    <textarea
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      placeholder="Add comments (optional)"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      rows={3}
                    />
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleApproval(selectedTimesheet.id, 'approve')}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproval(selectedTimesheet.id, 'request_revision')}
                        className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
                      >
                        Request Revision
                      </button>
                      <button
                        onClick={() => handleApproval(selectedTimesheet.id, 'reject')}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
};

export default TimesheetApproval;