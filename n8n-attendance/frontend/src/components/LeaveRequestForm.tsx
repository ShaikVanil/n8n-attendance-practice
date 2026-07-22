import React, { useState, useEffect } from 'react';
import { useLeaveStore } from '../stores/leaveStore';
import { useAuthStore } from '../stores/authStore';
import { CreateLeaveRequestRequest } from '../types/leave';

interface LeaveRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const LeaveRequestForm: React.FC<LeaveRequestFormProps> = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState<CreateLeaveRequestRequest>({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
    emergencyLeave: false,
    halfDay: false,
    halfDayPeriod: undefined
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null);
  const [eligibilityCheck, setEligibilityCheck] = useState<{
    eligible: boolean;
    reason?: string;
    availableDays: number;
  } | null>(null);

  const {
    leaveTypes,
    loading,
    error,
    fetchLeaveTypes,
    submitLeaveRequest,
    calculateLeaveDays,
    checkEligibility,
    clearError
  } = useLeaveStore();

  const { user } = useAuthStore();

  useEffect(() => {
    fetchLeaveTypes();
  }, [fetchLeaveTypes]);

  useEffect(() => {
    // Calculate days when dates change
    if (formData.startDate && formData.endDate) {
      calculateDays();
    } else {
      setCalculatedDays(null);
      setEligibilityCheck(null);
    }
  }, [formData.startDate, formData.endDate, formData.halfDay]);

  useEffect(() => {
    // Check eligibility when leave type or dates change
    if (formData.leaveTypeId && formData.startDate && formData.endDate) {
      checkLeaveEligibility();
    } else {
      setEligibilityCheck(null);
    }
  }, [formData.leaveTypeId, formData.startDate, formData.endDate]);

  const calculateDays = async () => {
    try {
      const days = await calculateLeaveDays(formData.startDate, formData.endDate, formData.halfDay);
      setCalculatedDays(days);
    } catch (error) {
      console.error('Failed to calculate days:', error);
    }
  };

  const checkLeaveEligibility = async () => {
    try {
      const result = await checkEligibility(formData.leaveTypeId, formData.startDate, formData.endDate);
      setEligibilityCheck(result);
    } catch (error) {
      console.error('Failed to check eligibility:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.leaveTypeId) {
      newErrors.leaveTypeId = 'Please select a leave type';
    }
    
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }
    
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      if (startDate > endDate) {
        newErrors.endDate = 'End date must be after start date';
      }
      
      if (startDate < new Date()) {
        newErrors.startDate = 'Start date cannot be in the past';
      }
    }
    
    if (formData.halfDay && !formData.halfDayPeriod) {
      newErrors.halfDayPeriod = 'Please select half day period';
    }
    
    if (eligibilityCheck && !eligibilityCheck.eligible) {
      newErrors.eligibility = eligibilityCheck.reason || 'You are not eligible for this leave';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      await submitLeaveRequest(formData);
      setFormData({
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        reason: '',
        emergencyLeave: false,
        halfDay: false,
        halfDayPeriod: undefined
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      onSuccess?.();
    } catch (error) {
      // Error is handled by the store
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof CreateLeaveRequestRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear related errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const selectedLeaveType = leaveTypes.find(type => type.id === formData.leaveTypeId);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4v10m6-10v10m-6-4h6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Submit Leave Request</h1>
          <p className="text-gray-600">Request time off from work</p>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-400 rounded-r-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-800 font-medium">Leave request submitted successfully!</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800 font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Leave Type */}
            <div>
              <label htmlFor="leaveTypeId" className="block text-sm font-medium text-gray-700 mb-2">
                Leave Type *
              </label>
              <select
                id="leaveTypeId"
                value={formData.leaveTypeId}
                onChange={(e) => handleInputChange('leaveTypeId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                  errors.leaveTypeId ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={loading}
              >
                <option value="">Select leave type</option>
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} {type.maxDaysPerYear && `(${type.maxDaysPerYear} days/year)`}
                  </option>
                ))}
              </select>
              {errors.leaveTypeId && (
                <p className="mt-1 text-sm text-red-600">{errors.leaveTypeId}</p>
              )}
              {selectedLeaveType && (
                <p className="mt-1 text-sm text-gray-600">{selectedLeaveType.description}</p>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                    errors.startDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
                )}
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                    errors.endDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
                )}
              </div>
            </div>

            {/* Half Day Option */}
            <div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="halfDay"
                  checked={formData.halfDay}
                  onChange={(e) => {
                    handleInputChange('halfDay', e.target.checked);
                    if (!e.target.checked) {
                      handleInputChange('halfDayPeriod', undefined);
                    }
                  }}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="halfDay" className="ml-2 block text-sm text-gray-700">
                  Half Day Leave
                </label>
              </div>
              
              {formData.halfDay && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Half Day Period *
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="halfDayPeriod"
                        value="morning"
                        checked={formData.halfDayPeriod === 'morning'}
                        onChange={(e) => handleInputChange('halfDayPeriod', e.target.value as 'morning' | 'afternoon')}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Morning</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="halfDayPeriod"
                        value="afternoon"
                        checked={formData.halfDayPeriod === 'afternoon'}
                        onChange={(e) => handleInputChange('halfDayPeriod', e.target.value as 'morning' | 'afternoon')}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Afternoon</span>
                    </label>
                  </div>
                  {errors.halfDayPeriod && (
                    <p className="mt-1 text-sm text-red-600">{errors.halfDayPeriod}</p>
                  )}
                </div>
              )}
            </div>

            {/* Emergency Leave */}
            <div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="emergencyLeave"
                  checked={formData.emergencyLeave}
                  onChange={(e) => handleInputChange('emergencyLeave', e.target.checked)}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="emergencyLeave" className="ml-2 block text-sm text-gray-700">
                  Emergency Leave
                </label>
              </div>
              {formData.emergencyLeave && (
                <p className="mt-1 text-sm text-orange-600">
                  Emergency leave requests may bypass normal approval processes.
                </p>
              )}
            </div>

            {/* Reason */}
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                Reason (Optional)
              </label>
              <textarea
                id="reason"
                value={formData.reason || ''}
                onChange={(e) => handleInputChange('reason', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                placeholder="Provide additional details about your leave request..."
              />
            </div>

            {/* Calculated Days Display */}
            {calculatedDays !== null && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-blue-800 font-medium">
                    Total Leave Days: {calculatedDays} {calculatedDays === 1 ? 'day' : 'days'}
                  </span>
                </div>
              </div>
            )}

            {/* Eligibility Check */}
            {eligibilityCheck && (
              <div className={`p-4 border rounded-md ${
                eligibilityCheck.eligible 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center">
                  <svg 
                    className={`w-5 h-5 mr-2 ${
                      eligibilityCheck.eligible ? 'text-green-400' : 'text-red-400'
                    }`} 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    {eligibilityCheck.eligible ? (
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    ) : (
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    )}
                  </svg>
                  <div>
                    <span className={`font-medium ${
                      eligibilityCheck.eligible ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {eligibilityCheck.eligible ? 'Eligible for Leave' : 'Not Eligible'}
                    </span>
                    {!eligibilityCheck.eligible && eligibilityCheck.reason && (
                      <p className="text-red-700 text-sm mt-1">{eligibilityCheck.reason}</p>
                    )}
                    <p className={`text-sm mt-1 ${
                      eligibilityCheck.eligible ? 'text-green-700' : 'text-red-700'
                    }`}>
                      Available Days: {eligibilityCheck.availableDays}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* General Eligibility Error */}
            {errors.eligibility && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm">{errors.eligibility}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              <button
                type="submit"
                disabled={isSubmitting || loading || (eligibilityCheck?.eligible === false)}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </div>
                ) : (
                  'Submit Leave Request'
                )}
              </button>
              
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 sm:flex-none bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LeaveRequestForm;