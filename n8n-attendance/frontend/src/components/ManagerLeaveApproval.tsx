import React, { useState, useEffect } from 'react';
import { useLeaveStore } from '../stores/leaveStore';
import { useAuthStore } from '../stores/authStore';
import { LeaveRequestWithDetails } from '../types/leave';
import { notificationService } from '../services/notificationService';

interface ApprovalModalProps {
  request: LeaveRequestWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (requestId: string, comments: string) => void;
  onReject: (requestId: string, comments: string) => void;
}

const ApprovalModal: React.FC<ApprovalModalProps> = ({
  request,
  isOpen,
  onClose,
  onApprove,
  onReject
}) => {
  const [comments, setComments] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!action) return;
    
    setLoading(true);
    try {
      if (action === 'approve') {
        await onApprove(request.id, comments);
      } else {
        await onReject(request.id, comments);
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Review Leave Request
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Request Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Employee Details</h4>
                <p className="text-sm text-gray-600">Name: {request.user?.firstName} {request.user?.lastName}</p>
                <p className="text-sm text-gray-600">Email: {request.user?.email}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Leave Details</h4>
                <p className="text-sm text-gray-600">Type: {request.leaveType?.name}</p>
                <p className="text-sm text-gray-600">Duration: {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}</p>
                <p className="text-sm text-gray-600">Total Days: {request.totalDays}</p>
                {request.halfDay && (
                  <p className="text-sm text-gray-600">Half Day: {request.halfDayPeriod}</p>
                )}
                {request.emergencyLeave && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Emergency Leave
                  </span>
                )}
              </div>
            </div>
            
            {request.reason && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 mb-2">Reason</h4>
                <p className="text-sm text-gray-600 bg-white p-3 rounded border">{request.reason}</p>
              </div>
            )}
          </div>

          {/* Action Selection */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Decision</h4>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="action"
                  value="approve"
                  checked={action === 'approve'}
                  onChange={(e) => setAction(e.target.value as 'approve')}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Approve</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="action"
                  value="reject"
                  checked={action === 'reject'}
                  onChange={(e) => setAction(e.target.value as 'reject')}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Reject</span>
              </label>
            </div>
          </div>

          {/* Comments */}
          <div className="mb-6">
            <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
              Comments {action === 'reject' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={action === 'approve' ? 'Add any additional notes (optional)' : 'Please provide a reason for rejection'}
            />
            {action === 'reject' && !comments.trim() && (
              <p className="mt-1 text-sm text-red-600">Rejection reason is required</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!action || (action === 'reject' && !comments.trim()) || loading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                action === 'approve'
                  ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                  : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
              }`}
            >
              {loading ? 'Processing...' : action === 'approve' ? 'Approve Request' : 'Reject Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ManagerLeaveApproval: React.FC = () => {
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestWithDetails | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [sortBy, setSortBy] = useState<'date' | 'employee' | 'type'>('date');
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  // Remove or comment out line 174:
  // const [showBulkActions, setShowBulkActions] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const {
    leaveRequests,
    loading,
    error,
    fetchLeaveRequests,
    reviewLeaveRequest,
    clearError
  } = useLeaveStore();

  const { user } = useAuthStore();
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  useEffect(() => {
    if (isManager) {
      // Fetch all leave requests for managers
      fetchLeaveRequests({ status: filter === 'pending' ? 'pending' : undefined });
    }
  }, [isManager, filter, fetchLeaveRequests]);

  useEffect(() => {
    // Initialize real-time notifications for managers
    if (user?.id && isManager) {
      notificationService.initializeRealTime(user.id);
      
      const handleNotification = (event: CustomEvent) => {
        const notification = event.detail;
        if (notification.type?.includes('leave_request')) {
          setNotifications(prev => [notification, ...prev.slice(0, 9)]);
          // Refresh leave requests when new submissions come in
          fetchLeaveRequests({ status: filter === 'pending' ? 'pending' : undefined });
        }
      };

      window.addEventListener('realtime-notification', handleNotification as EventListener);
      return () => {
        window.removeEventListener('realtime-notification', handleNotification as EventListener);
        notificationService.disconnect();
      };
    }
  }, [user?.id, isManager, filter, fetchLeaveRequests]);

  const handleApprove = async (requestId: string, comments: string) => {
    await reviewLeaveRequest(requestId, { status: 'approved', comments });
    fetchLeaveRequests({ status: filter === 'pending' ? 'pending' : undefined });
  };

  const handleReject = async (requestId: string, comments: string) => {
    await reviewLeaveRequest(requestId, { status: 'rejected', comments });
    fetchLeaveRequests({ status: filter === 'pending' ? 'pending' : undefined });
  };

  const handleBulkApprove = async () => {
    if (selectedRequests.length === 0) return;
    
    const comments = prompt('Add comments for bulk approval (optional):');
    for (const requestId of selectedRequests) {
      await reviewLeaveRequest(requestId, { status: 'approved', comments: comments || undefined });
    }
    setSelectedRequests([]);
    fetchLeaveRequests({ status: filter === 'pending' ? 'pending' : undefined });
  };

  const handleRequestSelection = (requestId: string, checked: boolean) => {
    if (checked) {
      setSelectedRequests(prev => [...prev, requestId]);
    } else {
      setSelectedRequests(prev => prev.filter(id => id !== requestId));
    }
  };

  const filteredRequests = leaveRequests.filter(request => {
    if (filter === 'pending') return request.status === 'pending';
    return true;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      case 'employee':
        return `${a.user?.firstName} ${a.user?.lastName}`.localeCompare(`${b.user?.firstName} ${b.user?.lastName}`);
      case 'type':
        return a.leaveType?.name.localeCompare(b.leaveType?.name || '') || 0;
      default:
        return 0;
    }
  });

  if (!isManager) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
          <p className="text-gray-600">You need manager privileges to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading leave requests...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Request Management</h1>
          <p className="text-gray-600 mt-1">Review and approve team leave requests</p>
        </div>
        
        {/* Notification Badge */}
        {notifications.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
              <span className="text-blue-800 text-sm font-medium">
                {notifications.length} new notification{notifications.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap gap-4">
            {/* Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'pending' | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pending">Pending Only</option>
                <option value="all">All Requests</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'employee' | 'type')}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="date">Submission Date</option>
                <option value="employee">Employee Name</option>
                <option value="type">Leave Type</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedRequests.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedRequests.length} selected
              </span>
              <button
                onClick={handleBulkApprove}
                className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100"
              >
                Bulk Approve
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-800">{error}</span>
            <button
              onClick={clearError}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Leave Requests List */}
      {sortedRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No leave requests</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === 'pending' ? 'No pending leave requests found.' : 'No leave requests found.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedRequests.length === sortedRequests.filter(r => r.status === 'pending').length && sortedRequests.filter(r => r.status === 'pending').length > 0}
                      onChange={(e) => {
                        const pendingRequests = sortedRequests.filter(r => r.status === 'pending');
                        if (e.target.checked) {
                          setSelectedRequests(pendingRequests.map(r => r.id));
                        } else {
                          setSelectedRequests([]);
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leave Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
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
                {sortedRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {request.status === 'pending' && (
                        <input
                          type="checkbox"
                          checked={selectedRequests.includes(request.id)}
                          onChange={(e) => handleRequestSelection(request.id, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {request.user?.firstName?.[0]}{request.user?.lastName?.[0]}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {request.user?.firstName} {request.user?.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.user?.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{request.leaveType?.name}</div>
                      {request.emergencyLeave && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          Emergency
                        </span>
                      )}
                      {request.halfDay && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Half Day
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{new Date(request.startDate).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-500">to {new Date(request.endDate).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-500">{request.totalDays} day(s)</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        request.status === 'approved' ? 'bg-green-100 text-green-800' :
                        request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {request.status === 'pending' ? (
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Review
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowModal(true);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          View Details
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {selectedRequest && (
        <ApprovalModal
          request={selectedRequest}
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedRequest(null);
          }}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
};

export default ManagerLeaveApproval;
