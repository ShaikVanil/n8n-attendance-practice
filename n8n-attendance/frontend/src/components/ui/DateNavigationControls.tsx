import React from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Calendar } from 'lucide-react';
import { format, addDays, subDays, addWeeks, subWeeks } from 'date-fns';

interface DateNavigationControlsProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  showWeekNavigation?: boolean;
  showTodayButton?: boolean;
  className?: string;
}

const DateNavigationControls: React.FC<DateNavigationControlsProps> = ({
  selectedDate,
  onDateChange,
  showWeekNavigation = true,
  showTodayButton = true,
  className = ''
}) => {
  const navigateDate = (direction: 'prev' | 'next', unit: 'day' | 'week' = 'day') => {
    const days = unit === 'week' ? 7 : 1;
    const newDate = direction === 'prev' 
      ? subDays(selectedDate, days)
      : addDays(selectedDate, days);
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Week Navigation */}
      {showWeekNavigation && (
        <>
          <button
            onClick={() => navigateDate('prev', 'week')}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            title="Previous Week (Shift + ←)"
          >
            <div className="flex items-center">
              <ChevronLeft className="w-4 h-4" />
              <ChevronLeft className="w-4 h-4 -ml-2" />
            </div>
          </button>
        </>
      )}
      
      {/* Day Navigation */}
      <button
        onClick={() => navigateDate('prev')}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        title="Previous Day (←)"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      
      <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-md min-w-48">
        <Calendar className="w-4 h-4 text-blue-600" />
        <span className="font-medium text-gray-900">
          {format(selectedDate, 'EEE, MMM dd, yyyy')}
        </span>
      </div>
      
      <button
        onClick={() => navigateDate('next')}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        title="Next Day (→)"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
      
      {/* Week Navigation */}
      {showWeekNavigation && (
        <button
          onClick={() => navigateDate('next', 'week')}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          title="Next Week (Shift + →)"
        >
          <div className="flex items-center">
            <ChevronRight className="w-4 h-4" />
            <ChevronRight className="w-4 h-4 -ml-2" />
          </div>
        </button>
      )}
      
      {/* Today Button */}
      {showTodayButton && (
        <button
          onClick={goToToday}
          className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          title="Go to Today (T)"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Today</span>
        </button>
      )}
    </div>
  );
};

export default DateNavigationControls;