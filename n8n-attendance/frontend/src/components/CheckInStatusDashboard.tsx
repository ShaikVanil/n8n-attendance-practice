import React, { useEffect, useState } from 'react';
import { useAttendanceStore } from '../stores/attendanceStore';
import { AttendanceStatus } from '../types/attendance';

interface CheckInStatusDashboardProps {
  className?: string;
  showDetailedView?: boolean;
}

const CheckInStatusDashboard: React.FC<CheckInStatusDashboardProps> = ({ 
  className = '', 
  showDetailedView = true 
}) => {
  const { status, loading, error, fetchStatus } = useAttendanceStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Fetch status on component mount and refresh every 2 minutes (reduced from 5)
  useEffect(() => {
    fetchStatus();
    const refreshTimer = setInterval(() => {
      fetchStatus(); // This will use cache if recent
    }, 2 * 60 * 1000); // Reduced to 2 minutes
    return () => clearInterval(refreshTimer);
  }, [fetchStatus]);

  const formatTime = (dateString: string | Date) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateWorkingHours = () => {
    if (!status?.current_session?.checkInTime) return '0:00';
    
    const checkInTime = new Date(status.current_session.checkInTime);
    const now = new Date();
    const diffMs = now.getTime() - checkInTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (status?.current_break) return 'bg-yellow-500';
    if (status?.is_checked_in) return 'bg-green-500';
    return 'bg-gray-400';
  };

  const getStatusText = () => {
    if (status?.current_break) {
      return `On ${status.current_break.break_type} Break`;
    }
    if (status?.is_checked_in) {
      return status?.overtime_status?.is_overtime ? 'Working (Overtime)' : 'Working';
    }
    return 'Not Checked In';
  };

  if (loading && !status) {
    return (
      <div className={`flex justify-center items-center h-32 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="text-red-800 text-sm">
          <p className="font-medium">Error loading status</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Current Status Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Check-in Status</h2>
          <div className="text-sm text-gray-500">
            {formatDate(currentTime)} • {formatTime(currentTime)}
          </div>
        </div>
        
        {/* Status Indicator */}
        <div className="flex items-center space-x-4 mb-6">
          <div className={`w-4 h-4 rounded-full ${getStatusColor()}`}></div>
          <div>
            <p className="text-xl font-semibold text-gray-900">{getStatusText()}</p>
            {status?.is_checked_in && status?.current_session && (
              <p className="text-sm text-gray-600">
                Since {formatTime(status.current_session.checkInTime)} • 
                {calculateWorkingHours()} hours worked
              </p>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {status?.today_total_hours ? status.today_total_hours.toFixed(1) : '0.0'}
            </div>
            <div className="text-sm text-gray-600">Hours Today</div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {status?.today_breaks?.length || 0}
            </div>
            <div className="text-sm text-gray-600">Breaks Taken</div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {status?.is_checked_in ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-600">Checked In</div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {status?.overtime_status?.overtime_hours?.toFixed(1) || '0.0'}
            </div>
            <div className="text-sm text-gray-600">Overtime</div>
          </div>
        </div>
      </div>

      {/* Today's Attendance Summary */}
      {showDetailedView && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Summary</h3>
          
          {status?.current_session ? (
            <div className="space-y-4">
              {/* Check-in Details */}
              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">Checked In</p>
                    <p className="text-sm text-gray-600">
                      {formatTime(status.current_session.checkInTime)} • 
                      {status.current_session.checkInType} check-in
                    </p>
                    {status.current_session.checkInLocation && (
                      <p className="text-sm text-gray-500">
                        Location: {status.current_session.checkInLocation}
                      </p>
                    )}
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
              </div>

              {/* Break Summary */}
              {status.today_breaks && status.today_breaks.length > 0 && (
                <div className="border-l-4 border-yellow-500 pl-4">
                  <p className="font-medium text-gray-900">Breaks Today</p>
                  <div className="space-y-2 mt-2">
                    {status.today_breaks.map((breakItem, index) => {
                      const duration = breakItem.end_time && breakItem.start_time 
                        ? Math.round((new Date(breakItem.end_time).getTime() - new Date(breakItem.start_time).getTime()) / (1000 * 60))
                        : null;
                      
                      return (
                        <div key={index} className="text-sm text-gray-600">
                          <span className="capitalize">{breakItem.break_type}</span> • 
                          {formatTime(breakItem.start_time)}
                          {breakItem.end_time ? (
                            <span> - {formatTime(breakItem.end_time)} ({duration} min)</span>
                          ) : (
                            <span className="text-yellow-600 font-medium"> (In Progress)</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Overtime Status */}
              {status.overtime_status?.is_overtime && (
                <div className="border-l-4 border-orange-500 pl-4">
                  <p className="font-medium text-gray-900">Overtime Status</p>
                  <p className="text-sm text-gray-600">
                    Started at {status.overtime_status.overtime_start_time ? formatTime(status.overtime_status.overtime_start_time) : 'N/A'} • 
                    {status.overtime_status.overtime_hours?.toFixed(2)} hours • 
                    {status.overtime_status.overtime_multiplier}x rate
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-gray-500">No check-in recorded for today</p>
              <p className="text-sm text-gray-400">Check in to start tracking your attendance</p>
            </div>
          )}
        </div>
      )}

      {/* Overtime Warning */}
      {status?.overtime_limit_check && !status.overtime_limit_check.is_within_limit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-red-800">Overtime Limit Exceeded</h4>
              <p className="text-sm text-red-700 mt-1">
                You have worked {status.overtime_limit_check.current_overtime_hours?.toFixed(2)} overtime hours. 
                Maximum allowed: {status.overtime_limit_check.max_overtime_hours} hours.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckInStatusDashboard;