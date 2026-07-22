import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { leaveService } from '../services/leaveService';
import { format, parseISO } from 'date-fns';
import { 
  UserLeaveOverview, 
  LeaveRequestWithDetails,
  LeaveBalanceWithType 
} from '../types/leave';

// Remove the local interfaces and use the imported types
const EmployeeLeaveHistory: React.FC = () => {
  const { user } = useAuthStore();
  const [overview, setOverview] = useState<UserLeaveOverview | null>(null);
  const [allRequests, setAllRequests] = useState<LeaveRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // New state for details modal
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestWithDetails | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use leaveService instead of direct fetch
      const overviewData = await leaveService.getMyLeaveOverview();
      setOverview(overviewData);
      
      // Fetch all leave requests using leaveService
      const requestsData = await leaveService.getLeaveRequests();
      setAllRequests(requestsData.data || []);
      
    } catch (err: any) {
      console.error('Error fetching leave data:', err);
      setError(err.message || 'Failed to fetch leave data');
    } finally {
      setLoading(false);
    }
  };

  // New function to handle viewing details
  const handleViewDetails = async (requestId: string) => {
    try {
      const detailedRequest = await leaveService.getLeaveRequest(requestId);
      setSelectedRequest(detailedRequest);
      setShowDetailsModal(true);
    } catch (err: any) {
      console.error('Error fetching request details:', err);
      setError('Failed to fetch request details');
    }
  };

  // New function to handle cancelling requests
  const handleCancelRequest = async (requestId: string) => {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) {
      return;
    }

    try {
      setCancellingRequestId(requestId);
      await leaveService.cancelLeaveRequest(requestId);
      
      // Refresh the data after cancellation
      await fetchLeaveData();
      
      // Show success message
      alert('Leave request cancelled successfully');
    } catch (err: any) {
      console.error('Error cancelling request:', err);
      setError('Failed to cancel request: ' + (err.message || 'Unknown error'));
    } finally {
      setCancellingRequestId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'pending':
        return (
          <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case 'rejected':
        return (
          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const filteredRequests = allRequests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'type':
        comparison = (a.leaveType?.name || '').localeCompare(b.leaveType?.name || '');
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading leave data</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={fetchLeaveData}
              className="mt-2 text-sm text-red-800 underline hover:text-red-900"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Leave History</h1>
        <p className="text-gray-600">View all your leave applications and their current status</p>
      </div>

      {/* Leave Balance Summary */}
      {overview && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Leave Balance Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {overview.balances.map((balance) => (
              <div key={balance.leaveTypeId} className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">
                  {/* Now balance.leaveType will be properly available */}
                  {balance.leaveType?.name || `Leave Type ${balance.leaveTypeId}`}
                </h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Allocated:</span>
                    <span className="font-medium">{balance.allocatedDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Used:</span>
                    <span className="font-medium">{balance.usedDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pending:</span>
                    <span className="font-medium">{balance.pendingDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Remaining:</span>
                    <span className="font-medium text-green-600">{balance.remainingDays} days</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{overview.statistics.totalRequestsThisYear}</div>
              <div className="text-sm text-blue-800">Total Requests This Year</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{overview.statistics.totalDaysUsedThisYear}</div>
              <div className="text-sm text-green-800">Days Used This Year</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{overview.statistics.pendingRequests}</div>
              <div className="text-sm text-yellow-800">Pending Requests</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div>
              <label htmlFor="filter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Status
              </label>
              <select
                id="filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Requests</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">
                Sort by
              </label>
              <select
                id="sort"
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-');
                  setSortBy(newSortBy as any);
                  setSortOrder(newSortOrder as any);
                }}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="date-desc">Date (Newest First)</option>
                <option value="date-asc">Date (Oldest First)</option>
                <option value="status-asc">Status (A-Z)</option>
                <option value="status-desc">Status (Z-A)</option>
                <option value="type-asc">Leave Type (A-Z)</option>
                <option value="type-desc">Leave Type (Z-A)</option>
              </select>
            </div>
          </div>
          
          <button
            onClick={fetchLeaveData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

       {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  Leave Request Details
                </h3>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedRequest(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Leave Type</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.leaveType?.name || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedRequest.status)}`}>
                      {getStatusIcon(selectedRequest.status)}
                      <span className="ml-1 capitalize">{selectedRequest.status}</span>
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <p className="mt-1 text-sm text-gray-900">{format(parseISO(selectedRequest.startDate), 'MMMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Date</label>
                    <p className="mt-1 text-sm text-gray-900">{format(parseISO(selectedRequest.endDate), 'MMMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Days</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.totalDays} {selectedRequest.totalDays === 1 ? 'day' : 'days'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Submitted On</label>
                    <p className="mt-1 text-sm text-gray-900">{format(parseISO(selectedRequest.submittedAt), 'MMMM dd, yyyy at h:mm a')}</p>
                  </div>
                </div>

                {selectedRequest.halfDay && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Half Day Period</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{selectedRequest.halfDayPeriod}</p>
                  </div>
                )}

                {selectedRequest.emergencyLeave && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Emergency Leave</label>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      Yes
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedRequest.reason || 'No reason provided'}</p>
                </div>

                {selectedRequest.reviewedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reviewed On</label>
                    <p className="mt-1 text-sm text-gray-900">{format(parseISO(selectedRequest.reviewedAt), 'MMMM dd, yyyy at h:mm a')}</p>
                  </div>
                )}

                {selectedRequest.reviewerComments && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reviewer Comments</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.reviewerComments}</p>
                  </div>
                )}

                {selectedRequest.documents && selectedRequest.documents.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Documents</label>
                    <div className="mt-1 space-y-2">
                      {selectedRequest.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm text-gray-900">{doc.fileName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="mt-6 flex justify-end space-x-3">
                {selectedRequest.status === 'pending' && (
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleCancelRequest(selectedRequest.id);
                    }}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Cancel Request
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedRequest(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )};


      {/* Leave Requests List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Leave Requests ({filteredRequests.length})
          </h2>
        </div>
        
        {sortedRequests.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No leave requests found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'all' ? 'You haven\'t submitted any leave requests yet.' : `No ${filter} leave requests found.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
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
                    Reason
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
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {request.leaveType?.name || 'Unknown'}
                          </div>
                          {request.emergencyLeave && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              Emergency
                            </span>
                          )}
                          {request.halfDay && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 ml-1">
                              Half Day ({request.halfDayPeriod})
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(parseISO(request.startDate), 'MMM dd, yyyy')}
                        {request.startDate !== request.endDate && (
                          <> - {format(parseISO(request.endDate), 'MMM dd, yyyy')}</>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {request.totalDays} {request.totalDays === 1 ? 'day' : 'days'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        <span className="ml-1 capitalize">{request.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(parseISO(request.submittedAt), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={request.reason}>
                        {request.reason || 'No reason provided'}
                      </div>
                      {request.reviewerComments && (
                        <div className="text-sm text-gray-500 max-w-xs truncate mt-1" title={request.reviewerComments}>
                          <strong>Review:</strong> {request.reviewerComments}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {request.status === 'pending' && (
                          <button
                            onClick={() => handleCancelRequest(request.id)}
                            disabled={cancellingRequestId === request.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {cancellingRequestId === request.id ? 'Cancelling...' : 'Cancel'}
                          </button>
                        )}
                        <button
                          onClick={() => handleViewDetails(request.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeLeaveHistory;