import React, { useState, useEffect } from 'react';
import { locationService, OfficeLocation, CreateLocationTransferRequest } from '../services/locationService';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Alert } from './ui/Alert';

interface LocationTransferRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const LocationTransferRequestForm: React.FC<LocationTransferRequestFormProps> = ({ 
  onSuccess, 
  onCancel 
}) => {
  const [formData, setFormData] = useState<CreateLocationTransferRequest>({
    toLocationId: '',
    reason: '',
    isTemporary: false,
    temporaryEndDate: undefined
  });
  
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [currentLocation, setCurrentLocation] = useState<OfficeLocation | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [locationsData, currentLocationData] = await Promise.all([
        locationService.getOfficeLocations(),
        locationService.getCurrentUserLocation()
      ]);
      setLocations(locationsData);
      setCurrentLocation(currentLocationData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.toLocationId) {
      newErrors.toLocationId = 'Please select a target location';
    }
    
    if (formData.toLocationId === currentLocation?.id) {
      newErrors.toLocationId = 'Target location cannot be the same as current location';
    }
    
    if (!formData.reason.trim()) {
      newErrors.reason = 'Please provide a reason for the transfer';
    }
    
    if (formData.reason.trim().length < 10) {
      newErrors.reason = 'Reason must be at least 10 characters long';
    }
    
    if (formData.isTemporary && !formData.temporaryEndDate) {
      newErrors.temporaryEndDate = 'End date is required for temporary transfers';
    }
    
    if (formData.isTemporary && formData.temporaryEndDate) {
      const endDate = new Date(formData.temporaryEndDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (endDate <= today) {
        newErrors.temporaryEndDate = 'End date must be in the future';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await locationService.requestLocationTransfer(formData);
      setShowSuccess(true);
      
      // Reset form
      setFormData({
        toLocationId: '',
        reason: '',
        isTemporary: false,
        temporaryEndDate: undefined
      });
      
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess?.();
      }, 2000);
    } catch (error: any) {
      setErrors({ submit: error.response?.data?.error || 'Failed to submit transfer request' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof CreateLocationTransferRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Location Transfer</CardTitle>
      </CardHeader>
      <CardContent>
        {showSuccess && (
          <Alert className="mb-4 bg-green-50 border-green-200 text-green-800">
            Transfer request submitted successfully! Your manager will review it shortly.
          </Alert>
        )}
        
        {errors.submit && (
          <Alert className="mb-4 bg-red-50 border-red-200 text-red-800">
            {errors.submit}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Location Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Location
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600">
              {currentLocation ? currentLocation.name : 'No current location assigned'}
            </div>
          </div>

          {/* Target Location Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Location *
            </label>
            <select
              value={formData.toLocationId}
              onChange={(e) => handleInputChange('toLocationId', e.target.value)}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.toLocationId ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select a location</option>
              {locations
                .filter(location => location.id !== currentLocation?.id)
                .map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name} - {location.address}
                  </option>
                ))
              }
            </select>
            {errors.toLocationId && (
              <p className="mt-1 text-sm text-red-600">{errors.toLocationId}</p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Transfer *
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              placeholder="Please provide a detailed reason for the location transfer..."
              rows={4}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.reason ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.reason && (
              <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {formData.reason.length}/500 characters
            </p>
          </div>

          {/* Temporary Transfer */}
          <div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isTemporary"
                checked={formData.isTemporary}
                onChange={(e) => handleInputChange('isTemporary', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isTemporary" className="ml-2 block text-sm text-gray-700">
                This is a temporary transfer
              </label>
            </div>
            
            {formData.isTemporary && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Return Date *
                </label>
                <Input
                  type="date"
                  value={formData.temporaryEndDate || ''}
                  onChange={(e) => handleInputChange('temporaryEndDate', e.target.value)}
                  className={errors.temporaryEndDate ? 'border-red-300' : ''}
                />
                {errors.temporaryEndDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.temporaryEndDate}</p>
                )}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              className={isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LocationTransferRequestForm;