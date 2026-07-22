import React, { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react';
import { dailyTimesheetService } from '../services/dailyTimesheetService';
import { DailyTimesheet, DailyTimesheetSummary } from '../types/timesheet';

interface DailySummaryProps {
  date: string;
  timesheets?: DailyTimesheet[];
  onRefresh?: () => void;
}

interface TaskSummary {
  taskName: string;
  hours: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  projectCode?: string;
}

const DailySummary: React.FC<DailySummaryProps> = ({ date, timesheets, onRefresh }) => {
  const [summary, setSummary] = useState<DailyTimesheetSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (timesheets) {
      // Calculate summary from provided timesheets
      calculateLocalSummary(timesheets);
    } else {
      // Fetch summary from API
      loadSummary();
    }
  }, [date, timesheets]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const summaryData = await dailyTimesheetService.getDailySummary(date);
      setSummary(summaryData);
    } catch (err: any) {
      setError(err.message || 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  const calculateLocalSummary = (timesheetList: DailyTimesheet[]) => {
    if (timesheetList.length === 0) {
      setSummary(null);
      return;
    }

    const totalHours = timesheetList.reduce((sum, ts) => sum + ts.workHours, 0);
    const tasks = timesheetList.map(ts => ts.taskName).join(', ');
    
    // Find earliest start and latest end times
    const startTimes = timesheetList
      .filter(ts => ts.startTime)
      .map(ts => ts.startTime!)
      .sort();
    const endTimes = timesheetList
      .filter(ts => ts.endTime)
      .map(ts => ts.endTime!)
      .sort();
    
    // Determine overall status
    const statuses = timesheetList.map(ts => ts.status);
    let overallStatus: 'draft' | 'submitted' | 'approved' | 'rejected';
    
    if (statuses.every(s => s === 'approved')) {
      overallStatus = 'approved';
    } else if (statuses.some(s => s === 'rejected')) {
      overallStatus = 'rejected';
    } else if (statuses.every(s => s === 'submitted' || s === 'approved')) {
      overallStatus = 'submitted';
    } else {
      overallStatus = 'draft';
    }

    setSummary({
      userId: timesheetList[0].userId,
      date,
      totalEntries: timesheetList.length,
      totalHours,
      tasks,
      earliestStart: startTimes[0],
      latestEnd: endTimes[endTimes.length - 1],
      overallStatus
    });
  };

  const getTaskSummaries = (): TaskSummary[] => {
    if (!timesheets) return [];
    
    return timesheets.map(ts => ({
      taskName: ts.taskName,
      hours: ts.workHours,
      status: ts.status,
      projectCode: ts.projectCode
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'submitted':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Calendar className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return 'N/A';
    return new Date(`2000-01-01T${time}:00`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading summary...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600 text-center py-4">
          <AlertCircle className="w-6 h-6 mx-auto mb-2" />
          <p>{error}</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="mt-2 text-blue-600 hover:text-blue-800 underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Timesheets</h3>
          <p>No timesheet entries found for {formatDate(date)}</p>
        </div>
      </div>
    );
  }

  const taskSummaries = getTaskSummaries();

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Daily Summary</h2>
              <p className="text-sm text-gray-600">{formatDate(date)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(summary.overallStatus)}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(summary.overallStatus)}`}>
              {summary.overallStatus.charAt(0).toUpperCase() + summary.overallStatus.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{summary.totalHours.toFixed(1)}</div>
            <div className="text-sm text-gray-600">Total Hours</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{summary.totalEntries}</div>
            <div className="text-sm text-gray-600">Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{formatTime(summary.earliestStart)}</div>
            <div className="text-sm text-gray-600">First Start</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{formatTime(summary.latestEnd)}</div>
            <div className="text-sm text-gray-600">Last End</div>
          </div>
        </div>
      </div>

      {/* Task Breakdown */}
      {taskSummaries.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <h3 className="text-md font-medium text-gray-900 mb-3">Task Breakdown</h3>
          <div className="space-y-2">
            {taskSummaries.map((task, index) => (
              <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-3">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{task.taskName}</div>
                    {task.projectCode && (
                      <div className="text-sm text-gray-600">{task.projectCode}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{task.hours.toFixed(1)}h</div>
                    <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                      {task.status}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Daily Progress</span>
          <span className="text-sm text-gray-600">
            {summary.totalHours.toFixed(1)} / 8.0 hours
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              summary.totalHours >= 8
                ? 'bg-green-500'
                : summary.totalHours >= 6
                ? 'bg-yellow-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min((summary.totalHours / 8) * 100, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0h</span>
          <span>4h</span>
          <span>8h</span>
        </div>
      </div>

      {/* Additional Info */}
      {summary.totalHours > 0 && (
        <div className="px-6 py-3 bg-gray-50 rounded-b-lg">
          <div className="text-sm text-gray-600">
            <strong>Tasks:</strong> {summary.tasks}
          </div>
        </div>
      )}
    </div>
  );
};

export default DailySummary;