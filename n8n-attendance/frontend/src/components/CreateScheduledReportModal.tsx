import React, { useState, useEffect } from 'react';
import { scheduledReportService, CreateScheduledReportRequest } from '../services/scheduledReportService';
import { reportService } from '../services/reportService';

interface CreateScheduledReportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateScheduledReportModal: React.FC<CreateScheduledReportModalProps> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [formData, setFormData] = useState<CreateScheduledReportRequest>({
    name: '',
    description: '',
    report_type: 'attendance',
    schedule_cron: '0 9 * * 1', // Default: Every Monday at 9 AM
    filters: {},
    recipients: [],
    format: 'pdf'
  });
  const [recipientEmail, setRecipientEmail] = useState('');
  const [scheduleType, setScheduleType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('weekly');

  useEffect(() => {
    loadEmployees();
    loadDepartments();
  }, []);

  const loadEmployees = async () => {
    try {
      const data = await reportService.getEmployees();
      setEmployees(data);
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  };

  const loadDepartments = async () => {
    try {
      const data = await reportService.getDepartments();
      setDepartments(data);
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const handleScheduleTypeChange = (type: typeof scheduleType) => {
    setScheduleType(type);
    let cron = '';
    switch (type) {
      case 'daily':
        cron = '0 9 * * *'; // Every day at 9 AM
        break;
      case 'weekly':
        cron = '0 9 * * 1'; // Every Monday at 9 AM
        break;
      case 'monthly':
        cron = '0 9 1 * *'; // First day of every month at 9 AM
        break;
      default:
        cron = formData.schedule_cron;
    }
    setFormData({ ...formData, schedule_cron: cron });
  };

  const addRecipient = () => {
    if (recipientEmail && !formData.recipients.includes(recipientEmail)) {
      setFormData({
        ...formData,
        recipients: [...formData.recipients, recipientEmail]
      });
      setRecipientEmail('');
    }
  };

  const removeRecipient = (email: string) => {
    setFormData({
      ...formData,
      recipients: formData.recipients.filter(r => r !== email)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.recipients.length === 0) {
      alert('Please add at least one recipient email');
      return;
    }

    setLoading(true);
    try {
      await scheduledReportService.createScheduledReport(formData);
      onSuccess();
    } catch (error: any) {
      console.error('Failed to create scheduled report:', error);
      alert(error.response?.data?.message || 'Failed to create scheduled report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Create Scheduled Report</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Weekly Attendance Report"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Type *
                </label>
                <select
                  value={formData.report_type}
                  onChange={(e) => setFormData({ ...formData, report_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="attendance">Individual Attendance</option>
                  <option value="team_summary">Team Summary</option>
                  <option value="statistics">Statistics</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Optional description for this report"
              />
            </div>

            {/* Schedule Configuration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schedule *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                {(['daily', 'weekly', 'monthly', 'custom'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleScheduleTypeChange(type)}
                    className={`px-3 py-2 text-sm rounded-md ${
                      scheduleType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
              
              {scheduleType === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cron Expression
                  </label>
                  <input
                    type="text"
                    value={formData.schedule_cron}
                    onChange={(e) => setFormData({ ...formData, schedule_cron: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0 9 * * 1 (Every Monday at 9 AM)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: minute hour day month day-of-week
                  </p>
                </div>
              )}
            </div>

            {/* Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filters (Optional)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee
                  </label>
                  <select
                    value={formData.filters.employeeId || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      filters: { ...formData.filters, employeeId: e.target.value || undefined }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Employees</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    value={formData.filters.department || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      filters: { ...formData.filters, department: e.target.value || undefined }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Export Format *
              </label>
              <select
                value={formData.format}
                onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
              </select>
            </div>

            {/* Recipients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipients *
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRecipient())}
                />
                <button
                  type="button"
                  onClick={addRecipient}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              
              {formData.recipients.length > 0 && (
                <div className="space-y-1">
                  {formData.recipients.map((email, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded">
                      <span className="text-sm">{email}</span>
                      <button
                        type="button"
                        onClick={() => removeRecipient(email)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateScheduledReportModal;