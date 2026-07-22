import React, { useState, useEffect } from 'react';
import { leaveService } from '../services/leaveService';
import type { LeaveRequestHistory } from '../types/leave';
import { formatDistanceToNow } from 'date-fns';

interface LeaveRequestHistoryProps {
  leaveRequestId: string;
  showTitle?: boolean;
}

const LeaveRequestHistory: React.FC<LeaveRequestHistoryProps> = ({ 
  leaveRequestId, 
  showTitle = true 
}) => {
  const [history, setHistory] = useState<LeaveRequestHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [leaveRequestId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const historyData = await leaveService.getLeaveRequestHistory(leaveRequestId);
      setHistory(historyData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leave request history');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return '📝';
      case 'status_changed':
        return '🔄';
      case 'updated':
        return '✏️';
      case 'cancelled':
        return '❌';
      default:
        return '📋';
    }
  };

  const getActionDescription = (historyItem: LeaveRequestHistory) => {
    switch (historyItem.action) {
      case 'created':
        return 'Leave request submitted';
      case 'status_changed':
        if (historyItem.newStatus === 'approved') {
          return 'Leave request approved';
        } else if (historyItem.newStatus === 'rejected') {
          return 'Leave request rejected';
        } else if (historyItem.newStatus === 'cancelled') {
          return 'Leave request cancelled';
        }
        return `Status changed from ${historyItem.previousStatus} to ${historyItem.newStatus}`;
      case 'updated':
        return 'Leave request details updated';
      default:
        return historyItem.action;
    }
  };

  const getStatusBadgeColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {showTitle && (
        <h3 className="text-lg font-medium text-gray-900 mb-4">Request History</h3>
      )}
      
      {history.length === 0 ? (
        <p className="text-gray-500 text-sm">No history available for this request.</p>
      ) : (
        <div className="flow-root">
          <ul className="-mb-8">
            {history.map((item, index) => (
              <li key={item.id}>
                <div className="relative pb-8">
                  {index !== history.length - 1 && (
                    <span
                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-sm">
                        {getActionIcon(item.action)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                      <div>
                        <p className="text-sm text-gray-900">
                          {getActionDescription(item)}
                          {item.newStatus && (
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(item.newStatus)}`}>
                              {item.newStatus}
                            </span>
                          )}
                        </p>
                        {item.comments && (
                          <p className="mt-1 text-sm text-gray-600 italic">
                            "{item.comments}"
                          </p>
                        )}
                      </div>
                      <div className="text-right text-sm whitespace-nowrap text-gray-500">
                        <time dateTime={item.createdAt}>
                          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                        </time>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LeaveRequestHistory;