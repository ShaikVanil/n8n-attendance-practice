import React, { useEffect, useState } from 'react';
import { useAttendanceStore } from '../stores/attendanceStore';
import { useDeviceStore } from '../stores/deviceStore';
import { CheckInRequest, CheckOutRequest } from '../types/attendance';
import { attendanceService } from '../services/attendanceService';
import BreakManagement from './BreakManagement';
import BreakHistory from './BreakHistory';
import OfficeLocationsDropdown from './OfficeLocationsDropdown';
import CheckInStatusDashboard from './CheckInStatusDashboard';
import SmartClockIn from './SmartClockIn';
import ConnectivityStatusDashboard from './ConnectivityStatusDashboard';

const AttendanceDashboard: React.FC = () => {
  const {
    status,
    loading,
    error,
    fetchStatus,
    checkIn,
    checkOut,
    clearError,
  } = useAttendanceStore();
  
  const { devices, fetchDevices } = useDeviceStore();
  
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [locationId, setLocationId] = useState<string>('');
  const [showManualOverride, setShowManualOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [autoFailureReason, setAutoFailureReason] = useState('');
  const [showTraditionalClockIn, setShowTraditionalClockIn] = useState(false);

  useEffect(() => {
    fetchStatus();
    fetchDevices();
  }, [fetchStatus, fetchDevices]);

  const handleCheckIn = async (type: 'automatic' | 'manual') => {
    const checkInData: CheckInRequest = {
      checkInType: type,
      notes: notes || undefined,
      location: locationId || undefined, // Fixed: changed from checkInLocation to location
    };

    if (type === 'automatic' && selectedDevice) {
      checkInData.deviceId = selectedDevice;
    }

    await checkIn(checkInData);
    setNotes('');
    setLocationId('');
  };

  const handleCheckOut = async (type: 'automatic' | 'manual') => {
    const checkOutData: CheckOutRequest = {
      checkOutType: type,
      notes: notes || undefined,
      checkOutLocation: locationId || undefined,
    };

    await checkOut(checkOutData);
    setNotes('');
    setLocationId('');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleManualOverride = async () => {
    if (!overrideReason.trim() || overrideReason.trim().length < 10) {
      alert('Please provide a detailed reason (at least 10 characters)');
      return;
    }

    try {
      await attendanceService.manualOverride({
        reason: overrideReason.trim(),
        auto_failure_reason: autoFailureReason.trim() || undefined,
        location: locationId || undefined,
        notes: notes || undefined
      });
      
      setShowManualOverride(false);
      setOverrideReason('');
      setAutoFailureReason('');
      setNotes('');
      setLocationId('');
      
      // Refresh status
      await fetchStatus();
      
    } catch (error: any) {
      console.error('Manual override failed:', error);
      alert(error.response?.data?.error || 'Manual override failed');
    }
  };

  const handleBreakUpdate = () => {
    fetchStatus(); // Refresh status when break is updated
  };

  if (loading && !status) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Attendance Dashboard</h1>
      
      {/* Keep only one connectivity status component */}
      <ConnectivityStatusDashboard className="mb-6" />
      
      <CheckInStatusDashboard />
      
      {/* Keep only one SmartClockIn component */}
      {!status?.is_checked_in && (
        <div className="space-y-4">
          <SmartClockIn className="mb-6" />
          
          {/* Traditional Clock-In Toggle */}
          <div className="text-center">
            <button
              onClick={() => setShowTraditionalClockIn(!showTraditionalClockIn)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {showTraditionalClockIn ? 'Hide' : 'Show'} Traditional Check-in Options
            </button>
          </div>
        </div>
      )}

      {/* Traditional Check-in/Check-out Form */}
      {(showTraditionalClockIn || status?.is_checked_in) && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {status?.is_checked_in ? 'Check Out' : 'Traditional Check In'}
          </h2>
          
          <div className="space-y-4">
            {/* Device Selection for Auto Check-in */}
            {!status?.is_checked_in && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Device (for automatic check-in)
                </label>
                <select
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a device...</option>
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.deviceName} ({device.deviceType})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Location Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Office Location (optional)
              </label>
              <OfficeLocationsDropdown
                value={locationId}
                onValueChange={setLocationId}
                placeholder="Select office location"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add any notes about your check-in/check-out..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-4">
              {status?.is_checked_in ? (
                <>
                  <button
                    onClick={() => handleCheckOut('automatic')}
                    disabled={loading}
                    className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Auto Check Out'}
                  </button>
                  <button
                    onClick={() => handleCheckOut('manual')}
                    disabled={loading}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Manual Check Out'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleCheckIn('automatic')}
                    disabled={loading || !selectedDevice}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Auto Check In'}
                  </button>
                  <button
                    onClick={() => handleCheckIn('manual')}
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Manual Check In'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rest of existing components... */}
      {/* Break Management Section - Only show when checked in */}
      {status?.is_checked_in && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Break Management</h2>
          <BreakManagement onBreakUpdate={handleBreakUpdate} />
        </div>
      )}

      {/* Break History Section */}
      <BreakHistory className="mt-6" />

      {/* Manual Override Section */}
      {showManualOverride && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Manual Override</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Override Reason *
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={3}
                placeholder="Provide a detailed reason for manual override (minimum 10 characters)..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto Check-in Failure Reason (optional)
              </label>
              <input
                type="text"
                value={autoFailureReason}
                onChange={(e) => setAutoFailureReason(e.target.value)}
                placeholder="Why did automatic check-in fail?"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={handleManualOverride}
                disabled={loading || !overrideReason.trim() || overrideReason.trim().length < 10}
                className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Submit Override'}
              </button>
              <button
                onClick={() => setShowManualOverride(false)}
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceDashboard;
