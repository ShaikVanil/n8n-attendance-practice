import React, { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService';

interface NotificationPreferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  realTimeEnabled: boolean;
  checkInConfirmation: boolean;
  checkOutConfirmation: boolean;
  autoCheckInFailure: boolean;
  policyViolations: boolean;
  deviceApproval: boolean;
}

export const NotificationPreferences: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError(null);
      const prefs = await notificationService.getUserPreferences();
      setPreferences(prefs);
    } catch (error: any) {
      console.error('Failed to load preferences:', error);
      setError('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preferences) return;
    
    try {
      setSaving(true);
      setError(null);
      await notificationService.updateUserPreferences(preferences);
      alert('Preferences saved successfully!');
    } catch (error: any) {
      console.error('Failed to save preferences:', error);
      setError('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [field]: value });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading notification preferences...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button 
                  onClick={loadPreferences}
                  className="bg-red-100 px-3 py-1 rounded text-sm text-red-800 hover:bg-red-200"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!preferences) {
    return <div className="p-4">Error loading preferences</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Notification Preferences</h2>
      
      {/* Channel Preferences */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Notification Channels</h3>
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.emailEnabled}
              onChange={(e) => handleChange('emailEnabled', e.target.checked)}
              className="mr-3"
            />
            <span>Email Notifications</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.smsEnabled}
              onChange={(e) => handleChange('smsEnabled', e.target.checked)}
              className="mr-3"
            />
            <span>SMS Notifications</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.realTimeEnabled}
              onChange={(e) => handleChange('realTimeEnabled', e.target.checked)}
              className="mr-3"
            />
            <span>Real-time Notifications</span>
          </label>
        </div>
      </div>

      {/* Event Preferences */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Notification Types</h3>
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.checkInConfirmation}
              onChange={(e) => handleChange('checkInConfirmation', e.target.checked)}
              className="mr-3"
            />
            <span>Check-in Confirmations</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.checkOutConfirmation}
              onChange={(e) => handleChange('checkOutConfirmation', e.target.checked)}
              className="mr-3"
            />
            <span>Check-out Confirmations</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.autoCheckInFailure}
              onChange={(e) => handleChange('autoCheckInFailure', e.target.checked)}
              className="mr-3"
            />
            <span>Automatic Check-in Failures</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.deviceApproval}
              onChange={(e) => handleChange('deviceApproval', e.target.checked)}
              className="mr-3"
            />
            <span>Device Approval Updates</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.policyViolations}
              onChange={(e) => handleChange('policyViolations', e.target.checked)}
              className="mr-3"
            />
            <span>Policy Violations</span>
          </label>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>
    </div>
  );
};