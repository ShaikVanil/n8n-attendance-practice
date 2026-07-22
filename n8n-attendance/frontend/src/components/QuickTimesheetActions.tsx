import React from 'react';
import { Plus, Calendar, Clock } from 'lucide-react';
import { format, subDays } from 'date-fns';

const QuickTimesheetActions: React.FC = () => {
  const today = new Date();
  const yesterday = subDays(today, 1);
  const dayBeforeYesterday = subDays(today, 2);

  const quickAddTimesheet = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    // Navigate to timesheet page with pre-selected date
    window.location.href = `/daily-timesheets?date=${dateStr}`;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium mb-4 flex items-center">
        <Clock className="w-5 h-5 mr-2 text-blue-600" />
        Quick Actions
      </h3>
      
      <div className="space-y-3">
        <button
          onClick={() => quickAddTimesheet(today)}
          className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50"
        >
          <span>Add timesheet for today</span>
          <Plus className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => quickAddTimesheet(yesterday)}
          className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50"
        >
          <span>Add timesheet for yesterday</span>
          <Plus className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => quickAddTimesheet(dayBeforeYesterday)}
          className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50"
        >
          <span>Add timesheet for {format(dayBeforeYesterday, 'MMM dd')}</span>
          <Plus className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => {
            const customDate = prompt('Enter date (YYYY-MM-DD):');
            if (customDate) {
              quickAddTimesheet(new Date(customDate));
            }
          }}
          className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50"
        >
          <span>Add timesheet for custom date</span>
          <Calendar className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default QuickTimesheetActions;