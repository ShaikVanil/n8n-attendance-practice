import React, { useState, useEffect } from 'react';
import { activityService, ActivityListResponse, ActivityStats } from '../services/activityService';

const ActivityViewer: React.FC = () => {
  const [activities, setActivities] = useState<ActivityListResponse | null>(null);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [showStats, setShowStats] = useState(false);

  const loadActivities = async (page: number = 1, userId?: string) => {
    try {
      setLoading(true);
      const data = await activityService.getActivities(userId || undefined, page, 20);
      setActivities(data);
      setCurrentPage(page);
    } catch (err) {
      setError('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await activityService.getActivityStats();
      setStats(statsData);
    } catch (err) {
      setError('Failed to load activity statistics');
    }
  };

  useEffect(() => {
    loadActivities();
    loadStats();
  }, []);

  const handleUserFilter = (userId: string) => {
    setSelectedUserId(userId);
    loadActivities(1, userId);
  };

  const handlePageChange = (page: number) => {
    loadActivities(page, selectedUserId || undefined);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'USER_CREATED': return 'bg-green-100 text-green-800';
      case 'USER_UPDATED': return 'bg-blue-100 text-blue-800';
      case 'USER_DELETED': return 'bg-red-100 text-red-800';
      case 'PASSWORD_RESET': return 'bg-yellow-100 text-yellow-800';
      case 'BULK_UPDATE': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && !activities) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              User Activity Log
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowStats(!showStats)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                {showStats ? 'Hide Stats' : 'Show Stats'}
              </button>
            </div>
          </div>

          {/* Statistics Panel */}
          {showStats && stats && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900">Total Activities</h4>
                <p className="text-2xl font-bold text-blue-600">{stats.totalActivities}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900">Most Common Action</h4>
                <p className="text-lg font-semibold text-green-600">
                  {Object.entries(stats.activitiesByAction)
                    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-900">Action Types</h4>
                <p className="text-2xl font-bold text-purple-600">
                  {Object.keys(stats.activitiesByAction).length}
                </p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="mb-4">
            <div className="flex space-x-4">
              <div>
                <label htmlFor="userFilter" className="block text-sm font-medium text-gray-700">
                  Filter by User ID
                </label>
                <input
                  type="text"
                  id="userFilter"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  placeholder="Enter user ID"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => handleUserFilter(selectedUserId)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  Filter
                </button>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSelectedUserId('');
                    loadActivities(1);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Activities List */}
          {activities && (
            <div className="space-y-4">
              {activities.activities.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No activities found.</p>
              ) : (
                <div className="space-y-2">
                  {activities.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(activity.action)}`}>
                              {activity.action.replace('_', ' ')}
                            </span>
                            <span className="text-sm text-gray-500">
                              User ID: {activity.userId}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 mb-1">{activity.details}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>Performed by: {activity.performedBy}</span>
                            <span>{formatTimestamp(activity.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {activities.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === activities.totalPages}
                      className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing page <span className="font-medium">{currentPage}</span> of{' '}
                        <span className="font-medium">{activities.totalPages}</span>
                        {' '}({activities.total} total activities)
                      </p>
                    </div>
                    <div>
                      <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        {Array.from({ length: Math.min(5, activities.totalPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                page === currentPage
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === activities.totalPages}
                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityViewer;