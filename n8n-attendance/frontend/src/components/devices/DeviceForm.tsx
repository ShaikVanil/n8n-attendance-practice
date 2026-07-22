import React, { useState } from 'react';
import { useDeviceStore } from '../../stores/deviceStore';
import { useNavigate, Link } from 'react-router-dom';

interface DeviceFormProps {
  onSuccess?: () => void;
}

export const DeviceForm: React.FC<DeviceFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    deviceName: '',
    deviceType: 'mobile' as 'mobile' | 'tablet' | 'laptop',
    macAddress: '',
    description: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const { registerDevice } = useDeviceStore();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.deviceName.trim()) {
      newErrors.deviceName = 'Device name is required';
    }
    
    if (!formData.macAddress.trim()) {
      newErrors.macAddress = 'MAC address is required';
    } else if (!/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(formData.macAddress)) {
      newErrors.macAddress = 'Invalid MAC address format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setIsSubmitting(true);
      await registerDevice(formData);
      setShowSuccess(true);
      
      // Navigate back to device list after 2 seconds
      setTimeout(() => {
        navigate('/devices');
      }, 2000);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      setErrors({ submit: 'Failed to register device. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove or comment out line 57 that defines 'getDeviceTypeLabel' since it's not being used
  // const getDeviceTypeLabel = (type: string) => { ... }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header with Back Button */}
        <div className="text-center mb-8">
          <Link 
            to="/devices" 
            className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Devices
          </Link>
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Register Device</h1>
          <p className="text-gray-600">Add your device to the attendance system</p>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-400 rounded-r-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-800 font-medium">Device registered successfully!</span>
            </div>
          </div>
        )}
        
        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Device Name */}
            <div>
              <label htmlFor="deviceName" className="block text-sm font-medium text-gray-700 mb-2">
                Device Name *
              </label>
              <input
                type="text"
                id="deviceName"
                value={formData.deviceName}
                onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.deviceName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., My iPhone 13"
              />
              {errors.deviceName && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.deviceName}
                </p>
              )}
            </div>

            {/* Device Type */}
            <div>
              <label htmlFor="deviceType" className="block text-sm font-medium text-gray-700 mb-2">
                Device Type *
              </label>
              <select
                id="deviceType"
                value={formData.deviceType}
                onChange={(e) => setFormData({ ...formData, deviceType: e.target.value as 'mobile' | 'tablet' | 'laptop' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="mobile">📱 Mobile Phone</option>
                <option value="tablet">📱 Tablet</option>
                <option value="laptop">💻 Laptop</option>
              </select>
            </div>

            {/* MAC Address */}
            <div>
              <label htmlFor="macAddress" className="block text-sm font-medium text-gray-700 mb-2">
                MAC Address *
              </label>
              <input
                type="text"
                id="macAddress"
                value={formData.macAddress}
                onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.macAddress ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="00:1B:44:11:3A:B7"
              />
              <p className="mt-1 text-xs text-gray-500">
                Format: XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX
              </p>
              {errors.macAddress && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.macAddress}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                rows={3}
                placeholder="Additional details about your device (optional)"
              />
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
                <p className="text-red-800 text-sm flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.submit}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registering...
                </div>
              ) : (
                'Register Device'
              )}
            </button>
          </form>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Need help finding your MAC address?{' '}
            <button 
              type="button"
              className="text-blue-600 hover:text-blue-500 underline"
              onClick={() => {
                alert('To find your MAC address:\n\n• iPhone/iPad: Settings > General > About > Wi-Fi Address\n• Android: Settings > About Phone > Status > Wi-Fi MAC Address\n• Windows: Command Prompt > ipconfig /all\n• Mac: System Preferences > Network > Advanced > Hardware');
              }}
            >
              Click here for instructions
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};