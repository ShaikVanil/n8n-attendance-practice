import React, { useState, useEffect } from 'react';
import { auditService, ReportTemplate, ComplianceReportFilters, ReportHistoryEntry } from '../services/auditService';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/Select';
import { Alert, AlertDescription } from './ui/Alert';
import { Badge } from './ui/Badge';
import { FileText, Download, Calendar, Filter, History, Settings } from 'lucide-react';

interface ComplianceReportsProps {
  className?: string;
}

const ComplianceReports: React.FC<ComplianceReportsProps> = ({ className }) => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [reportHistory, setReportHistory] = useState<ReportHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
  
  const [filters, setFilters] = useState<ComplianceReportFilters>({
    reportType: 'comprehensive',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    includeViolations: true,
    includeAuditTrail: true,
    includeStatistics: true,
    format: 'pdf'
  });

  useEffect(() => {
    loadTemplates();
    if (activeTab === 'history') {
      loadReportHistory();
    }
  }, [activeTab]);

  const loadTemplates = async () => {
    try {
      const templatesData = await auditService.getReportTemplates();
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading templates:', error);
      setError('Failed to load report templates');
    }
  };

  const loadReportHistory = async () => {
    try {
      const historyData = await auditService.getReportHistory();
      setReportHistory(historyData.data);
    } catch (error) {
      console.error('Error loading report history:', error);
      setError('Failed to load report history');
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const reportData = await auditService.generateComplianceReport(filters);
      
      if (filters.format === 'pdf') {
        auditService.exportComplianceReportToPDF(reportData.data, `compliance-report-${filters.reportType}`);
      } else if (filters.format === 'excel') {
        auditService.exportComplianceReportToExcel(reportData.data, `compliance-report-${filters.reportType}`);
      }
      
      setSuccess('Report generated and downloaded successfully!');
      
      // Refresh history if on history tab
      if (activeTab === 'history') {
        loadReportHistory();
      }
    } catch (error) {
      console.error('Error generating report:', error);
      setError('Failed to generate compliance report');
    } finally {
      setLoading(false);
    }
  };

  const selectedTemplate = templates.find(t => t.id === filters.reportType);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Compliance Reports</h2>
          <p className="text-gray-600">Generate and manage compliance reports</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={activeTab === 'generate' ? 'default' : 'outline'}
            onClick={() => setActiveTab('generate')}
            className="flex items-center space-x-2"
          >
            <FileText className="h-4 w-4" />
            <span>Generate</span>
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'outline'}
            onClick={() => setActiveTab('history')}
            className="flex items-center space-x-2"
          >
            <History className="h-4 w-4" />
            <span>History</span>
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {activeTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Configuration */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Report Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Report Template
                  </label>
                  <Select
                    value={filters.reportType}
                    onValueChange={(value) => setFilters({ ...filters, reportType: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplate && (
                    <p className="text-sm text-gray-600 mt-1">{selectedTemplate.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Export Format
                  </label>
                  <Select
                    value={filters.format}
                    onValueChange={(value) => setFilters({ ...filters, format: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Include Sections
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.includeViolations}
                        onChange={(e) => setFilters({ ...filters, includeViolations: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm">Compliance Violations</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.includeAuditTrail}
                        onChange={(e) => setFilters({ ...filters, includeAuditTrail: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm">Audit Trail</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.includeStatistics}
                        onChange={(e) => setFilters({ ...filters, includeStatistics: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm">Statistics & Trends</span>
                    </label>
                  </div>
                </div>

                <Button
                  onClick={handleGenerateReport}
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>{loading ? 'Generating...' : 'Generate Report'}</span>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Template Preview */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Template Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedTemplate && (
                  <div className="space-y-3">
                    <h4 className="font-medium">{selectedTemplate.name}</h4>
                    <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
                    <div>
                      <h5 className="text-sm font-medium mb-2">Included Sections:</h5>
                      <div className="space-y-1">
                        {selectedTemplate.sections.map((section) => (
                          <Badge key={section} variant="outline" className="mr-1 mb-1">
                            {section.replace('_', ' ').toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <History className="h-5 w-5" />
              <span>Report History</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No reports generated yet</p>
              ) : (
                <div className="space-y-3">
                  {reportHistory.map((report) => (
                    <div key={report.reportId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">
                            {report.details?.reportType || 'Unknown'} Report
                          </h4>
                          <p className="text-sm text-gray-600">
                            Generated by {report.generatedBy} on {new Date(report.generatedAt).toLocaleDateString()}
                          </p>
                          {report.details?.dateRange && (
                            <p className="text-sm text-gray-500">
                              Period: {new Date(report.details.dateRange.startDate).toLocaleDateString()} - {new Date(report.details.dateRange.endDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">
                            {report.details?.recordCount || 0} records
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ComplianceReports;