import React, { useState, useEffect } from 'react';
import {
  PolicyEnforcementService,
  PolicyViolation,
  EscalationAction,
  DisciplinaryAction,
  GracePeriodApplication,
  EscalationStatistics,
  EnforcementStatistics,
  ViolationFilters,
  EscalationFilters,
  DisciplinaryFilters
} from '../services/policyEnforcementService';

interface PolicyEnforcementMonitoringProps {
  userRole: 'admin' | 'manager' | 'user';
  currentUserId?: string;
}

const PolicyEnforcementMonitoring: React.FC<PolicyEnforcementMonitoringProps> = ({ 
  userRole, 
  currentUserId 
}) => {
  const [activeTab, setActiveTab] = useState<'violations' | 'escalations' | 'disciplinary' | 'grace-periods' | 'statistics'>('violations');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Violations state
  const [violations, setViolations] = useState<PolicyViolation[]>([]);
  const [violationFilters, setViolationFilters] = useState<ViolationFilters>({
    page: 1,
    limit: 20
  });
  const [violationPagination, setViolationPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Escalations state
  const [escalations, setEscalations] = useState<EscalationAction[]>([]);
  const [escalationFilters, setEscalationFilters] = useState<EscalationFilters>({
    page: 1,
    limit: 20
  });
  const [escalationPagination, setEscalationPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Disciplinary actions state
  const [disciplinaryActions, setDisciplinaryActions] = useState<DisciplinaryAction[]>([]);
  const [disciplinaryFilters, setDisciplinaryFilters] = useState<DisciplinaryFilters>({});

  // Grace periods state
  const [gracePeriods, setGracePeriods] = useState<GracePeriodApplication[]>([]);
  const [gracePeriodsUserId, setGracePeriodsUserId] = useState<string>(currentUserId || '');
  const [gracePeriodsDateRange, setGracePeriodsDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // Statistics state
  const [escalationStats, setEscalationStats] = useState<EscalationStatistics | null>(null);
  const [enforcementStats, setEnforcementStats] = useState<EnforcementStatistics | null>(null);
  const [statsDateRange, setStatsDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Load violations
  const loadViolations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = { ...violationFilters };
      if (userRole === 'user' && currentUserId) {
        filters.userId = currentUserId;
      }
      
      const response = await PolicyEnforcementService.getViolations(filters);
      setViolations(response.data);
      setViolationPagination(response.pagination);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load violations');
    } finally {
      setLoading(false);
    }
  };

  // Load escalations
  const loadEscalations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = { ...escalationFilters };
      if (userRole === 'user' && currentUserId) {
        filters.userId = currentUserId;
      }
      
      const response = await PolicyEnforcementService.getEscalations(filters);
      setEscalations(response.data);
      setEscalationPagination(response.pagination);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load escalations');
    } finally {
      setLoading(false);
    }
  };

  // Load disciplinary actions
  const loadDisciplinaryActions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = { ...disciplinaryFilters };
      if (userRole === 'user' && currentUserId) {
        filters.employeeId = currentUserId;
      }
      
      const actions = await PolicyEnforcementService.getDisciplinaryActions(filters);
      setDisciplinaryActions(actions);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load disciplinary actions');
    } finally {
      setLoading(false);
    }
  };

  // Load grace periods
  const loadGracePeriods = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = userRole === 'user' ? currentUserId : gracePeriodsUserId;
      if (!userId) {
        setError('User ID is required');
        return;
      }
      
      const periods = await PolicyEnforcementService.getGracePeriodsForUser(
        userId,
        gracePeriodsDateRange.startDate || undefined,
        gracePeriodsDateRange.endDate || undefined
      );
      setGracePeriods(periods);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load grace periods');
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!statsDateRange.startDate || !statsDateRange.endDate) {
        setError('Start date and end date are required for statistics');
        return;
      }
      
      const [escalationStatsData, enforcementStatsData] = await Promise.all([
        PolicyEnforcementService.getEscalationStatistics(statsDateRange.startDate, statsDateRange.endDate),
        PolicyEnforcementService.getEnforcementStatistics(statsDateRange.startDate, statsDateRange.endDate)
      ]);
      
      setEscalationStats(escalationStatsData);
      setEnforcementStats(enforcementStatsData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  // Handle violation acknowledgment
  const handleAcknowledgeViolation = async (violationId: string, notes?: string) => {
    try {
      await PolicyEnforcementService.acknowledgeViolation(violationId, notes);
      setSuccess('Violation acknowledged successfully');
      loadViolations();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to acknowledge violation');
    }
  };

  // Handle violation dismissal
  const handleDismissViolation = async (violationId: string, reason: string) => {
    try {
      await PolicyEnforcementService.dismissViolation(violationId, reason);
      setSuccess('Violation dismissed successfully');
      loadViolations();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to dismiss violation');
    }
  };

  // Load data based on active tab
  useEffect(() => {
    switch (activeTab) {
      case 'violations':
        loadViolations();
        break;
      case 'escalations':
        loadEscalations();
        break;
      case 'disciplinary':
        loadDisciplinaryActions();
        break;
      case 'grace-periods':
        loadGracePeriods();
        break;
      case 'statistics':
        if (userRole !== 'user') {
          loadStatistics();
        }
        break;
    }
  }, [activeTab, violationFilters, escalationFilters, disciplinaryFilters]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-600 bg-red-100';
      case 'acknowledged': return 'text-blue-600 bg-blue-100';
      case 'dismissed': return 'text-gray-600 bg-gray-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Policy Enforcement Monitoring</h1>
        <p className="text-gray-600">Monitor policy violations, escalations, and enforcement statistics</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('violations')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'violations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Violations
          </button>
          <button
            onClick={() => setActiveTab('escalations')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'escalations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Escalations
          </button>
          {userRole !== 'user' && (
            <button
              onClick={() => setActiveTab('disciplinary')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'disciplinary'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Disciplinary Actions
            </button>
          )}
          <button
            onClick={() => setActiveTab('grace-periods')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'grace-periods'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Grace Periods
          </button>
          {userRole !== 'user' && (
            <button
              onClick={() => setActiveTab('statistics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'statistics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Statistics
            </button>
          )}
        </nav>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      )}

      {/* Violations Tab */}
      {activeTab === 'violations' && !loading && (
        <div>
          {/* Violation Filters */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {userRole !== 'user' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                  <input
                    type="text"
                    value={violationFilters.userId || ''}
                    onChange={(e) => setViolationFilters({ ...violationFilters, userId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter user ID"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Violation Type</label>
                <select
                  value={violationFilters.violationType || ''}
                  onChange={(e) => setViolationFilters({ ...violationFilters, violationType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="late_check_in">Late Check-in</option>
                  <option value="early_check_out">Early Check-out</option>
                  <option value="missing_check_in">Missing Check-in</option>
                  <option value="missing_check_out">Missing Check-out</option>
                  <option value="excessive_break">Excessive Break</option>
                  <option value="unauthorized_overtime">Unauthorized Overtime</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={violationFilters.severity || ''}
                  onChange={(e) => setViolationFilters({ ...violationFilters, severity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Severities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={violationFilters.status || ''}
                  onChange={(e) => setViolationFilters({ ...violationFilters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="dismissed">Dismissed</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    value={violationFilters.startDate || ''}
                    onChange={(e) => setViolationFilters({ ...violationFilters, startDate: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={violationFilters.endDate || ''}
                    onChange={(e) => setViolationFilters({ ...violationFilters, endDate: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={loadViolations}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Violations Table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Policy Violations ({violationPagination.total})
              </h3>
            </div>
            <ul className="divide-y divide-gray-200">
              {violations.map((violation) => (
                <li key={violation.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {violation.violationType.replace(/_/g, ' ').toUpperCase()}
                          </p>
                          <p className="text-sm text-gray-500">{violation.description}</p>
                          {userRole !== 'user' && (
                            <p className="text-sm text-gray-500">
                              User: {violation.user_name} ({violation.employee_id})
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(violation.severity)}`}>
                            {violation.severity}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(violation.status)}`}>
                            {violation.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <span>Detected: {new Date(violation.detectedAt).toLocaleString()}</span>
                        {violation.acknowledgedAt && (
                          <span className="ml-4">Acknowledged: {new Date(violation.acknowledgedAt).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {violation.status === 'active' && (
                        <button
                          onClick={() => handleAcknowledgeViolation(violation.id)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Acknowledge
                        </button>
                      )}
                      {(userRole === 'admin' || userRole === 'manager') && violation.status === 'active' && (
                        <button
                          onClick={() => {
                            const reason = prompt('Enter dismissal reason:');
                            if (reason) {
                              handleDismissViolation(violation.id, reason);
                            }
                          }}
                          className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            
            {/* Pagination */}
            {violationPagination.totalPages > 1 && (
              <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setViolationFilters({ ...violationFilters, page: Math.max(1, violationPagination.page - 1) })}
                    disabled={violationPagination.page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setViolationFilters({ ...violationFilters, page: Math.min(violationPagination.totalPages, violationPagination.page + 1) })}
                    disabled={violationPagination.page === violationPagination.totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page {violationPagination.page} of {violationPagination.totalPages} ({violationPagination.total} total)
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      {Array.from({ length: Math.min(5, violationPagination.totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => setViolationFilters({ ...violationFilters, page })}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === violationPagination.page
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'statistics' && userRole !== 'user' && !loading && (
        <div>
          {/* Statistics Date Range */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium mb-4">Date Range</h3>
            <div className="flex space-x-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={statsDateRange.startDate}
                  onChange={(e) => setStatsDateRange({ ...statsDateRange, startDate: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={statsDateRange.endDate}
                  onChange={(e) => setStatsDateRange({ ...statsDateRange, endDate: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={loadStatistics}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Load Statistics
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          {enforcementStats && escalationStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Total Violations</h3>
                <p className="text-3xl font-bold text-blue-600">{enforcementStats.totalViolations}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Compliance Rate</h3>
                <p className="text-3xl font-bold text-green-600">{(enforcementStats.complianceRate * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Total Escalations</h3>
                <p className="text-3xl font-bold text-orange-600">{escalationStats.totalEscalations}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Grace Periods Applied</h3>
                <p className="text-3xl font-bold text-purple-600">{enforcementStats.gracePeriodsApplied}</p>
              </div>
            </div>
          )}

          {/* Detailed Statistics */}
          {enforcementStats && escalationStats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Violations by Type */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Violations by Type</h3>
                <div className="space-y-3">
                  {Object.entries(enforcementStats.violationsByType).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{type.replace(/_/g, ' ')}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Violations by Severity */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Violations by Severity</h3>
                <div className="space-y-3">
                  {Object.entries(enforcementStats.violationsBySeverity).map(([severity, count]) => (
                    <div key={severity} className="flex justify-between items-center">
                      <span className={`text-sm px-2 py-1 rounded ${getSeverityColor(severity)}`}>
                        {severity}
                      </span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Escalations by Level */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Escalations by Level</h3>
                <div className="space-y-3">
                  {Object.entries(escalationStats.escalationsByLevel).map(([level, count]) => (
                    <div key={level} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Level {level}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Escalations by Type */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Escalations by Type</h3>
                <div className="space-y-3">
                  {Object.entries(escalationStats.escalationsByType).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{type.replace(/_/g, ' ')}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PolicyEnforcementMonitoring;