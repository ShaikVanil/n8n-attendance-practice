import React, { useState, useEffect } from 'react';
import { CheckInRequest } from '../../types/attendance';
import { useAuthStore } from '../../stores/authStore';
import OfficeLocationsDropdown from '../OfficeLocationsDropdown';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

interface AttendanceFormProps {
  onSubmit: (checkInData: CheckInRequest) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  error?: string | null;
}

const AttendanceForm: React.FC<AttendanceFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
  error = null,
}) => {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    locationId: user?.preferredLocationId || '',
    notes: '',
    overrideReason: '',
    autoFailureReason: '',
  });
  const [isManualOverride, setIsManualOverride] = useState(false);

  useEffect(() => {
    if (user?.preferredLocationId) {
      setFormData(prev => ({ ...prev, locationId: user.preferredLocationId || '' }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.locationId) {
      return;
    }

    const checkInData: CheckInRequest = {
      checkInType: isManualOverride ? 'manual' : 'automatic', // Changed from 'type' to 'checkInType'
      location: formData.locationId, // Fixed: changed from 'checkInLocation' to 'location'
      notes: formData.notes || undefined,
      // Remove these properties as they don't exist in CheckInRequest interface:
      // is_manual_override: isManualOverride,
      // override_reason: isManualOverride ? formData.overrideReason : undefined,
      // auto_failure_reason: isManualOverride ? formData.autoFailureReason : undefined,
    };

    await onSubmit(checkInData);
  };

  const handleLocationSelect = (locationId: string) => {
    setFormData(prev => ({ ...prev, locationId }));
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>
          {isManualOverride ? 'Manual Override Check-in' : 'Manual Check-in'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              {error}
            </Alert>
          )}

          {/* Office Location Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Office Location *
            </label>
            <OfficeLocationsDropdown
              value={formData.locationId}
              onValueChange={handleLocationSelect}
              placeholder="Select your office location"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Your attendance will be recorded for this location.
            </p>
          </div>

          {/* Manual Override Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="manualOverride"
              checked={isManualOverride}
              onChange={(e) => setIsManualOverride(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={loading}
            />
            <label htmlFor="manualOverride" className="text-sm text-gray-700">
              This is a manual override (automatic check-in failed)
            </label>
          </div>

          {/* Manual Override Fields */}
          {isManualOverride && (
            <div className="space-y-4 p-4 bg-orange-50 rounded-md border border-orange-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Manual Override *
                </label>
                <textarea
                  value={formData.overrideReason}
                  onChange={(e) => setFormData(prev => ({ ...prev, overrideReason: e.target.value }))}
                  placeholder="Explain why automatic check-in failed or why manual override is needed (minimum 10 characters)"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required={isManualOverride}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.overrideReason.length}/10 characters minimum
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Automatic Check-in Failure Details (Optional)
                </label>
                <textarea
                  value={formData.autoFailureReason}
                  onChange={(e) => setFormData(prev => ({ ...prev, autoFailureReason: e.target.value }))}
                  placeholder="Describe any technical issues with automatic detection"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional notes for this check-in"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              disabled={loading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading || !formData.locationId || (isManualOverride && formData.overrideReason.length < 10)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Checking In...' : 'Check In'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AttendanceForm;