import React, { useState, useEffect } from 'react';
import { useTimesheetStore } from '../stores/timesheetStore';
import { useAuthStore } from '../stores/authStore';
import { timesheetService } from '../services/timesheetService';
import { Timesheet, TIMESHEET_STATUS_LABELS, TIMESHEET_STATUS_COLORS } from '../types/timesheet';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { Alert } from './ui/Alert';

interface TimesheetListProps {
  onEdit?: (timesheet: Timesheet) => void;
  onView?: (timesheet: Timesheet) => void;
  showActions?: boolean;
}

export const TimesheetList: React.FC<TimesheetListProps> = ({
  onEdit,
  onView,
  showActions = true
}) => {
  const { user } = useAuthStore();
  const {
    timesheets,
    loading,
    error,
    total,
    fetchTimesheets,
    deleteTimesheet,
    clearError
  } = useTimesheetStore();

  const [filters, setFilters] = useState({
    status: '' as '' | 'draft' | 'submitted' | 'approved' | 'rejected',
    weekStartDate: '',
    limit: 10,
    offset: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadTimesheets();
  }, [filters, currentPage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const loadTimesheets = async () => {
    const searchFilters = {
      ...filters,
      offset: (currentPage - 1) * filters.limit,
      status: filters.status || undefined
    };
    await fetchTimesheets(searchFilters);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleDelete = async (timesheetId: string) => {
    try {
      await deleteTimesheet(timesheetId);
      setShowDeleteConfirm(null);
      loadTimesheets();
    } catch (error) {
      console.error('Failed to delete timesheet:', error);
    }
  };

  const formatWeekRange = (weekStartDate: string) => {
    const startDate = new Date(weekStartDate);
    const endDate = timesheetService.getWeekEndDate(weekStartDate);
    return `${startDate.toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'destructive';
      case 'submitted': return 'warning';
      default: return 'secondary';
    }
  };

  const filteredTimesheets = timesheets.filter(timesheet => {
    if (!timesheet) return false;
    const matchesSearch = searchTerm === '' || 
      formatWeekRange(timesheet.weekStartDate).toLowerCase().includes(searchTerm.toLowerCase()) ||
      timesheet.status.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalPages = Math.ceil(total / filters.limit);

  if (loading && timesheets.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading timesheets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Timesheets</h2>
        <div className="text-sm text-gray-500">
          {total} timesheet{total !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <Input
                type="text"
                placeholder="Search timesheets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Week Start Date
              </label>
              <Input
                type="date"
                value={filters.weekStartDate}
                onChange={(e) => handleFilterChange('weekStartDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Items per page
              </label>
              <select
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timesheets List */}
      {filteredTimesheets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No timesheets found</h3>
            <p className="text-gray-500">Create your first timesheet to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTimesheets.map((timesheet) => (
            <Card key={timesheet.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          Week of {formatWeekRange(timesheet.weekStartDate)}
                        </h3>
                        <div className="flex items-center space-x-4 mt-1">
                          <Badge variant={getStatusVariant(timesheet.status)}>
                            {TIMESHEET_STATUS_LABELS[timesheet.status]}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {timesheet.totalHours.toFixed(2)} hours
                          </span>
                          {timesheet.submittedAt && (
                            <span className="text-sm text-gray-500">
                              Submitted {new Date(timesheet.submittedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {timesheet.rejectionReason && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800">
                          <strong>Rejection Reason:</strong> {timesheet.rejectionReason}
                        </p>
                      </div>
                    )}
                    
                    {timesheet.managerComments && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800">
                          <strong>Manager Comments:</strong> {timesheet.managerComments}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {showActions && (
                    <div className="flex items-center space-x-2 ml-4">
                      {onView && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onView(timesheet)}
                        >
                          View
                        </Button>
                      )}
                      
                      {onEdit && (timesheet.status === 'draft' || timesheet.status === 'rejected') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(timesheet)}
                        >
                          Edit
                        </Button>
                      )}
                      
                      {timesheet.status === 'draft' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDeleteConfirm(timesheet.id)}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {(currentPage - 1) * filters.limit + 1} to {Math.min(currentPage * filters.limit, total)} of {total} results
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || loading}
            >
              Previous
            </Button>
            
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Delete Timesheet
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this timesheet? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetList;