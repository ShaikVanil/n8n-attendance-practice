import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import DailyTimesheetList from './DailyTimesheetList';

const DailyTimesheetPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate(current => 
      direction === 'prev' ? subDays(current, 1) : addDays(current, 1)
    );
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Date Navigation Header */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="text-lg font-semibold hover:text-blue-600"
              >
                {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
              </button>
            </div>
            
            <button
              onClick={() => navigateDate('next')}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Today
          </button>
        </div>
        
        {/* Date Picker */}
        {showDatePicker && (
          <div className="mt-4">
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                setSelectedDate(new Date(e.target.value));
                setShowDatePicker(false);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        )}
      </div>
      
      {/* Daily Timesheet List */}
      <DailyTimesheetList 
        date={format(selectedDate, 'yyyy-MM-dd')} 
      />
    </div>
  );
};

export default DailyTimesheetPage;