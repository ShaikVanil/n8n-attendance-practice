import React, { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService';

interface NotificationConfig {
  id: string;
  email_provider: string;
  email_api_key?: string;
  email_from_address: string;
  email_from_name: string;
  sms_provider: string;
  sms_account_sid?: string;
  sms_auth_token?: string;
  sms_from_number?: string;
  realtime_enabled: boolean;
}

interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  subject?: string;
  content: string;
  variables: string[];
  is_active: boolean;
}

interface NotificationStats {
  daily_stats: Array<{
    type: string;
    status: string;
    count: number;
    date: string;
  }>;
  summary: {
    total_notifications: number;
    sent_count: number;
    failed_count: number;
    pending_count: number;
  };
}

export const AdminNotificationConfig: React.FC = () => {
  const [config, setConfig] = useState<NotificationConfig | null>(null);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'templates' | 'stats'>('config');
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [configData, templatesData, statsData] = await Promise.all([
        notificationService.getAdminConfig(),
        notificationService.getNotificationTemplates(),
        notificationService.getNotificationStats()
      ]);
      
      setConfig(configData);
      setTemplates(templatesData);
      setStats(statsData);
    } catch (error: any) {
      console.error('Failed to load notification data:', error);
      setError('Failed to load notification configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigSave = async () => {
    if (!config) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const updatedConfig = await notificationService.updateAdminConfig({
        emailProvider: config.email_provider,
        emailApiKey: config.email_api_key,
        emailFromAddress: config.email_from_address,
        emailFromName: config.email_from_name,
        smsProvider: config.sms_provider,
        smsAccountSid: config.sms_account_sid,
        smsAuthToken: config.sms_auth_token,
        smsFromNumber: config.sms_from_number,
        realtimeEnabled: config.realtime_enabled
      });
      
      setConfig(updatedConfig);
      alert('Configuration saved successfully!');
    } catch (error: any) {
      console.error('Failed to save configuration:', error);
      setError('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateUpdate = async (templateId: string, updates: Partial<NotificationTemplate>) => {
    try {
      const updatedTemplate = await notificationService.updateNotificationTemplate(templateId, updates);
      setTemplates(templates.map(t => t.id === templateId ? updatedTemplate : t));
      alert('Template updated successfully!');
    } catch (error: any) {
      console.error('Failed to update template:', error);
      setError('Failed to update template');
    }
  };

  const handleTestNotification = async (channel: 'email' | 'sms' | 'realtime') => {
    try {
      setTestResult(null);
      await notificationService.sendTestNotification(channel);
      setTestResult(`Test ${channel} notification sent successfully!`);
      setTimeout(() => setTestResult(null), 5000);
    } catch (error: any) {
      console.error('Failed to send test notification:', error);
      setTestResult(`Failed to send test ${channel} notification`);
    }
  };

  const handleConfigChange = (field: keyof NotificationConfig, value: any) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading notification configuration...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button 
                  onClick={loadData}
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

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Notification Configuration</h1>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'config', label: 'System Configuration' },
            { id: 'templates', label: 'Message Templates' },
            { id: 'stats', label: 'Statistics' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* System Configuration Tab */}
      {activeTab === 'config' && config && (
        <div className="space-y-8">
          {/* Email Configuration */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Email Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Provider
                </label>
                <select
                  value={config.email_provider}
                  onChange={(e) => handleConfigChange('email_provider', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="sendgrid">SendGrid</option>
                  <option value="ses">Amazon SES</option>
                  <option value="smtp">SMTP</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={config.email_api_key || ''}
                  onChange={(e) => handleConfigChange('email_api_key', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Enter API key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Email
                </label>
                <input
                  type="email"
                  value={config.email_from_address}
                  onChange={(e) => handleConfigChange('email_from_address', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="noreply@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Name
                </label>
                <input
                  type="text"
                  value={config.email_from_name}
                  onChange={(e) => handleConfigChange('email_from_name', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Attendance System"
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => handleTestNotification('email')}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2"
              >
                Test Email
              </button>
            </div>
          </div>

          {/* SMS Configuration */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">SMS Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMS Provider
                </label>
                <select
                  value={config.sms_provider}
                  onChange={(e) => handleConfigChange('sms_provider', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="twilio">Twilio</option>
                  <option value="aws_sns">AWS SNS</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account SID
                </label>
                <input
                  type="text"
                  value={config.sms_account_sid || ''}
                  onChange={(e) => handleConfigChange('sms_account_sid', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Enter Account SID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auth Token
                </label>
                <input
                  type="password"
                  value={config.sms_auth_token || ''}
                  onChange={(e) => handleConfigChange('sms_auth_token', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Enter Auth Token"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Number
                </label>
                <input
                  type="tel"
                  value={config.sms_from_number || ''}
                  onChange={(e) => handleConfigChange('sms_from_number', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="+1234567890"
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => handleTestNotification('sms')}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-2"
              >
                Test SMS
              </button>
            </div>
          </div>

          {/* Real-time Configuration */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Real-time Notifications</h2>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={config.realtime_enabled}
                onChange={(e) => handleConfigChange('realtime_enabled', e.target.checked)}
                className="mr-3"
              />
              <span>Enable real-time notifications</span>
            </div>
            <div className="mt-4">
              <button
                onClick={() => handleTestNotification('realtime')}
                className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 mr-2"
              >
                Test Real-time
              </button>
            </div>
          </div>

          {/* Test Results */}
          {testResult && (
            <div className={`p-4 rounded-md ${
              testResult.includes('successfully') 
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {testResult}
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleConfigSave}
              disabled={saving}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Notification Templates</h2>
          {templates.map((template) => (
            <div key={template.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium">{template.name}</h3>
                  <span className="text-sm text-gray-500 capitalize">{template.type}</span>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={template.is_active}
                    onChange={(e) => handleTemplateUpdate(template.id, { is_active: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>
              
              {template.subject && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={template.subject}
                    onChange={(e) => handleTemplateUpdate(template.id, { subject: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  value={template.content}
                  onChange={(e) => handleTemplateUpdate(template.id, { content: e.target.value })}
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div className="text-sm text-gray-600">
                <strong>Available variables:</strong> {template.variables.join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold mb-4">Notification Statistics</h2>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900">Total</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.summary.total_notifications}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900">Sent</h3>
              <p className="text-3xl font-bold text-green-600">{stats.summary.sent_count}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900">Failed</h3>
              <p className="text-3xl font-bold text-red-600">{stats.summary.failed_count}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900">Pending</h3>
              <p className="text-3xl font-bold text-yellow-600">{stats.summary.pending_count}</p>
            </div>
          </div>
          
          {/* Daily Stats Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Daily Statistics (Last 30 Days)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Count
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.daily_stats.map((stat, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(stat.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {stat.type.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          stat.status === 'sent' ? 'bg-green-100 text-green-800' :
                          stat.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {stat.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stat.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotificationConfig;