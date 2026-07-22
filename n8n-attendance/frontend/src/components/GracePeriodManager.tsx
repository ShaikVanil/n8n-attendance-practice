import React, { useState, useEffect } from 'react';
import {
  GracePeriodService,
  GracePeriodConfig,
  GracePeriodException,
  CreateGracePeriodExceptionRequest,
  UpdateGracePeriodConfigRequest
} from '../services/gracePeriodService';
import { SystemConfigService, Office } from '../services/systemConfigService';
import { UserService, User } from '../services/userService';
import { useAuthStore } from '../stores/authStore';

interface GracePeriodManagerProps {
  className?: string;
}

const GracePeriodManager: React.FC<GracePeriodManagerProps> = ({ className = '' }) => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'configs' | 'exceptions'>('configs');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Grace Period Configurations
  const [configs, setConfigs] = useState<GracePeriodConfig[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const [configForm, setConfigForm] = useState<UpdateGracePeriodConfigRequest>({
    checkInGrace: 15,
    checkOutGrace: 15,
    breakGrace: 5,
    isActive: true
  });

  // Grace Period Exceptions
  const [exceptions, setExceptions] = useState<GracePeriodException[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [selectedException, setSelectedException] = useState<GracePeriodException | null>(null);
  const [exceptionForm, setExceptionForm] = useState<CreateGracePeriodExceptionRequest>({
    userId: '',
    type: 'temporary',
    graceType: 'check_in',
    gracePeriod: 30,
    validFrom: new Date().toISOString().split('T')[0],
    reason: ''
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load offices for both tabs
      if (offices.length === 0) {
        const officesData = await SystemConfigService.getOffices();
        setOffices(officesData);
        if (officesData.length > 0 && !selectedOffice) {
          setSelectedOffice(officesData[0].id);
        }
      }

      if (activeTab === 'configs') {
        const configsData = await GracePeriodService.getGracePeriodConfigs();
        setConfigs(configsData);
        
        // Load config for selected office
        if (selectedOffice) {
          try {
            const officeConfig = await GracePeriodService.getGracePeriodConfigByOffice(selectedOffice);
            setConfigForm({
              checkInGrace: officeConfig.checkInGrace,
              checkOutGrace: officeConfig.checkOutGrace,
              breakGrace: officeConfig.breakGrace,
              isActive: officeConfig.isActive
            });
          } catch (err) {
            // Office might not have config yet, use defaults
            setConfigForm({
              checkInGrace: 15,
              checkOutGrace: 15,
              breakGrace: 5,
              isActive: true
            });
          }
        }
      } else if (activeTab === 'exceptions') {
        const exceptionsData = await GracePeriodService.getGracePeriodExceptions();
        setExceptions(exceptionsData);
        
        // Load users for dropdown
        if (users.length === 0) {
          const usersData = await UserService.getUsers(1, 1000); // Get all users
          setUsers(usersData.users); // Extract users array from UserListResponse
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigSave = async () => {
    if (!selectedOffice) {
      setError('Please select an office');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await GracePeriodService.updateGracePeriodConfig(selectedOffice, configForm);
      setSuccess('Grace period configuration updated successfully');
      await loadData();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleExceptionSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (selectedException) {
        await GracePeriodService.updateGracePeriodException(selectedException.id, exceptionForm);
        setSuccess('Grace period exception updated successfully');
      } else {
        await GracePeriodService.createGracePeriodException(exceptionForm);
        setSuccess('Grace period exception created successfully');
      }
      
      setShowExceptionModal(false);
      setSelectedException(null);
      resetExceptionForm();
      await loadData();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save exception');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteException = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this grace period exception?')) {
      return;
    }

    try {
      setLoading(true);
      await GracePeriodService.deleteGracePeriodException(id);
      setSuccess('Grace period exception deleted successfully');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete exception');
    } finally {
      setLoading(false);
    }
  };

  const resetExceptionForm = () => {
    setExceptionForm({
      userId: '',
      type: 'temporary',
      graceType: 'check_in',
      gracePeriod: 30,
      validFrom: new Date().toISOString().split('T')[0],
      reason: ''
    });
  };

  const openExceptionModal = (exception?: GracePeriodException) => {
    if (exception) {
      setSelectedException(exception);
      setExceptionForm({
        userId: exception.userId,
        officeId: exception.officeId,
        type: exception.type,
        graceType: exception.graceType,
        gracePeriod: exception.gracePeriod,
        validFrom: exception.validFrom.split('T')[0],
        validTo: exception.validTo?.split('T')[0],
        reason: exception.reason
      });
    } else {
      setSelectedException(null);
      resetExceptionForm();
    }
    setShowExceptionModal(true);
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName} (${user.email})` : userId;
  };

  const getOfficeName = (officeId: string) => {
    const office = offices.find(o => o.id === officeId);
    return office ? office.name : officeId;
  };

  if (loading && configs.length === 0 && exceptions.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading grace period settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Grace Period Management</h2>
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

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('configs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'configs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Office Configurations
            </button>
            <button
              onClick={() => setActiveTab('exceptions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'exceptions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              User Exceptions
            </button>
          </nav>
        </div>

        {/* Office Configurations Tab */}
        {activeTab === 'configs' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Office
                </label>
                <select
                  value={selectedOffice}
                  onChange={(e) => {
                    setSelectedOffice(e.target.value);
                    loadData();
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an office...</option>
                  {offices.map((office) => (
                    <option key={office.id} value={office.id}>
                      {office.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedOffice && (
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Grace Period Settings - {getOfficeName(selectedOffice)}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check-in Grace Period (minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={configForm.checkInGrace || ''}
                      onChange={(e) => setConfigForm({
                        ...configForm,
                        checkInGrace: parseInt(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check-out Grace Period (minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={configForm.checkOutGrace || ''}
                      onChange={(e) => setConfigForm({
                        ...configForm,
                        checkOutGrace: parseInt(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Break Grace Period (minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={configForm.breakGrace || ''}
                      onChange={(e) => setConfigForm({
                        ...configForm,
                        breakGrace: parseInt(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex items-center mb-6">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={configForm.isActive}
                    onChange={(e) => setConfigForm({
                      ...configForm,
                      isActive: e.target.checked
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Enable grace periods for this office
                  </label>
                </div>
                
                <button
                  onClick={handleConfigSave}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* User Exceptions Tab */}
        {activeTab === 'exceptions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Grace Period Exceptions
              </h3>
              <button
                onClick={() => openExceptionModal()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add Exception
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grace Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period (min)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valid Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {exceptions.map((exception) => (
                    <tr key={exception.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getUserName(exception.userId)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          exception.type === 'permanent' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {exception.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {exception.graceType.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {exception.gracePeriod}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(exception.validFrom).toLocaleDateString()}
                        {exception.validTo && ` - ${new Date(exception.validTo).toLocaleDateString()}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          exception.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {exception.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => openExceptionModal(exception)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteException(exception.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {exceptions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No grace period exceptions found.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Exception Modal */}
        {showExceptionModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {selectedException ? 'Edit' : 'Create'} Grace Period Exception
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      User
                    </label>
                    <select
                      value={exceptionForm.userId}
                      onChange={(e) => setExceptionForm({ ...exceptionForm, userId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!!selectedException}
                    >
                      <option value="">Select a user...</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Office (Optional)
                    </label>
                    <select
                      value={exceptionForm.officeId || ''}
                      onChange={(e) => setExceptionForm({ ...exceptionForm, officeId: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All offices</option>
                      {offices.map((office) => (
                        <option key={office.id} value={office.id}>
                          {office.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={exceptionForm.type}
                        onChange={(e) => setExceptionForm({ 
                          ...exceptionForm, 
                          type: e.target.value as 'temporary' | 'permanent'
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="temporary">Temporary</option>
                        <option value="permanent">Permanent</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Grace Type
                      </label>
                      <select
                        value={exceptionForm.graceType}
                        onChange={(e) => setExceptionForm({ 
                          ...exceptionForm, 
                          graceType: e.target.value as 'check_in' | 'check_out' | 'break' | 'all'
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="check_in">Check In</option>
                        <option value="check_out">Check Out</option>
                        <option value="break">Break</option>
                        <option value="all">All</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grace Period (minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={exceptionForm.gracePeriod}
                      onChange={(e) => setExceptionForm({ 
                        ...exceptionForm, 
                        gracePeriod: parseInt(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valid From
                      </label>
                      <input
                        type="date"
                        value={exceptionForm.validFrom}
                        onChange={(e) => setExceptionForm({ ...exceptionForm, validFrom: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    {exceptionForm.type === 'temporary' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Valid To
                        </label>
                        <input
                          type="date"
                          value={exceptionForm.validTo || ''}
                          onChange={(e) => setExceptionForm({ ...exceptionForm, validTo: e.target.value || undefined })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason
                    </label>
                    <textarea
                      value={exceptionForm.reason}
                      onChange={(e) => setExceptionForm({ ...exceptionForm, reason: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Reason for this grace period exception..."
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowExceptionModal(false);
                      setSelectedException(null);
                      resetExceptionForm();
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExceptionSubmit}
                    disabled={loading || !exceptionForm.userId || !exceptionForm.reason}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : (selectedException ? 'Update' : 'Create')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GracePeriodManager;