import React, { useState, useEffect, useCallback } from 'react';
import { format, isToday, isYesterday, isTomorrow } from 'date-fns';
import { Clock, TrendingUp, Calendar, Users } from 'lucide-react';
import DailyTimesheetList from './DailyTimesheetList';
import EnhancedDatePicker from './ui/EnhancedDatePicker';
import DateNavigationControls from './ui/DateNavigationControls';
import { dailyTimesheetService } from '../services/dailyTimesheetService';
import { DailyTimesheet } from '../types/timesheet';

const EnhancedDailyTimesheetPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [timesheets, setTimesheets] = useState<DailyTimesheet[]>([]);
  const [datesWithData, setDatesWithData] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState({ totalHours: 0, daysWorked: 0 });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if not typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 't':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            setSelectedDate(new Date());
          }
          break;
        case 'arrowleft':
          event.preventDefault();
          if (event.shiftKey) {
            // Previous week
            setSelectedDate(prev => new Date(prev.getTime() - 7 * 24 * 60 * 60 * 1000));
          } else {
            // Previous day
            setSelectedDate(prev => new Date(prev.getTime() - 24 * 60 * 60 * 1000));
          }
          break;
        case 'arrowright':
          event.preventDefault();
          if (event.shiftKey) {
            // Next week
            setSelectedDate(prev => new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000));
          } else {
            // Next day
            setSelectedDate(prev => new Date(prev.getTime() + 24 * 60 * 60 * 1000));
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load dates with timesheet data for calendar indicators
  useEffect(() => {
    const loadDatesWithData = async () => {
      try {
        // Load data for current month
        const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        
        const response = await dailyTimesheetService.getDailyTimesheets({
          dateFrom: format(startOfMonth, 'yyyy-MM-dd'),
          dateTo: format(endOfMonth, 'yyyy-MM-dd'),
          limit: 100
        });
        
        const dates = response.timesheets.map((t: DailyTimesheet) => t.date);
        setDatesWithData(Array.from(new Set(dates)));
      } catch (error) {
        console.error('Failed to load dates with data:', error);
      }
    };

    loadDatesWithData();
  }, [selectedDate]);

  // Load weekly stats
  useEffect(() => {
    const loadWeeklyStats = async () => {
      try {
        const startOfWeek = new Date(selectedDate);
        startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        const response = await dailyTimesheetService.getDailyTimesheets({
          dateFrom: format(startOfWeek, 'yyyy-MM-dd'),
          dateTo: format(endOfWeek, 'yyyy-MM-dd'),
          limit: 100
        });
        
        const totalHours = response.timesheets.reduce((sum: number, t: DailyTimesheet) => sum + t.workHours, 0);
        const uniqueDays = new Set(response.timesheets.map((t: DailyTimesheet) => t.date)).size;
        
        setWeeklyStats({ totalHours, daysWorked: uniqueDays });
      } catch (error) {
        console.error('Failed to load weekly stats:', error);
      }
    };

    loadWeeklyStats();
  }, [selectedDate]);

  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(date);
    setDateRange(null);
  }, []);

  const handleDateRangeChange = useCallback((start: Date, end: Date) => {
    setDateRange({ start, end });
    setSelectedDate(start);
  }, []);

  const handleTimesheetsChange = useCallback((newTimesheets: DailyTimesheet[]) => {
    setTimesheets(newTimesheets);
  }, []);

  const getDateDisplayText = () => {
    if (isToday(selectedDate)) return 'Today';
    if (isYesterday(selectedDate)) return 'Yesterday';
    if (isTomorrow(selectedDate)) return 'Tomorrow';
    return format(selectedDate, 'EEEE, MMMM dd, yyyy');
  };

  const totalHoursToday = timesheets.reduce((sum, t) => sum + t.workHours, 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header with Enhanced Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Daily Timesheets</h1>
              <p className="text-gray-600 mt-1">{getDateDisplayText()}</p>
            </div>
            
            <DateNavigationControls
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              className="flex-shrink-0"
            />
          </div>
          
          <EnhancedDatePicker
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            onDateRangeChange={handleDateRangeChange}
            datesWithData={datesWithData}
            className="flex-shrink-0"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Today's Hours</p>
              <p className="text-2xl font-semibold text-gray-900">
                {totalHoursToday.toFixed(1)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">This Week</p>
              <p className="text-2xl font-semibold text-gray-900">
                {weeklyStats.totalHours.toFixed(1)}h
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Days Worked</p>
              <p className="text-2xl font-semibold text-gray-900">
                {weeklyStats.daysWorked}/7
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Keyboard Shortcuts</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-blue-700">
          <div><kbd className="bg-white px-2 py-1 rounded border">T</kbd> Today</div>
          <div><kbd className="bg-white px-2 py-1 rounded border">←/→</kbd> Previous/Next Day</div>
          <div><kbd className="bg-white px-2 py-1 rounded border">Shift + ←/→</kbd> Previous/Next Week</div>
          <div><kbd className="bg-white px-2 py-1 rounded border">Esc</kbd> Close Dialogs</div>
        </div>
      </div>

      {/* Daily Timesheet List */}
      <DailyTimesheetList 
        date={format(selectedDate, 'yyyy-MM-dd')}
        onTimesheetsChange={handleTimesheetsChange}
      />
    </div>
  );
};

export default EnhancedDailyTimesheetPage;