import React, { useState, useEffect } from 'react';
import { GracePeriodService, GracePeriodException } from '../services/gracePeriodService';
import { UserService, User } from '../services/userService';
import { useAuthStore } from '../stores/authStore';
// Remove the notificationService import since we don't need it
// import { notificationService } from '../services/notificationService';

interface ApprovalModalProps {
  request: GracePeriodException;
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

  const formatGraceType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Review Grace Period Exception Request
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              ✕
            </button>
          </div>

          {/* Request Details */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-700">Type:</span>
                <span className="ml-2 capitalize">{request.type}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Grace Type:</span>
                <span className="ml-2">{formatGraceType(request.graceType)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Duration:</span>
                <span className="ml-2">{request.gracePeriod} minutes</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Valid From:</span>
                <span className="ml-2">{new Date(request.validFrom).toLocaleDateString()}</span>
              </div>
              {request.validTo && (
                <div>
                  <span className="font-medium text-gray-700">Valid To:</span>
                  <span className="ml-2">{new Date(request.validTo).toLocaleDateString()}</span>
                </div>
              )}
            </div>
            <div className="mt-4">
              <span className="font-medium text-gray-700">Reason:</span>
              <p className="mt-1 text-gray-600">{request.reason}</p>
            </div>
          </div>

          {/* Action Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Decision
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="action"
                  value="approve"
                  checked={action === 'approve'}
                  onChange={(e) => setAction(e.target.value as 'approve')}
                  className="mr-2"
                />
                <span className="text-green-600">Approve</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="action"
                  value="reject"
                  checked={action === 'reject'}
                  onChange={(e) => setAction(e.target.value as 'reject')}
                  className="mr-2"
                />
                <span className="text-red-600">Reject</span>
              </label>
            </div>
          </div>

          {/* Comments */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comments {action === 'reject' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={action === 'approve' ? 'Optional comments...' : 'Please provide a reason for rejection...'}
              required={action === 'reject'}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!action || loading || (action === 'reject' && !comments.trim())}
              className={`px-4 py-2 text-white rounded-md disabled:opacity-50 ${
                action === 'approve' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {loading ? 'Processing...' : action === 'approve' ? 'Approve' : 'Reject'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ManagerGracePeriodApproval: React.FC = () => {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<GracePeriodException[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<GracePeriodException | null>(null);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetchRequests();
    fetchUsers();
    
    // Listen for new grace period exception notifications
    const handleNotification = (event: CustomEvent) => {
      const notification = event.detail;
      if (notification.type?.includes('grace_period_exception')) {
        setNotifications(prev => [notification, ...prev.slice(0, 9)]);
        fetchRequests();
      }
    };

    window.addEventListener('notification', handleNotification as EventListener);
    return () => window.removeEventListener('notification', handleNotification as EventListener);
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (filter === 'pending') {
        filters.status = 'pending';
      }
      
      const requestsData = await GracePeriodService.getGracePeriodExceptions(filters);
      setRequests(requestsData);
    } catch (error: any) {
      setError('Failed to fetch grace period exception requests');
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const usersData = await UserService.getUsers();
      setUsers(usersData.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return 'Unknown User';
    return `${user.firstName} ${user.lastName}`;
  };

  const getUserEmail = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.email || '';
  };

  const handleApprove = async (requestId: string, comments: string) => {
    try {
      // Use the new review method instead of update
      await GracePeriodService.reviewGracePeriodException(requestId, {
        status: 'approved',
        reviewerComments: comments
      });
      
      // Remove notification calls - backend will handle notifications
      // The backend service will automatically send notifications when the request is reviewed
      
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      setError('Failed to approve grace period exception request');
    }
  };

  const handleReject = async (requestId: string, comments: string) => {
    try {
      // Use the new review method instead of update
      await GracePeriodService.reviewGracePeriodException(requestId, {
        status: 'rejected',
        reviewerComments: comments
      });
      
      // Remove notification calls - backend will handle notifications
      // The backend service will automatically send notifications when the request is reviewed
      
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      setError('Failed to reject grace period exception request');
    }
  };

  const formatGraceType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getStatusBadge = (request: GracePeriodException) => {
    switch (request.status) {
      case 'approved':
        return <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">Approved</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">Rejected</span>;
      case 'pending':
      default:
        return <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">Pending</span>;
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
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Grace Period Exception Requests
        </h1>
        <p className="text-gray-600">
          Review and approve grace period exception requests from your team.
        </p>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Recent Notifications</h3>
          <div className="space-y-1">
            {notifications.slice(0, 3).map((notification, index) => (
              <p key={index} className="text-sm text-blue-700">
                {notification.message}
              </p>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setFilter('pending')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                filter === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending Requests
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                filter === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Requests
            </button>
          </nav>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {requests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {filter === 'pending' ? 'No pending requests' : 'No requests found'}
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grace Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valid Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            // Update the table to show reviewer information
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {getUserName(request.userId)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {getUserEmail(request.userId)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="capitalize text-sm text-gray-900">
                      {request.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {formatGraceType(request.graceType)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {request.gracePeriod} min
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(request.validFrom).toLocaleDateString()}
                      {request.validTo && (
                        <span> - {new Date(request.validTo).toLocaleDateString()}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(request)}
                    {request.reviewedBy && (
                      <div className="text-xs text-gray-500 mt-1">
                        Reviewed by: {getUserName(request.reviewedBy)}
                      </div>
                    )}
                    {request.reviewerComments && (
                      <div className="text-xs text-gray-500 mt-1" title={request.reviewerComments}>
                        Comments: {request.reviewerComments.substring(0, 50)}{request.reviewerComments.length > 50 ? '...' : ''}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {request.status === 'pending' ? (
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Review
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="text-gray-600 hover:text-gray-900 mr-4"
                      >
                        View Details
                      </button>
                    )}
                  </td>
                </tr>
                ))}
              </tbody>
            </table>
        )}
      </div>

      {/* Approval Modal */}
      {selectedRequest && (
        <ApprovalModal
          request={selectedRequest}
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
};

export default ManagerGracePeriodApproval;