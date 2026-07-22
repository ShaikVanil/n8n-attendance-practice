import React, { useState, useEffect } from 'react';
import { useLeaveStore } from '../stores/leaveStore';
import { useAuthStore } from '../stores/authStore';
import { notificationService } from '../services/notificationService';
import { LeaveRequestWithDetails } from '../types/leave';

interface LeaveStatusTrackerProps {
  userId?: string;
  showAllRequests?: boolean;
}

export const LeaveStatusTracker: React.FC<LeaveStatusTrackerProps> = ({ 
  userId, 
  showAllRequests = false 
}) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'type'>('date');
  const [showNotifications, setShowNotifications] = useState(true);

  const {
    leaveRequests,
    loading,
    error,
    fetchLeaveRequests,
    cancelLeaveRequest,
    reviewLeaveRequest,
    clearError
  } = useLeaveStore();

  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;
  const canReview = user?.role === 'manager' || user?.role === 'admin';

  useEffect(() => {
    if (targetUserId) {
      fetchLeaveRequests(showAllRequests ? {} : { userId: targetUserId });
    }
  }, [targetUserId, showAllRequests, fetchLeaveRequests]);

  useEffect(() => {
    // Initialize real-time notifications
    if (user?.id) {
      notificationService.initializeRealTime(user.id);
      notificationService.requestNotificationPermission();
    }

    // Listen for real-time leave notifications
    const handleNotification = (event: CustomEvent) => {
      const notification = event.detail;
      if (notification.type?.includes('leave_request')) {
        setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10
        // Refresh leave requests when status changes
        fetchLeaveRequests(showAllRequests ? {} : { userId: targetUserId });
      }
    };

    window.addEventListener('realtime-notification', handleNotification as EventListener);

    return () => {
      window.removeEventListener('realtime-notification', handleNotification as EventListener);
      notificationService.disconnect();
    };
  }, [user?.id, targetUserId, showAllRequests, fetchLeaveRequests]);

  const handleCancelRequest = async (requestId: string) => {
    if (window.confirm('Are you sure you want to cancel this leave request?')) {
      try {
        await cancelLeaveRequest(requestId);
      } catch (error) {
        console.error('Failed to cancel request:', error);
      }
    }
  };

  const handleReviewRequest = async (requestId: string, status: 'approved' | 'rejected', comments?: string) => {
    try {
      await reviewLeaveRequest(requestId, { status, comments });
    } catch (error) {
      console.error('Failed to review request:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case 'approved':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'rejected':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'cancelled':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const filteredRequests = leaveRequests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      case 'status':
        return a.status.localeCompare(b.status);
      case 'type':
        return a.leaveType?.name.localeCompare(b.leaveType?.name || '') || 0;
      default:
        return 0;
    }
  });

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
          <h2 className="text-2xl font-bold text-gray-900">
            {showAllRequests ? 'All Leave Requests' : 'My Leave Requests'}
          </h2>
          <p className="text-gray-600 mt-1">
            Track and manage leave request status
          </p>
        </div>
        
        {/* Notification Toggle */}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            showNotifications 
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
          Notifications {showNotifications ? 'On' : 'Off'}
        </button>
      </div>

      {/* Real-time Notifications */}
      {showNotifications && notifications.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Recent Notifications</h3>
          <div className="space-y-2">
            {notifications.slice(0, 3).map((notification, index) => (
              <div key={index} className="flex items-center text-sm text-blue-800">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                <span>{notification.message}</span>
                <span className="ml-auto text-xs text-blue-600">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={clearError}
                className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Sorting */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Status
          </label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sort by
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="date">Submission Date</option>
            <option value="status">Status</option>
            <option value="type">Leave Type</option>
          </select>
        </div>
      </div>

      {/* Leave Requests List */}
      {sortedRequests.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No leave requests</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === 'all' ? 'No leave requests found.' : `No ${filter} leave requests found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedRequests.map((request) => (
            <div key={request.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {request.leaveType?.name || 'Unknown Leave Type'}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        <span className="ml-1 capitalize">{request.status}</span>
                      </span>
                      {request.emergencyLeave && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                          Emergency
                        </span>
                      )}
                      {request.halfDay && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                          Half Day ({request.halfDayPeriod})
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Duration:</span>
                        <div>{new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">{request.totalDays} day(s)</div>
                      </div>
                      
                      <div>
                        <span className="font-medium">Submitted:</span>
                        <div>{new Date(request.submittedAt).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">{new Date(request.submittedAt).toLocaleTimeString()}</div>
                      </div>
                      
                      {request.reviewedAt && (
                        <div>
                          <span className="font-medium">Reviewed:</span>
                          <div>{new Date(request.reviewedAt).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">{new Date(request.reviewedAt).toLocaleTimeString()}</div>
                        </div>
                      )}
                    </div>
                    
                    {request.reason && (
                      <div className="mt-3">
                        <span className="font-medium text-sm text-gray-700">Reason:</span>
                        <p className="text-sm text-gray-600 mt-1">{request.reason}</p>
                      </div>
                    )}
                    
                    {request.reviewerComments && (
                      <div className="mt-3">
                        <span className="font-medium text-sm text-gray-700">Reviewer Comments:</span>
                        <p className="text-sm text-gray-600 mt-1">{request.reviewerComments}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {request.status === 'pending' && request.userId === user?.id && (
                    <button
                      onClick={() => handleCancelRequest(request.id)}
                      className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      Cancel Request
                    </button>
                  )}
                  
                  {request.status === 'pending' && canReview && request.userId !== user?.id && (
                    <>
                      <button
                        onClick={() => {
                          const comments = prompt('Add comments (optional):');
                          handleReviewRequest(request.id, 'approved', comments || undefined);
                        }}
                        className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const comments = prompt('Add rejection reason:');
                          if (comments) {
                            handleReviewRequest(request.id, 'rejected', comments);
                          }
                        }}
                        className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeaveStatusTracker;