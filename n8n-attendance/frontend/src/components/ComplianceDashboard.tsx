import React, { useState, useEffect } from 'react';
import {
  auditService,
  ComplianceStatistics,
  ComplianceViolation,
  AuditTrailEntry,
  ViolationFilters,
  AuditFilters
} from '../services/auditService';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Alert, AlertDescription } from './ui/Alert';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import { Calendar, Shield, AlertTriangle, Activity, Users, Eye, TrendingUp } from 'lucide-react';
import ViolationHighlighter from './ViolationHighlighter';

interface ComplianceDashboardProps {
  className?: string;
}

const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({ className = '' }) => {
  const [statistics, setStatistics] = useState<ComplianceStatistics | null>(null);
  const [violations, setViolations] = useState<ComplianceViolation[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Filters
  const [violationFilters, setViolationFilters] = useState<ViolationFilters>({
    page: 1,
    limit: 10
  });
  const [auditFilters, setAuditFilters] = useState<AuditFilters>({
    page: 1,
    limit: 10
  });

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsData, violationsData, auditData] = await Promise.all([
        auditService.getComplianceStatistics(dateRange.startDate, dateRange.endDate),
        auditService.getComplianceViolations({ ...violationFilters, status: 'open' }),
        auditService.getAuditTrail({ ...auditFilters, riskLevel: 'high' })
      ]);

      setStatistics(statsData);
      setViolations(violationsData.data);
      setAuditTrail(auditData.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveViolation = async (violationId: string, resolutionNotes: string) => {
    try {
      await auditService.resolveViolation(violationId, { resolutionNotes });
      await loadDashboardData(); // Refresh data
    } catch (err: any) {
      setError(err.message || 'Failed to resolve violation');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const handleViolationClick = (violation: ComplianceViolation) => {
    // Open violation details modal or navigate to details page
    console.log('Violation clicked:', violation);
  };

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor compliance status and audit activities</p>
        </div>
        
        {/* Date Range Selector */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-40"
            />
            <span className="text-gray-500">to</span>
            <Input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-40"
            />
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.auditTrail.total_activities}</div>
              <p className="text-xs text-muted-foreground">
                {statistics.auditTrail.active_users} active users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Violations</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {statistics.violations.open_violations}
              </div>
              <p className="text-xs text-muted-foreground">
                {statistics.violations.critical_violations} critical
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Risk Activities</CardTitle>
              <Shield className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statistics.auditTrail.high_risk_activities}
              </div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Access Attempts</CardTitle>
              <Eye className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.access.total_access_attempts}</div>
              <p className="text-xs text-muted-foreground">
                {statistics.access.failed_attempts} failed
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs for detailed views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="audit-trail">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Enhanced Recent Violations with Highlighting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span>Recent Violations</span>
                {violations.length > 0 && (
                  <Badge className="bg-red-100 text-red-800 ml-2">
                    {violations.length} Active
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ViolationHighlighter
                violations={violations.slice(0, 5)}
                showDetails={false}
                onViolationClick={handleViolationClick}
              />
            </CardContent>
          </Card>

          {/* Recent High-Risk Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-red-500" />
                <span>High-Risk Activities</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditTrail.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No high-risk activities found</p>
              ) : (
                <div className="space-y-3">
                  {auditTrail.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Badge className={getRiskLevelColor(entry.risk_level || 'medium')}>
                            {entry.risk_level}
                          </Badge>
                          <span className="font-medium">{entry.action}</span>
                          <span className="text-sm text-gray-500">on {entry.entity_type}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{entry.changes_summary}</p>
                        <p className="text-xs text-gray-500">
                          By: {entry.performed_by} • {new Date(entry.performed_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="violations" className="space-y-4">
          {/* Violation Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Violations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select
                  value={violationFilters.status || ''}
                  onValueChange={(value) => setViolationFilters(prev => ({ ...prev, status: value || undefined }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={violationFilters.severity || ''}
                  onValueChange={(value) => setViolationFilters(prev => ({ ...prev, severity: value || undefined }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Severities</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Violation Type"
                  value={violationFilters.violationType || ''}
                  onChange={(e) => setViolationFilters(prev => ({ ...prev, violationType: e.target.value || undefined }))}
                />

                <Button onClick={loadDashboardData}>
                  Apply Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Violations List */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Violations</CardTitle>
            </CardHeader>
            <CardContent>
              {violations.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No violations found</p>
              ) : (
                <div className="space-y-4">
                  {violations.map((violation) => (
                    <div key={violation.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className={getSeverityColor(violation.severity)}>
                              {violation.severity}
                            </Badge>
                            <Badge variant="outline">{violation.status}</Badge>
                            <span className="font-semibold">{violation.violation_type}</span>
                          </div>
                          <p className="text-gray-700 mb-2">{violation.description}</p>
                          <div className="text-sm text-gray-500 space-y-1">
                            <p>Detection Method: {violation.detection_method}</p>
                            <p>Detected: {new Date(violation.detected_at).toLocaleString()}</p>
                            {violation.username && <p>User: {violation.username}</p>}
                            {violation.impact_assessment && (
                              <p>Impact: {violation.impact_assessment}</p>
                            )}
                          </div>
                        </div>
                        {violation.status === 'open' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResolveViolation(violation.id, 'Resolved from violations tab')}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit-trail" className="space-y-4">
          {/* Audit Trail Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  placeholder="Entity Type"
                  value={auditFilters.entityType || ''}
                  onChange={(e) => setAuditFilters(prev => ({ ...prev, entityType: e.target.value || undefined }))}
                />

                <Input
                  placeholder="Action"
                  value={auditFilters.action || ''}
                  onChange={(e) => setAuditFilters(prev => ({ ...prev, action: e.target.value || undefined }))}
                />

                <Select
                  value={auditFilters.riskLevel || ''}
                  onValueChange={(value) => setAuditFilters(prev => ({ ...prev, riskLevel: value || undefined }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Risk Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Risk Levels</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={loadDashboardData}>
                  Apply Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Audit Trail List */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              {auditTrail.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No audit entries found</p>
              ) : (
                <div className="space-y-4">
                  {auditTrail.map((entry) => (
                    <div key={entry.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className={getRiskLevelColor(entry.risk_level || 'medium')}>
                              {entry.risk_level}
                            </Badge>
                            <span className="font-semibold">{entry.action}</span>
                            <span className="text-gray-500">on {entry.entity_type}</span>
                          </div>
                          <p className="text-gray-700 mb-2">{entry.changes_summary}</p>
                          <div className="text-sm text-gray-500 space-y-1">
                            <p>Performed by: {entry.performed_by} ({entry.performed_by_role})</p>
                            <p>Time: {new Date(entry.performed_at).toLocaleString()}</p>
                            <p>Entity ID: {entry.entity_id}</p>
                            {entry.reason && <p>Reason: {entry.reason}</p>}
                            {entry.ip_address && <p>IP: {entry.ip_address}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComplianceDashboard;