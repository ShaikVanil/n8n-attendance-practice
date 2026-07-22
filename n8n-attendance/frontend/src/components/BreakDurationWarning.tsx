import React from 'react';
import { useBreakDurationMonitor } from '../hooks/useBreakDurationMonitor';

const BreakDurationWarning: React.FC = () => {
  const { status } = useBreakDurationMonitor();

  if (!status?.has_active_break) {
    return null;
  }

  const { elapsed_minutes = 0, remaining_minutes = 0, is_overtime, break_type, warning_threshold = 0 } = status;
  const showWarning = elapsed_minutes >= warning_threshold;

  if (!showWarning && !is_overtime) {
    return null;
  }

  return (
    <div className={`p-4 rounded-lg mb-4 ${
      is_overtime ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
    }`}>
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${
          is_overtime ? 'bg-red-500' : 'bg-yellow-500'
        }`}></div>
        <div>
          <p className={`font-medium ${
            is_overtime ? 'text-red-800' : 'text-yellow-800'
          }`}>
            {is_overtime ? 'Break Time Exceeded!' : 'Break Time Warning'}
          </p>
          <p className={`text-sm ${
            is_overtime ? 'text-red-600' : 'text-yellow-600'
          }`}>
            {is_overtime 
              ? `Your ${break_type} break has exceeded the time limit by ${elapsed_minutes - (status.max_duration_minutes || 0)} minutes.`
              : `Your ${break_type} break will end in ${remaining_minutes} minutes.`
            }
          </p>
          {is_overtime && (
            <p className="text-sm text-red-600 mt-1">
              Please end your break to avoid automatic termination.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BreakDurationWarning;