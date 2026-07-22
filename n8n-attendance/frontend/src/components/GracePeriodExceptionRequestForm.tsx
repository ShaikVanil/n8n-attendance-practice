import React, { useState, useEffect } from 'react';
import { GracePeriodService, CreateGracePeriodExceptionRequest } from '../services/gracePeriodService';
import { SystemConfigService, Office } from '../services/systemConfigService';
import { useAuthStore } from '../stores/authStore';

interface GracePeriodExceptionRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const GracePeriodExceptionRequestForm: React.FC<GracePeriodExceptionRequestFormProps> = ({
  onSuccess,
  onCancel
}) => {
  const { user } = useAuthStore();
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateGracePeriodExceptionRequest>({
    userId: user?.id || '',
    type: 'temporary',
    graceType: 'check_in',
    gracePeriod: 15,
    validFrom: new Date().toISOString().split('T')[0],
    reason: ''
  });

  useEffect(() => {
    fetchOffices();
  }, []);

  const fetchOffices = async () => {
    try {
      const officesData = await SystemConfigService.getOffices();
      setOffices(officesData);
    } catch (error) {
      console.error('Error fetching offices:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await GracePeriodService.createGracePeriodException(formData);
      setSuccess('Grace period exception request submitted successfully. It will be reviewed by your manager.');
      
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to submit grace period exception request');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateGracePeriodExceptionRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Request Grace Period Exception
        </h2>
        <p className="text-gray-600">
          Submit a request for a grace period exception. This will be reviewed by your manager.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Exception Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Exception Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleInputChange('type', e.target.value as 'temporary' | 'permanent')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="temporary">Temporary</option>
            <option value="permanent">Permanent</option>
          </select>
        </div>

        {/* Grace Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Grace Period Type
          </label>
          <select
            value={formData.graceType}
            onChange={(e) => handleInputChange('graceType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="check_in">Check-in Grace</option>
            <option value="check_out">Check-out Grace</option>
            <option value="break">Break Grace</option>
            <option value="all">All Types</option>
          </select>
        </div>

        {/* Grace Period Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Grace Period (minutes)
          </label>
          <input
            type="number"
            min="1"
            max="120"
            value={formData.gracePeriod}
            onChange={(e) => handleInputChange('gracePeriod', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Office Selection */}
        {offices.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Office (Optional)
            </label>
            <select
              value={formData.officeId || ''}
              onChange={(e) => handleInputChange('officeId', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Offices</option>
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Valid From Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valid From
          </label>
          <input
            type="date"
            value={formData.validFrom}
            onChange={(e) => handleInputChange('validFrom', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Valid To Date (for temporary exceptions) */}
        {formData.type === 'temporary' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valid To
            </label>
            <input
              type="date"
              value={formData.validTo || ''}
              onChange={(e) => handleInputChange('validTo', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={formData.validFrom}
              required
            />
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Exception
          </label>
          <textarea
            value={formData.reason}
            onChange={(e) => handleInputChange('reason', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Please explain why you need this grace period exception..."
            required
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GracePeriodExceptionRequestForm;