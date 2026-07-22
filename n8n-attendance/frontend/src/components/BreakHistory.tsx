import React, { useState, useEffect, useCallback } from 'react';
import { useBreakStore } from '../stores/breakStore';
import { Break } from '../types/attendance';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface BreakHistoryProps {
  className?: string;
}

type DateRange = 'today' | 'week' | 'month' | 'custom';

const BreakHistory: React.FC<BreakHistoryProps> = ({ className = '' }) => {
  const {
    breaks,
    loading,
    error,
    hasMore,
    fetchBreakHistory,
    clearError,
    resetBreaks
  } = useBreakStore();
  
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  // Remove this line - hasMore is already provided by the store
  // const [hasMore, setHasMore] = useState(true);

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const calculateDuration = (startTime: string, endTime?: string): number => {
    if (!endTime) return 0;
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    return Math.round((end - start) / (1000 * 60)); // Convert to minutes
  };

  const getDateRangeParams = useCallback(() => {
    const today = new Date();
    
    switch (dateRange) {
      case 'today':
        return {
          start_date: format(today, 'yyyy-MM-dd'),
          end_date: format(today, 'yyyy-MM-dd')
        };
      case 'week':
        return {
          start_date: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
          end_date: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        };
      case 'month':
        return {
          start_date: format(startOfMonth(today), 'yyyy-MM-dd'),
          end_date: format(endOfMonth(today), 'yyyy-MM-dd')
        };
      case 'custom':
        return {
          start_date: startDate,
          end_date: endDate
        };
      default:
        return {};
    }
  }, [dateRange, startDate, endDate]);

  // Load breaks when date range changes
  useEffect(() => {
    const dateParams = getDateRangeParams();
    resetBreaks(); // Clear existing data
    fetchBreakHistory(dateParams, true);
  }, [dateRange, startDate, endDate, fetchBreakHistory, resetBreaks]); // Remove getDateRangeParams from dependencies

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const dateParams = getDateRangeParams();
      fetchBreakHistory(dateParams, false);
    }
  };

  const getTotalBreakTime = (): number => {
    return breaks.reduce((total, breakItem) => {
      return total + calculateDuration(breakItem.start_time, breakItem.end_time);
    }, 0);
  };

  const getBreakTypeColor = (breakType: string): string => {
    switch (breakType) {
      case 'lunch':
        return 'bg-blue-100 text-blue-800';
      case 'short':
        return 'bg-green-100 text-green-800';
      case 'personal':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Break History</h2>
        <div className="text-sm text-gray-600">
          Total: {formatDuration(getTotalBreakTime())}
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {(['today', 'week', 'month', 'custom'] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => handleDateRangeChange(range)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                dateRange === range
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>

        {dateRange === 'custom' && (
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
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
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Break List */}
      <div className="space-y-3">
        {breaks.length === 0 && !loading ? (
          <div className="text-center py-8 text-gray-500">
            No breaks found for the selected period.
          </div>
        ) : (
          breaks.map((breakItem) => {
            const duration = calculateDuration(breakItem.start_time, breakItem.end_time);
            const isActive = !breakItem.end_time;
            
            return (
              <div
                key={breakItem.id}
                className={`border rounded-lg p-4 ${
                  isActive ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          getBreakTypeColor(breakItem.break_type)
                        }`}
                      >
                        {breakItem.break_type.charAt(0).toUpperCase() + breakItem.break_type.slice(1)}
                      </span>
                      {isActive && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Active
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Date:</span>{' '}
                      {format(parseISO(breakItem.start_time), 'MMM dd, yyyy')}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Time:</span>{' '}
                      {format(parseISO(breakItem.start_time), 'HH:mm')}
                      {breakItem.end_time && (
                        <> - {format(parseISO(breakItem.end_time), 'HH:mm')}</>
                      )}
                    </div>
                    
                    {breakItem.notes && (
                      <div className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Notes:</span> {breakItem.notes}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-800">
                      {isActive ? (
                        <span className="text-blue-600">In Progress</span>
                      ) : (
                        formatDuration(duration)
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Load More Button */}
      {hasMore && breaks.length > 0 && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && breaks.length === 0 && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <div className="mt-2 text-gray-600">Loading break history...</div>
        </div>
      )}
    </div>
  );
};

export default BreakHistory;