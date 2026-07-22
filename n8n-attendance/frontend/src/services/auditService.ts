import axios from 'axios';
import api from './api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface AuditTrailEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string;
  performed_by_role?: string;
  performed_at: string;
  ip_address?: string;
  user_agent?: string;
  old_values?: any;
  new_values?: any;
  changes_summary?: string;
  reason?: string;
  compliance_category?: string;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: any;
}

export interface ComplianceViolation {
  id: string;
  violation_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  username?: string;
  description: string;
  detection_method: string;
  impact_assessment?: string;
  status: 'open' | 'investigating' | 'resolved';
  detected_at: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  corrective_actions?: string;
  metadata?: any;
}

export interface ComplianceStatistics {
  auditTrail: {
    total_activities: number;
    active_users: number;
    high_risk_activities: number;
  };
  violations: {
    total_violations: number;
    open_violations: number;
    critical_violations: number;
  };
  access: {
    total_access_attempts: number;
    failed_attempts: number;
    unique_users: number;
  };
}

export interface AuditFilters {
  entityType?: string;
  action?: string;
  performedBy?: string;
  complianceCategory?: string;
  riskLevel?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ViolationFilters {
  status?: string;
  severity?: string;
  violationType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ComplianceReportFilters {
  reportType: 'comprehensive' | 'violations_only' | 'audit_summary' | 'regulatory';
  startDate: string;
  endDate: string;
  includeViolations?: boolean;
  includeAuditTrail?: boolean;
  includeStatistics?: boolean;
  format?: 'json' | 'pdf' | 'excel';
  filters?: {
    entityType?: string;
    complianceCategory?: string;
    riskLevel?: string;
    userId?: string;
    violationType?: string;
    severity?: string;
  };
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: string[];
}

export interface ReportHistoryEntry {
  reportId: string;
  generatedBy: string;
  generatedAt: string;
  details: any;
  ipAddress: string;
}

export class AuditService {
  /**
   * Get audit trail with filtering and pagination
   */
  async getAuditTrail(filters: AuditFilters = {}): Promise<PaginatedResponse<AuditTrailEntry>> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await api.get(`/audit/trail?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching audit trail:', error);
      throw error;
    }
  }

  /**
   * Get compliance violations with filtering and pagination
   */
  async getComplianceViolations(filters: ViolationFilters = {}): Promise<PaginatedResponse<ComplianceViolation>> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await api.get(`/audit/violations?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching compliance violations:', error);
      throw error;
    }
  }

  /**
   * Get compliance statistics
   */
  async getComplianceStatistics(startDate?: string, endDate?: string): Promise<ComplianceStatistics> {
    try {
      const params = new URLSearchParams();
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get(`/audit/statistics?${params.toString()}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching compliance statistics:', error);
      throw error;
    }
  }

  /**
   * Resolve a compliance violation
   */
  async resolveViolation(violationId: string, resolutionData: {
    resolutionNotes: string;
    correctiveActions?: string;
  }): Promise<void> {
    try {
      await api.put(`/audit/violations/${violationId}/resolve`, resolutionData);
    } catch (error) {
      console.error('Error resolving violation:', error);
      throw error;
    }
  }

  async generateComplianceReport(filters: ComplianceReportFilters): Promise<any> {
    const response = await api.post('/audit/reports/generate', filters);
    return response.data;
  }

  async getReportTemplates(): Promise<ReportTemplate[]> {
    const response = await api.get('/audit/reports/templates');
    return response.data.data;
  }

  async getReportHistory(page: number = 1, limit: number = 20): Promise<PaginatedResponse<ReportHistoryEntry>> {
    const response = await api.get('/audit/reports/history', {
      params: { page, limit }
    });
    return response.data;
  }

  // Export compliance report to PDF
  exportComplianceReportToPDF(reportData: any, filename: string = 'compliance-report') {
    const doc = new jsPDF();
    
    // Add header
    doc.setFontSize(20);
    doc.text('Compliance Report', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Report Type: ${reportData.metadata.reportType}`, 20, 35);
    doc.text(`Generated: ${new Date(reportData.metadata.generatedAt).toLocaleDateString()}`, 20, 45);
    doc.text(`Period: ${new Date(reportData.metadata.dateRange.startDate).toLocaleDateString()} - ${new Date(reportData.metadata.dateRange.endDate).toLocaleDateString()}`, 20, 55);
    
    let yPosition = 70;
    
    // Add summary section
    doc.setFontSize(16);
    doc.text('Summary', 20, yPosition);
    yPosition += 15;
    
    doc.setFontSize(10);
    doc.text(`Total Records: ${reportData.summary.totalRecords}`, 20, yPosition);
    doc.text(`Total Violations: ${reportData.summary.totalViolations}`, 20, yPosition + 10);
    doc.text(`Resolved Violations: ${reportData.summary.resolvedViolations}`, 20, yPosition + 20);
    doc.text(`Critical Violations: ${reportData.summary.criticalViolations}`, 20, yPosition + 30);
    doc.text(`Compliance Score: ${reportData.summary.complianceScore}%`, 20, yPosition + 40);
    
    yPosition += 60;
    
    // Add violations table if present
    if (reportData.violations && reportData.violations.entries.length > 0) {
      doc.setFontSize(16);
      doc.text('Compliance Violations', 20, yPosition);
      yPosition += 10;
      
      const violationColumns = ['Date', 'Type', 'Severity', 'Status', 'Description'];
      const violationRows = reportData.violations.entries.slice(0, 20).map((violation: any) => [
        new Date(violation.created_at).toLocaleDateString(),
        violation.violation_type,
        violation.severity,
        violation.status,
        violation.description.substring(0, 50) + '...'
      ]);
      
      autoTable(doc, {
        head: [violationColumns],
        body: violationRows,
        startY: yPosition,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [220, 53, 69] }
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 20;
    }
    
    // Add audit trail table if present
    if (reportData.auditTrail && reportData.auditTrail.entries.length > 0) {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(16);
      doc.text('Audit Trail', 20, yPosition);
      yPosition += 10;
      
      const auditColumns = ['Date', 'Entity', 'Action', 'User', 'Risk Level'];
      const auditRows = reportData.auditTrail.entries.slice(0, 20).map((entry: any) => [
        new Date(entry.created_at).toLocaleDateString(),
        entry.entity_type,
        entry.action,
        entry.performed_by,
        entry.risk_level
      ]);
      
      autoTable(doc, {
        head: [auditColumns],
        body: auditRows,
        startY: yPosition,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [40, 167, 69] }
      });
    }
    
    doc.save(`${filename}.pdf`);
  }

  // Export compliance report to Excel
  exportComplianceReportToExcel(reportData: any, filename: string = 'compliance-report') {
    const workbook = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['Metric', 'Value'],
      ['Report Type', reportData.metadata.reportType],
      ['Generated Date', new Date(reportData.metadata.generatedAt).toLocaleDateString()],
      ['Start Date', new Date(reportData.metadata.dateRange.startDate).toLocaleDateString()],
      ['End Date', new Date(reportData.metadata.dateRange.endDate).toLocaleDateString()],
      ['Total Records', reportData.summary.totalRecords],
      ['Total Violations', reportData.summary.totalViolations],
      ['Resolved Violations', reportData.summary.resolvedViolations],
      ['Critical Violations', reportData.summary.criticalViolations],
      ['Compliance Score', `${reportData.summary.complianceScore}%`]
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    
    // Violations sheet
    if (reportData.violations && reportData.violations.entries.length > 0) {
      const violationsSheet = XLSX.utils.json_to_sheet(reportData.violations.entries);
      XLSX.utils.book_append_sheet(workbook, violationsSheet, 'Violations');
    }
    
    // Audit trail sheet
    if (reportData.auditTrail && reportData.auditTrail.entries.length > 0) {
      const auditSheet = XLSX.utils.json_to_sheet(reportData.auditTrail.entries);
      XLSX.utils.book_append_sheet(workbook, auditSheet, 'Audit Trail');
    }
    
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  }

  // Export audit trail to CSV
  async exportAuditTrailToCSV(filters: AuditFilters, filename: string = 'audit-trail-export') {
    const response = await api.get('/audit/export/trail', {
      params: filters,
      responseType: 'blob'
    });
    
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Export violations to CSV
  async exportViolationsToCSV(filters: ViolationFilters, filename: string = 'violations-export') {
    const response = await api.get('/audit/export/violations', {
      params: filters,
      responseType: 'blob'
    });
    
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Export comprehensive compliance report to CSV
  async exportComplianceReportToCSV(filters: ComplianceReportFilters, filename: string = 'compliance-report-export') {
    const response = await api.post('/audit/export/compliance-report', filters, {
      responseType: 'blob'
    });
    
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const auditService = new AuditService();