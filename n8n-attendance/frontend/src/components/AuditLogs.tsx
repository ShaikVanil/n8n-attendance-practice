import React, { useState, useEffect } from 'react';
import { auditService, AuditTrailEntry, ComplianceViolation, ComplianceStatistics, AuditFilters } from '../services/auditService';
import PermissionGate from './auth/PermissionGate';

const AuditLogs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'audit-trail' | 'violations' | 'statistics' | 'reports'>('audit-trail');
  const [auditEntries, setAuditEntries] = useState<AuditTrailEntry[]>([]);
  const [violations, setViolations] = useState<ComplianceViolation[]>([]);
  const [statistics, setStatistics] = useState<ComplianceStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<AuditFilters>({
    page: 1,  
    limit: 20
  });
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, [activeTab, currentPage, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'audit-trail') {
        const response = await auditService.getAuditTrail({
          ...filters,
          page: currentPage,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        });
        setAuditEntries(response.data);
        setTotalPages(response.pagination.totalPages);
      } else if (activeTab === 'violations') {
        const response = await auditService.getComplianceViolations({
          page: currentPage,
          limit: 20,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        });
        setViolations(response.data);
        setTotalPages(response.pagination.totalPages);
      } else if (activeTab === 'statistics') {
        const stats = await auditService.getComplianceStatistics(
          dateRange.startDate,
          dateRange.endDate
        );
        setStatistics(stats);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load audit data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof AuditFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleResolveViolation = async (violationId: string, resolutionNotes: string, correctiveActions?: string) => {
    try {
      setLoading(true);
      await auditService.resolveViolation(violationId, {
        resolutionNotes,
        correctiveActions
      });
      loadData(); // Reload data
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resolve violation');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (reportType: string, format: string) => {
    try {
      setLoading(true);
      const reportData = await auditService.generateComplianceReport({
        reportType: reportType as any,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        includeViolations: true,
        includeAuditTrail: true,
        includeStatistics: true,
        format: format as any
      });
      
      if (format === 'json') {
        // Download JSON report
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compliance-report-${reportType}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';    
    }
  };

  return (
    <PermissionGate module="audit" roles={['admin']}>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Audit Logs & Compliance</h1>
          
          {/* Date Range Filter */}
          <div className="flex gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={loadData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Apply Filter
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="-mb-px flex space-x-8">
            {[
              { id: 'audit-trail', label: 'Audit Trail' },
              { id: 'violations', label: 'Compliance Violations' },
              { id: 'statistics', label: 'Statistics' },
              { id: 'reports', label: 'Reports' }
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
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-500 hover:text-red-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Audit Trail Tab */}
        {activeTab === 'audit-trail' && !loading && (
          <div>
            {/* Filters */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <select
                value={filters.entityType || ''}
                onChange={(e) => handleFilterChange('entityType', e.target.value || undefined)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Entity Types</option>
                <option value="user">User</option>
                <option value="attendance">Attendance</option>
                <option value="leave_request">Leave Request</option>
                <option value="device">Device</option>
              </select>
              
              <select
                value={filters.action || ''}
                onChange={(e) => handleFilterChange('action', e.target.value || undefined)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
              </select>
              
              <select
                value={filters.riskLevel || ''}
                onChange={(e) => handleFilterChange('riskLevel', e.target.value || undefined)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Risk Levels</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              
              <select
                value={filters.complianceCategory || ''}
                onChange={(e) => handleFilterChange('complianceCategory', e.target.value || undefined)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                <option value="attendance">Attendance</option>
                <option value="leave">Leave</option>
                <option value="security">Security</option>
                <option value="data_access">Data Access</option>
              </select>
            </div>

            {/* Audit Trail Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Summary</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(entry.performed_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.entity_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.action}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.performed_by_role}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskLevelColor(entry.risk_level || 'low')}`}>
                          {entry.risk_level || 'low'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {entry.changes_summary || 'No summary available'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Compliance Violations Tab */}
        {activeTab === 'violations' && !loading && (
          <div>
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detected</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {violations.map((violation) => (
                    <tr key={violation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(violation.detected_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {violation.violation_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(violation.severity)}`}>
                          {violation.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {violation.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          violation.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          violation.status === 'investigating' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {violation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {violation.status === 'open' && (
                          <button
                            onClick={() => {
                              const resolutionNotes = prompt('Resolution notes:');
                              const correctiveActions = prompt('Corrective actions:');
                              if (resolutionNotes && correctiveActions) {
                                handleResolveViolation(violation.id, resolutionNotes, correctiveActions);
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'statistics' && !loading && statistics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Audit Trail Statistics</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Activities:</span>
                  <span className="font-semibold">{statistics.auditTrail.total_activities}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Users:</span>
                  <span className="font-semibold">{statistics.auditTrail.active_users}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">High Risk Activities:</span>
                  <span className="font-semibold text-red-600">{statistics.auditTrail.high_risk_activities}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Compliance Violations</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Violations:</span>
                  <span className="font-semibold">{statistics.violations.total_violations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Open Violations:</span>
                  <span className="font-semibold text-orange-600">{statistics.violations.open_violations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Critical Violations:</span>
                  <span className="font-semibold text-red-600">{statistics.violations.critical_violations}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Access Statistics</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Access Attempts:</span>
                  <span className="font-semibold">{statistics.access.total_access_attempts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Failed Attempts:</span>
                  <span className="font-semibold text-red-600">{statistics.access.failed_attempts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Unique Users:</span>
                  <span className="font-semibold">{statistics.access.unique_users}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && !loading && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Generate Compliance Reports</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleGenerateReport('comprehensive', 'json')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Generate Comprehensive Report (JSON)
              </button>
              <button
                onClick={() => handleGenerateReport('violations_only', 'json')}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                Generate Violations Report (JSON)
              </button>
              <button
                onClick={() => handleGenerateReport('audit_summary', 'json')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Generate Audit Summary (JSON)
              </button>
              <button
                onClick={() => handleGenerateReport('regulatory', 'json')}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                Generate Regulatory Report (JSON)
              </button>
            </div>
          </div>
        )}

        {/* Pagination */}
        {(activeTab === 'audit-trail' || activeTab === 'violations') && totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <nav className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>
    </PermissionGate>
  );
};

export default AuditLogs;