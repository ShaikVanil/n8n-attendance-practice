import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, CalendarDays } from 'lucide-react';
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay, isSameMonth, isToday, parseISO } from 'date-fns';

interface EnhancedDatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onDateRangeChange?: (startDate: Date, endDate: Date) => void;
  showQuickShortcuts?: boolean;
  showCalendar?: boolean;
  datesWithData?: string[]; // Array of date strings that have timesheet data
  className?: string;
}

interface DateShortcut {
  label: string;
  getValue: () => Date | { start: Date; end: Date };
  isRange?: boolean;
}

const EnhancedDatePicker: React.FC<EnhancedDatePickerProps> = ({
  selectedDate,
  onDateChange,
  onDateRangeChange,
  showQuickShortcuts = true,
  showCalendar = true,
  datesWithData = [],
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(selectedDate);
  const [rangeMode, setRangeMode] = useState(false);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const shortcuts: DateShortcut[] = [
    { label: 'Today', getValue: () => new Date() },
    { label: 'Yesterday', getValue: () => subDays(new Date(), 1) },
    { label: 'This Week', getValue: () => ({ start: startOfWeek(new Date()), end: endOfWeek(new Date()) }), isRange: true },
    { label: 'Last Week', getValue: () => ({ start: startOfWeek(subDays(new Date(), 7)), end: endOfWeek(subDays(new Date(), 7)) }), isRange: true },
    { label: 'This Month', getValue: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }), isRange: true },
    { label: 'Last Month', getValue: () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) }), isRange: true }
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          setIsOpen(false);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          onDateChange(subDays(selectedDate, 1));
          break;
        case 'ArrowRight':
          event.preventDefault();
          onDateChange(addDays(selectedDate, 1));
          break;
        case 'ArrowUp':
          event.preventDefault();
          onDateChange(subDays(selectedDate, 7));
          break;
        case 'ArrowDown':
          event.preventDefault();
          onDateChange(addDays(selectedDate, 7));
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedDate, onDateChange]);

  const handleShortcutClick = (shortcut: DateShortcut) => {
    const value = shortcut.getValue();
    if (shortcut.isRange && onDateRangeChange && typeof value === 'object' && 'start' in value) {
      onDateRangeChange(value.start, value.end);
      setRangeMode(true);
      setRangeStart(value.start);
      setRangeEnd(value.end);
    } else if (!shortcut.isRange && value instanceof Date) {
      onDateChange(value);
      setRangeMode(false);
      setRangeStart(null);
      setRangeEnd(null);
    }
    setIsOpen(false);
  };

  const handleDateClick = (date: Date) => {
    if (rangeMode && rangeStart && !rangeEnd) {
      const start = date < rangeStart ? date : rangeStart;
      const end = date < rangeStart ? rangeStart : date;
      setRangeEnd(end);
      if (onDateRangeChange) {
        onDateRangeChange(start, end);
      }
    } else {
      onDateChange(date);
      setRangeMode(false);
      setRangeStart(null);
      setRangeEnd(null);
      setIsOpen(false);
    }
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days = [];
    let day = calendarStart;

    while (day <= calendarEnd) {
      const currentDay = day;
      const isCurrentMonth = isSameMonth(currentDay, currentMonth);
      const isSelected = isSameDay(currentDay, selectedDate);
      const isCurrentDay = isToday(currentDay);
      const hasData = datesWithData.includes(format(currentDay, 'yyyy-MM-dd'));
      const isInRange = rangeStart && rangeEnd && currentDay >= rangeStart && currentDay <= rangeEnd;
      const isRangeStart = rangeStart && isSameDay(currentDay, rangeStart);
      const isRangeEnd = rangeEnd && isSameDay(currentDay, rangeEnd);

      days.push(
        <button
          key={currentDay.toISOString()}
          onClick={() => handleDateClick(currentDay)}
          className={`
            w-8 h-8 text-sm rounded-md transition-colors relative
            ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
            ${isSelected ? 'bg-blue-600 text-white' : ''}
            ${isCurrentDay && !isSelected ? 'bg-blue-100 text-blue-600 font-semibold' : ''}
            ${isInRange && !isSelected ? 'bg-blue-50' : ''}
            ${(isRangeStart || isRangeEnd) && !isSelected ? 'bg-blue-200' : ''}
            ${!isSelected && !isCurrentDay && !isInRange ? 'hover:bg-gray-100' : ''}
          `}
        >
          {format(currentDay, 'd')}
          {hasData && (
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full transform translate-x-1 translate-y-1"></div>
          )}
        </button>
      );
      day = addDays(day, 1);
    }

    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="font-semibold">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="text-xs font-medium text-gray-500 text-center p-2">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Calendar className="w-5 h-5 text-blue-600" />
        <span className="font-medium">
          {rangeMode && rangeStart && rangeEnd
            ? `${format(rangeStart, 'MMM dd')} - ${format(rangeEnd, 'MMM dd')}`
            : format(selectedDate, 'EEEE, MMMM dd, yyyy')
          }
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-80">
          {showQuickShortcuts && (
            <div className="border-b border-gray-200 p-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Select</h4>
              <div className="grid grid-cols-2 gap-2">
                {shortcuts.map((shortcut) => (
                  <button
                    key={shortcut.label}
                    onClick={() => handleShortcutClick(shortcut)}
                    className="text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    {shortcut.label}
                  </button>
                ))}
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    setRangeMode(!rangeMode);
                    setRangeStart(null);
                    setRangeEnd(null);
                  }}
                  className={`text-sm px-3 py-1 rounded-md transition-colors ${
                    rangeMode ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <CalendarDays className="w-4 h-4 inline mr-1" />
                  {rangeMode ? 'Single Date' : 'Date Range'}
                </button>
              </div>
            </div>
          )}
          
          {showCalendar && renderCalendar()}
        </div>
      )}
    </div>
  );
};

export default EnhancedDatePicker;