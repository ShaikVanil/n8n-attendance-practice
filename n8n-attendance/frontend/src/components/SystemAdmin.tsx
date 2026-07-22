import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import UserManagement from './UserManagement';
import AuditLogs from './AuditLogs';
import PolicyTemplateManagement from './PolicyTemplateManagement';
import DataRetentionManager from './DataRetentionManager';
import SystemConfig from './SystemConfig';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  lastBackup: string;
}

const SystemAdmin: React.FC = () => {
  const { user } = useAuthStore();
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [stats] = useState<SystemStats>({
    totalUsers: 150,
    activeUsers: 142,
    systemHealth: 'healthy',
    lastBackup: '2024-01-15 02:00:00'
  });

  // Only allow admin access
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this area.</p>
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'dashboard', label: 'System Dashboard', icon: '📊' },
    { id: 'users', label: 'User Management', icon: '👥' },
    { id: 'audit', label: 'Audit Logs', icon: '📋' },
    { id: 'policies', label: 'Policy Templates', icon: '📄' },
    { id: 'data', label: 'Data Retention', icon: '🗄️' },
    { id: 'settings', label: 'System Settings', icon: '⚙️' }
  ];

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
                <div className="text-sm text-gray-600">Total Users</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
                <div className="text-sm text-gray-600">Active Users</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className={`text-2xl font-bold ${
                  stats.systemHealth === 'healthy' ? 'text-green-600' :
                  stats.systemHealth === 'warning' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {stats.systemHealth.toUpperCase()}
                </div>
                <div className="text-sm text-gray-600">System Health</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm font-bold text-gray-900">{stats.lastBackup}</div>
                <div className="text-sm text-gray-600">Last Backup</div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">System Overview</h3>
              <p className="text-gray-600">System monitoring and health metrics will appear here...</p>
            </div>
          </div>
        );
      case 'users':
        return <UserManagement />;
      case 'audit':
        return <AuditLogs />;
      case 'policies':
        return <PolicyTemplateManagement />;
      case 'data':
        return <DataRetentionManager />;
      // In the renderSectionContent function, replace the settings case:
      case 'settings':
        return <SystemConfig />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Administration</h1>
          <p className="text-gray-600 mt-2">Manage system settings and configurations</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">Admin Tools</h2>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center space-x-3 ${
                      activeSection === section.id
                        ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>{section.icon}</span>
                    <span className="font-medium">{section.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {renderSectionContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemAdmin;