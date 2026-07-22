import React, { useState } from 'react';
import { Break, StartBreakRequest, EndBreakRequest } from '../types/attendance';
import { breakService } from '../services/breakService';
import BreakDurationWarning from './BreakDurationWarning';

interface BreakManagementProps {
  currentBreak?: Break;
  todayBreaks?: Break[];
  onBreakUpdate: () => void;
}

const BreakManagement: React.FC<BreakManagementProps> = ({
  currentBreak,
  todayBreaks = [],
  onBreakUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBreakType, setSelectedBreakType] = useState<'lunch' | 'short' | 'personal'>('short');
  const [notes, setNotes] = useState('');
  const [showBreakHistory, setShowBreakHistory] = useState(false);

  const breakTypes = [
    { value: 'short', label: 'Short Break (15 min)', maxDuration: 15 },
    { value: 'lunch', label: 'Lunch Break (60 min)', maxDuration: 60 },
    { value: 'personal', label: 'Personal Break (30 min)', maxDuration: 30 },
  ];

  const handleStartBreak = async () => {
    if (currentBreak) {
      setError('You already have an active break. Please end it first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request: StartBreakRequest = {
        break_type: selectedBreakType,
        notes: notes || undefined,
      };

      await breakService.startBreak(request);
      setNotes('');
      onBreakUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start break');
    } finally {
      setLoading(false);
    }
  };

  const handleEndBreak = async () => {
    if (!currentBreak) {
      setError('No active break to end.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request: EndBreakRequest = {
        notes: notes || undefined,
      };

      await breakService.endBreak(request);
      setNotes('');
      onBreakUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end break');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getCurrentBreakDuration = (): number => {
    if (!currentBreak) return 0;
    const startTime = new Date(currentBreak.start_time);
    const now = new Date();
    return Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
  };

  const getTotalBreakTimeToday = (): number => {
    return todayBreaks.reduce((total, breakItem) => {
      return total + (breakItem.duration_minutes || 0);
    }, 0) + (currentBreak ? getCurrentBreakDuration() : 0);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Break Management</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right text-red-700 hover:text-red-900"
          >
            ×
          </button>
        </div>
      )}

      {/* Current Break Status */}
      {currentBreak ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <h3 className="font-medium text-yellow-800 mb-2">Active Break</h3>
          <div className="text-sm text-yellow-700">
            <p><strong>Type:</strong> {currentBreak.break_type.charAt(0).toUpperCase() + currentBreak.break_type.slice(1)}</p>
            <p><strong>Started:</strong> {new Date(currentBreak.start_time).toLocaleTimeString()}</p>
            <p><strong>Duration:</strong> {formatDuration(getCurrentBreakDuration())}</p>
            {currentBreak.notes && <p><strong>Notes:</strong> {currentBreak.notes}</p>}
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-green-700">No active break</p>
        </div>
      )}

      {/* Break Duration Warning - Add this section */}
      <BreakDurationWarning />

      {/* Break Controls */}
      <div className="space-y-4">
        {!currentBreak ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Break Type
              </label>
              <select
                value={selectedBreakType}
                onChange={(e) => setSelectedBreakType(e.target.value as 'lunch' | 'short' | 'personal')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {breakTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about your break..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <button
              onClick={handleStartBreak}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Starting Break...' : 'Start Break'}
            </button>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Break Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about ending your break..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <button
              onClick={handleEndBreak}
              disabled={loading}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Ending Break...' : 'End Break'}
            </button>
          </>
        )}
      </div>

      {/* Today's Break Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="font-medium text-gray-800 mb-3">Today's Break Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-gray-600">Total Breaks</p>
            <p className="font-semibold text-lg">{todayBreaks.length + (currentBreak ? 1 : 0)}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-gray-600">Total Time</p>
            <p className="font-semibold text-lg">{formatDuration(getTotalBreakTimeToday())}</p>
          </div>
        </div>
      </div>

      {/* Today's Breaks List */}
      {todayBreaks.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowBreakHistory(!showBreakHistory)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {showBreakHistory ? 'Hide' : 'Show'} Today's Breaks
          </button>
          
          {showBreakHistory && (
            <div className="mt-3 space-y-2">
              {todayBreaks.map((breakItem) => (
                <div key={breakItem.id} className="bg-gray-50 p-3 rounded text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium capitalize">{breakItem.break_type} Break</p>
                      <p className="text-gray-600">
                        {new Date(breakItem.start_time).toLocaleTimeString()} - 
                        {breakItem.end_time ? new Date(breakItem.end_time).toLocaleTimeString() : 'Ongoing'}
                      </p>
                      {breakItem.notes && (
                        <p className="text-gray-600 mt-1">{breakItem.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {breakItem.duration_minutes ? formatDuration(breakItem.duration_minutes) : 'Ongoing'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BreakManagement;