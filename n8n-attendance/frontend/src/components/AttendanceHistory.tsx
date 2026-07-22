import React, { useState, useEffect } from 'react';
import { useAttendanceStore } from '../stores/attendanceStore';
import { attendanceService } from '../services/attendanceService';
import { Attendance, AttendanceHistoryResponse, OvertimeRecord, OvertimeHistoryResponse } from '../types/attendance';
import { formatTimeInOfficeTimezone, formatDateInOfficeTimezone } from '../utils/dateUtils';

const AttendanceHistory: React.FC = () => {
  const [historyData, setHistoryData] = useState<AttendanceHistoryResponse | null>(null);
  const [overtimeData, setOvertimeData] = useState<OvertimeHistoryResponse | null>(null);
  const [showOvertimeView, setShowOvertimeView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [selectedRecord, setSelectedRecord] = useState<Attendance | null>(null);

  // Set default date range (last 30 days)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        startDate,
        endDate,
        status_filter: statusFilter ? statusFilter as 'present' | 'absent' | 'partial' : undefined,
        limit,
        offset: (currentPage - 1) * limit
      };
      
      const response = await attendanceService.getHistory(params);
      setHistoryData(response);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch attendance history');
    } finally {
      setLoading(false);
    }
  };

  const fetchOvertimeHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        startDate,
        endDate,
        limit,
        offset: (currentPage - 1) * limit
      };
      
      const response = await attendanceService.getOvertimeHistory(params);
      setOvertimeData(response);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch overtime history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showOvertimeView) {
      fetchOvertimeHistory();
    } else {
      fetchHistory();
    }
  }, [startDate, endDate, statusFilter, currentPage, showOvertimeView]);

  // Replace the existing formatTime and formatDate functions
  const formatTime = (dateString: string) => {
    return formatTimeInOfficeTimezone(dateString, 'HH:mm');
  };
  
  const formatDate = (dateString: string) => {
    return formatDateInOfficeTimezone(dateString, 'EEE, MMM d, yyyy');
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const exportToCSV = () => {
    if (!historyData?.attendance.length) return;
    
    const headers = ['Date', 'Check In', 'Check Out', 'Total Hours', 'Status', 'Breaks'];
    const csvContent = [
      headers.join(','),
      ...historyData.attendance.map(record => [
        record.date,
        record.checkInTime ? formatTime(record.checkInTime) : 'N/A',
        record.checkOutTime ? formatTime(record.checkOutTime) : 'N/A',
        record.totalHours ? record.totalHours.toFixed(2) : '0',
        record.status,
        record.breaks?.length || 0
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-history-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = async () => {
    // For now, we'll create a simple print-friendly view
    // In a real implementation, you'd use a library like jsPDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const printContent = `
      <html>
        <head>
          <title>Attendance History Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { text-align: center; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Attendance History Report</h1>
            <p>Period: ${formatDate(startDate)} to ${formatDate(endDate)}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Total Hours</th>
                <th>Status</th>
                <th>Breaks</th>
              </tr>
            </thead>
            <tbody>
              ${historyData?.attendance.map(record => `
                <tr>
                  <td>${formatDate(record.date)}</td>
                  <td>${record.checkInTime ? formatTime(record.checkInTime) : 'N/A'}</td>
                  <td>${record.checkOutTime ? formatTime(record.checkOutTime) : 'N/A'}</td>
                  <td>${record.totalHours ? record.totalHours.toFixed(2) : '0'}</td>
                  <td>${record.status}</td>
                  <td>${record.breaks?.length || 0}</td>
                </tr>
              `).join('') || ''}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Attendance History</h1>
        
        {/* View Toggle */}
        <div className="flex space-x-2">
          <button
            onClick={() => setShowOvertimeView(false)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              !showOvertimeView
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Attendance Records
          </button>
          <button
            onClick={() => setShowOvertimeView(true)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              showOvertimeView
                ? 'bg-orange-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Overtime History
          </button>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Filters & Export</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="partial">Partial Day</option>
            </select>
          </div>
          
          <div className="flex items-end space-x-2">
            <button
              onClick={exportToCSV}
              disabled={!historyData?.attendance.length}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
            >
              Export CSV
            </button>
            <button
              onClick={exportToPDF}
              disabled={!historyData?.attendance.length}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* History Table */}
      {!loading && historyData && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Attendance Records ({historyData.total} total)
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Breaks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {historyData.attendance.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.checkInTime ? (
                        <div>
                          <div>{formatTime(record.checkInTime)}</div>
                          <div className="text-xs text-gray-500 capitalize">
                            {record.checkInType}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not checked in</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.checkOutTime ? (
                        <div>
                          <div>{formatTime(record.checkOutTime)}</div>
                          <div className="text-xs text-gray-500 capitalize">
                            {record.checkOutType}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not checked out</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.totalHours ? record.totalHours.toFixed(2) : '0.00'} hrs
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        record.status === 'checked_out' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {record.status === 'checked_out' ? 'Complete' : 'In Progress'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.breaks?.length || 0} breaks
                      {record.breaks && record.breaks.length > 0 && (
                        <div className="text-xs text-gray-500">
                          {formatDuration(
                            record.breaks.reduce((total, breakItem) => {
                              if (breakItem.end_time && breakItem.start_time) {
                                const duration = (new Date(breakItem.end_time).getTime() - 
                                                new Date(breakItem.start_time).getTime()) / (1000 * 60);
                                return total + duration;
                              }
                              return total;
                            }, 0)
                          )} total
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {historyData.totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={!historyData.hasPreviousPage}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!historyData.hasNextPage}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing page <span className="font-medium">{historyData.page}</span> of{' '}
                    <span className="font-medium">{historyData.totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={!historyData.hasPreviousPage}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={!historyData.hasNextPage}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
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

      {/* Detailed View Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Attendance Details - {formatDate(selectedRecord.date)}
                </h3>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Check In</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedRecord.checkInTime ? formatTime(selectedRecord.checkInTime) : 'Not checked in'}
                      {selectedRecord.checkInType && (
                        <span className="ml-2 text-xs text-gray-500 capitalize">({selectedRecord.checkInType})</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Check Out</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedRecord.checkOutTime ? formatTime(selectedRecord.checkOutTime) : 'Not checked out'}
                      {selectedRecord.checkOutType && (
                        <span className="ml-2 text-xs text-gray-500 capitalize">({selectedRecord.checkOutType})</span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Hours</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedRecord.totalHours ? selectedRecord.totalHours.toFixed(2) : '0.00'} hours
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{selectedRecord.status}</p>
                  </div>
                </div>
                
                {/* Locations */}
                {(selectedRecord.checkInLocation || selectedRecord.checkOutLocation) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Check In Location</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedRecord.checkInLocation || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Check Out Location</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedRecord.checkOutLocation || 'Not specified'}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Notes */}
                {selectedRecord.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRecord.notes}</p>
                  </div>
                )}
                
                {/* Breaks */}
                {selectedRecord.breaks && selectedRecord.breaks.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Breaks</label>
                    <div className="space-y-2">
                      {selectedRecord.breaks.map((breakItem, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium text-gray-900 capitalize">
                                {breakItem.break_type} Break
                              </p>
                              <p className="text-xs text-gray-600">
                                {formatTime(breakItem.start_time)} - {' '}
                                {breakItem.end_time ? formatTime(breakItem.end_time) : 'Ongoing'}
                              </p>
                              {breakItem.notes && (
                                <p className="text-xs text-gray-500 mt-1">{breakItem.notes}</p>
                              )}
                            </div>
                            {breakItem.end_time && (
                              <span className="text-xs text-gray-500">
                                {formatDuration(
                                  (new Date(breakItem.end_time).getTime() - 
                                   new Date(breakItem.start_time).getTime()) / (1000 * 60)
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceHistory;