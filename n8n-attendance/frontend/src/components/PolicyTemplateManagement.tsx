import React, { useState, useEffect } from 'react';
import {
  PolicyTemplateService,
  PolicyTemplate,
  CreatePolicyTemplateRequest,
  UpdatePolicyTemplateRequest,
  PolicyTemplateFilters,
  PolicyRules
} from '../services/policyTemplateService';

interface PolicyTemplateFormData {
  name: string;
  description: string;
  employeeType: 'full-time' | 'part-time' | 'contractor' | 'intern';
  isDefault: boolean;
  rules: PolicyRules;
}

const defaultRules: PolicyRules = {
  workingHours: {
    startTime: '09:00',
    endTime: '17:00',
    daysOfWeek: [1, 2, 3, 4, 5],
    flexibleHours: false
  },
  gracePeriod: {
    checkInGrace: 15,
    checkOutGrace: 15,
    breakGrace: 5
  },
  overtime: {
    enabled: false,
    dailyThreshold: 8,
    weeklyThreshold: 40,
    requiresApproval: true
  },
  breaks: {
    required: true,
    minDuration: 30,
    maxDuration: 60,
    maxBreaksPerDay: 2
  }
};

const PolicyTemplateManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit'>('list');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Policy Templates
  const [policyTemplates, setPolicyTemplates] = useState<PolicyTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PolicyTemplate | null>(null);
  const [filters, setFilters] = useState<PolicyTemplateFilters>({});

  // Form Data
  const [formData, setFormData] = useState<PolicyTemplateFormData>({
    name: '',
    description: '',
    employeeType: 'full-time',
    isDefault: false,
    rules: defaultRules
  });

  useEffect(() => {
    if (activeTab === 'list') {
      loadPolicyTemplates();
    }
  }, [activeTab, filters]);

  const loadPolicyTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const templates = await PolicyTemplateService.getPolicyTemplates(filters);
      setPolicyTemplates(templates);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load policy templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const createRequest: CreatePolicyTemplateRequest = {
        name: formData.name,
        description: formData.description || undefined,
        employeeType: formData.employeeType,
        isDefault: formData.isDefault,
        rules: formData.rules
      };
      
      await PolicyTemplateService.createPolicyTemplate(createRequest);
      setSuccess('Policy template created successfully');
      setActiveTab('list');
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create policy template');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const updateRequest: UpdatePolicyTemplateRequest = {
        name: formData.name,
        description: formData.description || undefined,
        employeeType: formData.employeeType,
        isDefault: formData.isDefault,
        rules: formData.rules
      };
      
      await PolicyTemplateService.updatePolicyTemplate(selectedTemplate.id, updateRequest);
      setSuccess('Policy template updated successfully');
      setActiveTab('list');
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update policy template');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this policy template?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await PolicyTemplateService.deletePolicyTemplate(id);
      setSuccess('Policy template deleted successfully');
      loadPolicyTemplates();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete policy template');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (template: PolicyTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      employeeType: template.employeeType,
      isDefault: template.isDefault,
      rules: template.rules
    });
    setActiveTab('edit');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      employeeType: 'full-time',
      isDefault: false,
      rules: defaultRules
    });
    setSelectedTemplate(null);
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateRules = (ruleCategory: keyof PolicyRules, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        [ruleCategory]: {
          ...prev.rules[ruleCategory],
          [field]: value
        }
      }
    }));
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Policy Template Management</h1>
          <p className="text-gray-600 mt-1">Create and manage attendance policy templates</p>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('list')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'list'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Policy Templates
            </button>
            <button
              onClick={() => {
                setActiveTab('create');
                resetForm();
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'create'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Create Template
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {/* Policy Templates List */}
          {activeTab === 'list' && (
            <div>
              {/* Filters */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search
                  </label>
                  <input
                    type="text"
                    value={filters.search || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    placeholder="Search templates..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee Type
                  </label>
                  <select
                    value={filters.employeeType || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, employeeType: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contractor">Contractor</option>
                    <option value="intern">Intern</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={filters.isActive !== undefined ? filters.isActive.toString() : ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      isActive: e.target.value === '' ? undefined : e.target.value === 'true'
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={loadPolicyTemplates}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Apply Filters'}
                  </button>
                </div>
              </div>

              {/* Templates Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Default
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Version
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {policyTemplates.map((template) => (
                      <tr key={template.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{template.name}</div>
                            {template.description && (
                              <div className="text-sm text-gray-500">{template.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {template.employeeType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            template.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {template.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {template.isDefault && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Default
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          v{template.version}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEditTemplate(template)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {policyTemplates.length === 0 && !loading && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No policy templates found</p>
                </div>
              )}
            </div>
          )}

          {/* Create/Edit Form */}
          {(activeTab === 'create' || activeTab === 'edit') && (
            <div className="max-w-4xl">
              <h2 className="text-xl font-semibold mb-6">
                {activeTab === 'create' ? 'Create Policy Template' : 'Edit Policy Template'}
              </h2>
              
              {/* Basic Information */}
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-medium mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateFormData('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employee Type *
                    </label>
                    <select
                      value={formData.employeeType}
                      onChange={(e) => updateFormData('employeeType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="full-time">Full-time</option>
                      <option value="part-time">Part-time</option>
                      <option value="contractor">Contractor</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => updateFormData('description', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isDefault}
                        onChange={(e) => updateFormData('isDefault', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Set as default template for this employee type
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Working Hours */}
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-medium mb-4">Working Hours</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={formData.rules.workingHours.startTime}
                      onChange={(e) => updateRules('workingHours', 'startTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formData.rules.workingHours.endTime}
                      onChange={(e) => updateRules('workingHours', 'endTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Working Days
                    </label>
                    <div className="flex space-x-4">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                        <label key={day} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.rules.workingHours.daysOfWeek.includes(index + 1)}
                            onChange={(e) => {
                              const days = formData.rules.workingHours.daysOfWeek;
                              if (e.target.checked) {
                                updateRules('workingHours', 'daysOfWeek', [...days, index + 1]);
                              } else {
                                updateRules('workingHours', 'daysOfWeek', days.filter(d => d !== index + 1));
                              }
                            }}
                            className="mr-1"
                          />
                          <span className="text-sm">{day}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.rules.workingHours.flexibleHours || false}
                        onChange={(e) => updateRules('workingHours', 'flexibleHours', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Enable flexible working hours
                      </span>
                    </label>
                  </div>
                  {formData.rules.workingHours.flexibleHours && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Core Hours Start
                        </label>
                        <input
                          type="time"
                          value={formData.rules.workingHours.coreHoursStart || ''}
                          onChange={(e) => updateRules('workingHours', 'coreHoursStart', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Core Hours End
                        </label>
                        <input
                          type="time"
                          value={formData.rules.workingHours.coreHoursEnd || ''}
                          onChange={(e) => updateRules('workingHours', 'coreHoursEnd', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Grace Periods */}
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-medium mb-4">Grace Periods (minutes)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Check-in Grace
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.rules.gracePeriod.checkInGrace}
                      onChange={(e) => updateRules('gracePeriod', 'checkInGrace', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Check-out Grace
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.rules.gracePeriod.checkOutGrace}
                      onChange={(e) => updateRules('gracePeriod', 'checkOutGrace', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Break Grace
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.rules.gracePeriod.breakGrace}
                      onChange={(e) => updateRules('gracePeriod', 'breakGrace', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Overtime Rules */}
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-medium mb-4">Overtime Rules</h3>
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.rules.overtime.enabled}
                        onChange={(e) => updateRules('overtime', 'enabled', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Enable overtime tracking
                      </span>
                    </label>
                  </div>
                  {formData.rules.overtime.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Daily Threshold (hours)
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="0.5"
                          value={formData.rules.overtime.dailyThreshold || ''}
                          onChange={(e) => updateRules('overtime', 'dailyThreshold', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Weekly Threshold (hours)
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="0.5"
                          value={formData.rules.overtime.weeklyThreshold || ''}
                          onChange={(e) => updateRules('overtime', 'weeklyThreshold', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.rules.overtime.requiresApproval || false}
                            onChange={(e) => updateRules('overtime', 'requiresApproval', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Require approval for overtime
                          </span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Break Rules */}
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-medium mb-4">Break Rules</h3>
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.rules.breaks.required}
                        onChange={(e) => updateRules('breaks', 'required', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Breaks are required
                      </span>
                    </label>
                  </div>
                  {formData.rules.breaks.required && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Min Duration (minutes)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.rules.breaks.minDuration || ''}
                          onChange={(e) => updateRules('breaks', 'minDuration', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Duration (minutes)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.rules.breaks.maxDuration || ''}
                          onChange={(e) => updateRules('breaks', 'maxDuration', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Breaks Per Day
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.rules.breaks.maxBreaksPerDay || ''}
                          onChange={(e) => updateRules('breaks', 'maxBreaksPerDay', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setActiveTab('list');
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={activeTab === 'create' ? handleCreateTemplate : handleUpdateTemplate}
                  disabled={loading || !formData.name}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (activeTab === 'create' ? 'Create Template' : 'Update Template')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PolicyTemplateManagement;