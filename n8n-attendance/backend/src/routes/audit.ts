import express from 'express';
import { auditTrailService } from '../services/auditTrailService';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { Response } from 'express';
import pool from '../config/database';
import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';
import path from 'path';

const router = express.Router();

/**
 * Get audit trail with filters
 * GET /api/audit/trail
 */
router.get('/trail', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const filters = {
      entityType: req.query.entityType as string,
      action: req.query.action as string,
      performedBy: req.query.performedBy as string,
      complianceCategory: req.query.complianceCategory as string,
      riskLevel: req.query.riskLevel as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50
    };

    // Log data access
    await auditTrailService.logDataAccess({
      userId: req.user!.id,
      dataType: 'audit_trail',
      accessMethod: 'view',
      dataScope: 'filtered_query',
      justification: 'Compliance audit review'
    }, req);

    const result = await auditTrailService.getAuditTrail(filters);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error: any) {
    console.error('Error fetching audit trail:', error);
    res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
});

/**
 * Get compliance violations
 * GET /api/audit/violations
 */
router.get('/violations', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const filters = {
      violationType: req.query.violationType as string,
      severity: req.query.severity as string,
      userId: req.query.userId as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50
    };

    // Log data access
    await auditTrailService.logDataAccess({
      userId: req.user!.id,
      dataType: 'compliance_violations',
      accessMethod: 'view',
      dataScope: 'filtered_query',
      justification: 'Compliance violation review'
    }, req);

    const result = await auditTrailService.getComplianceViolations(filters);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error: any) {
    console.error('Error fetching compliance violations:', error);
    res.status(500).json({ error: 'Failed to fetch compliance violations' });
  }
});

/**
 * Get compliance statistics
 * GET /api/audit/statistics
 */
router.get('/statistics', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    // Log data access
    await auditTrailService.logDataAccess({
      userId: req.user!.id,
      dataType: 'compliance_statistics',
      accessMethod: 'view',
      dataScope: 'aggregated_data',
      justification: 'Compliance dashboard statistics'
    }, req);

    const statistics = await auditTrailService.getComplianceStatistics(startDate, endDate);
    res.json({
      success: true,
      data: statistics
    });
  } catch (error: any) {
    console.error('Error fetching compliance statistics:', error);
    res.status(500).json({ error: 'Failed to fetch compliance statistics' });
  }
});

/**
 * Resolve compliance violation
 * PUT /api/audit/violations/:id/resolve
 */
router.put('/violations/:id/resolve', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { resolutionNotes, correctiveActions } = req.body;

    if (!resolutionNotes) {
      return res.status(400).json({ error: 'Resolution notes are required' });
    }

    // Log data access
    await auditTrailService.logDataAccess({
      userId: req.user!.id,
      dataType: 'compliance_violations',
      accessMethod: 'update',
      dataScope: `violation_${id}`,
      justification: 'Resolving compliance violation'
    }, req);

    // Update violation status
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE compliance_violations 
         SET status = 'resolved', resolved_at = NOW(), resolved_by = $1, 
             resolution_notes = $2, corrective_actions = $3
         WHERE id = $4`,
        [req.user!.id, resolutionNotes, correctiveActions, id]
      );

      // Log the resolution action
      await auditTrailService.logAuditEntry({
        entityType: 'compliance_violation',
        entityId: id,
        action: 'resolve',
        performedBy: req.user!.id,
        performedByRole: req.user!.role,
        changesSummary: 'Compliance violation resolved',
        reason: resolutionNotes,
        complianceCategory: 'violation_management',
        riskLevel: 'medium',
        metadata: {
          correctiveActions,
          resolutionNotes
        }
      }, req);

      res.json({
        success: true,
        message: 'Compliance violation resolved successfully'
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error resolving compliance violation:', error);
    res.status(500).json({ error: 'Failed to resolve compliance violation' });
  }
});

/**
 * Generate compliance report
 * POST /api/audit/reports/generate
 */
router.post('/reports/generate', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const {
      reportType,
      startDate,
      endDate,
      includeViolations,
      includeAuditTrail,
      includeStatistics,
      format,
      filters
    } = req.body;

    // Log data access
    await auditTrailService.logDataAccess({
      userId: req.user!.id,
      dataType: 'compliance_report',
      accessMethod: 'generate',
      dataScope: `${reportType}_${startDate}_${endDate}`,
      justification: 'Compliance report generation'
    }, req);

    const reportData = await auditTrailService.generateComplianceReport({
      reportType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      includeViolations,
      includeAuditTrail,
      includeStatistics,
      filters
    });

    // Log audit entry for report generation
    await auditTrailService.logAuditEntry({
      entityType: 'compliance_report',
      entityId: `report_${Date.now()}`,
      action: 'generate',
      performedBy: req.user!.id,
      metadata: {
        reportType,
        dateRange: { startDate, endDate },
        format,
        recordCount: reportData.summary.totalRecords
      },
      complianceCategory: 'reporting',
      riskLevel: 'medium'
    }, req);

    if (format === 'json') {
      res.json({
        success: true,
        data: reportData
      });
    } else {
      // For PDF/Excel formats, return the data for client-side generation
      res.json({
        success: true,
        data: reportData,
        format: format
      });
    }
  } catch (error: any) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({ error: 'Failed to generate compliance report' });
  }
});

/**
 * Get available report templates
 * GET /api/audit/reports/templates
 */
router.get('/reports/templates', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const templates = [
      {
        id: 'comprehensive',
        name: 'Comprehensive Compliance Report',
        description: 'Complete audit trail, violations, and statistics',
        sections: ['audit_trail', 'violations', 'statistics', 'summary']
      },
      {
        id: 'violations_only',
        name: 'Violations Report',
        description: 'Focus on compliance violations and resolutions',
        sections: ['violations', 'violation_trends']
      },
      {
        id: 'audit_summary',
        name: 'Audit Summary Report',
        description: 'High-level audit statistics and trends',
        sections: ['statistics', 'trends', 'summary']
      },
      {
        id: 'regulatory',
        name: 'Regulatory Compliance Report',
        description: 'Formatted for regulatory submission',
        sections: ['audit_trail', 'violations', 'remediation', 'certification']
      }
    ];

    res.json({
      success: true,
      data: templates
    });
  } catch (error: any) {
    console.error('Error fetching report templates:', error);
    res.status(500).json({ error: 'Failed to fetch report templates' });
  }
});

/**
 * Get report history
 * GET /api/audit/reports/history
 */
router.get('/reports/history', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        id,
        entity_id as reportId,
        performed_by as generatedBy,
        created_at as generatedAt,
        details,
        ip_address
      FROM audit_trail 
      WHERE entity_type = 'compliance_report' 
        AND action = 'generate'
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM audit_trail 
      WHERE entity_type = 'compliance_report' 
        AND action = 'generate'
    `;

    const [result, countResult] = await Promise.all([
      pool.query(query, [limit, offset]),
      pool.query(countQuery)
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error: any) {
    console.error('Error fetching report history:', error);
    res.status(500).json({ error: 'Failed to fetch report history' });
  }
});

/**
 * Export audit trail to CSV
 * GET /api/audit/export/trail
 */
router.get('/export/trail', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const filters = {
      entityType: req.query.entityType as string,
      action: req.query.action as string,
      performedBy: req.query.performedBy as string,
      complianceCategory: req.query.complianceCategory as string,
      riskLevel: req.query.riskLevel as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      page: 1,
      limit: 10000 // Large limit for bulk export
    };

    // Log data access for export
    await auditTrailService.logDataAccess({
      userId: req.user!.id,
      dataType: 'audit_trail',
      accessMethod: 'bulk_export',
      dataScope: 'csv_export',
      justification: 'External audit review export'
    }, req);

    const result = await auditTrailService.getAuditTrail(filters);
    const filename = `audit-trail-export-${new Date().toISOString().split('T')[0]}`;
    
    // Prepare CSV data
    const csvData = result.data.map(entry => ({
      id: entry.id,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      action: entry.action,
      performed_by: entry.performed_by,
      performed_by_role: entry.performed_by_role || '',
      performed_at: entry.performed_at,
      ip_address: entry.ip_address || '',
      user_agent: entry.user_agent || '',
      changes_summary: entry.changes_summary || '',
      reason: entry.reason || '',
      compliance_category: entry.compliance_category || '',
      risk_level: entry.risk_level || '',
      old_values: JSON.stringify(entry.old_values || {}),
      new_values: JSON.stringify(entry.new_values || {}),
      metadata: JSON.stringify(entry.metadata || {})
    }));

    const csvWriter = createObjectCsvWriter({
      path: `/tmp/${filename}.csv`,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'entity_type', title: 'Entity Type' },
        { id: 'entity_id', title: 'Entity ID' },
        { id: 'action', title: 'Action' },
        { id: 'performed_by', title: 'Performed By' },
        { id: 'performed_by_role', title: 'User Role' },
        { id: 'performed_at', title: 'Performed At' },
        { id: 'ip_address', title: 'IP Address' },
        { id: 'user_agent', title: 'User Agent' },
        { id: 'changes_summary', title: 'Changes Summary' },
        { id: 'reason', title: 'Reason' },
        { id: 'compliance_category', title: 'Compliance Category' },
        { id: 'risk_level', title: 'Risk Level' },
        { id: 'old_values', title: 'Old Values' },
        { id: 'new_values', title: 'New Values' },
        { id: 'metadata', title: 'Metadata' }
      ]
    });

    await csvWriter.writeRecords(csvData);
    
    // Log audit entry for export
    await auditTrailService.logAuditEntry({
      entityType: 'audit_trail',
      entityId: 'bulk_export',
      action: 'export_csv',
      performedBy: req.user!.id,
      metadata: {
        exportType: 'audit_trail',
        recordCount: csvData.length,
        filters: filters
      },
      complianceCategory: 'data_export',
      riskLevel: 'medium'
    }, req);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    
    const fileStream = fs.createReadStream(`/tmp/${filename}.csv`);
    fileStream.pipe(res);
    
    fileStream.on('end', () => {
      fs.unlinkSync(`/tmp/${filename}.csv`);
    });
  } catch (error: any) {
    console.error('Error exporting audit trail:', error);
    res.status(500).json({ error: 'Failed to export audit trail' });
  }
});

/**
 * Export compliance violations to CSV
 * GET /api/audit/export/violations
 */
router.get('/export/violations', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const filters = {
      status: req.query.status as string,
      severity: req.query.severity as string,
      violationType: req.query.violationType as string,
      userId: req.query.userId as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      page: 1,
      limit: 10000 // Large limit for bulk export
    };

    // Log data access for export
    await auditTrailService.logDataAccess({
      userId: req.user!.id,
      dataType: 'compliance_violations',
      accessMethod: 'bulk_export',
      dataScope: 'csv_export',
      justification: 'External compliance review export'
    }, req);

    const result = await auditTrailService.getComplianceViolations(filters);
    const filename = `violations-export-${new Date().toISOString().split('T')[0]}`;
    
    // Prepare CSV data
    const csvData = result.data.map(violation => ({
      id: violation.id,
      violation_type: violation.violation_type,
      severity: violation.severity,
      entity_type: violation.entity_type || '',
      entity_id: violation.entity_id || '',
      user_id: violation.user_id || '',
      username: violation.username || '',
      description: violation.description,
      detection_method: violation.detection_method,
      impact_assessment: violation.impact_assessment || '',
      status: violation.status,
      detected_at: violation.detected_at,
      resolved_at: violation.resolved_at || '',
      resolved_by: violation.resolved_by || '',
      resolution_notes: violation.resolution_notes || '',
      corrective_actions: violation.corrective_actions || '',
      metadata: JSON.stringify(violation.metadata || {})
    }));

    const csvWriter = createObjectCsvWriter({
      path: `/tmp/${filename}.csv`,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'violation_type', title: 'Violation Type' },
        { id: 'severity', title: 'Severity' },
        { id: 'entity_type', title: 'Entity Type' },
        { id: 'entity_id', title: 'Entity ID' },
        { id: 'user_id', title: 'User ID' },
        { id: 'username', title: 'Username' },
        { id: 'description', title: 'Description' },
        { id: 'detection_method', title: 'Detection Method' },
        { id: 'impact_assessment', title: 'Impact Assessment' },
        { id: 'status', title: 'Status' },
        { id: 'detected_at', title: 'Detected At' },
        { id: 'resolved_at', title: 'Resolved At' },
        { id: 'resolved_by', title: 'Resolved By' },
        { id: 'resolution_notes', title: 'Resolution Notes' },
        { id: 'corrective_actions', title: 'Corrective Actions' },
        { id: 'metadata', title: 'Metadata' }
      ]
    });

    await csvWriter.writeRecords(csvData);
    
    // Log audit entry for export
    await auditTrailService.logAuditEntry({
      entityType: 'compliance_violations',
      entityId: 'bulk_export',
      action: 'export_csv',
      performedBy: req.user!.id,
      metadata: {
        exportType: 'violations',
        recordCount: csvData.length,
        filters: filters
      },
      complianceCategory: 'data_export',
      riskLevel: 'medium'
    }, req);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    
    const fileStream = fs.createReadStream(`/tmp/${filename}.csv`);
    fileStream.pipe(res);
    
    fileStream.on('end', () => {
      fs.unlinkSync(`/tmp/${filename}.csv`);
    });
  } catch (error: any) {
    console.error('Error exporting violations:', error);
    res.status(500).json({ error: 'Failed to export violations' });
  }
});

/**
 * Export comprehensive compliance report to CSV
 * POST /api/audit/export/compliance-report
 */
router.post('/export/compliance-report', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const {
      reportType,
      startDate,
      endDate,
      includeViolations,
      includeAuditTrail,
      includeStatistics,
      filters
    } = req.body;

    // Log data access for export
    await auditTrailService.logDataAccess({
      userId: req.user!.id,
      dataType: 'compliance_report',
      accessMethod: 'bulk_export',
      dataScope: `${reportType}_csv_export`,
      justification: 'External compliance report export'
    }, req);

    const reportData = await auditTrailService.generateComplianceReport({
      reportType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      includeViolations,
      includeAuditTrail,
      includeStatistics,
      filters
    });

    const filename = `compliance-report-${reportType}-${new Date().toISOString().split('T')[0]}`;
    const workbook = [];

    // Summary data
    const summaryData = [
      ['Report Type', reportData.metadata.reportType],
      ['Generated Date', new Date(reportData.metadata.generatedAt).toLocaleDateString()],
      ['Start Date', new Date(reportData.metadata.dateRange.startDate).toLocaleDateString()],
      ['End Date', new Date(reportData.metadata.dateRange.endDate).toLocaleDateString()],
      ['Generated By', reportData.metadata.generatedBy],
      ['Total Records', reportData.summary.totalRecords],
      ['Total Violations', reportData.summary.totalViolations],
      ['Resolved Violations', reportData.summary.resolvedViolations],
      ['Critical Violations', reportData.summary.criticalViolations],
      ['Compliance Score', `${reportData.summary.complianceScore}%`]
    ];

    // Create summary CSV
    const summaryWriter = createObjectCsvWriter({
      path: `/tmp/${filename}-summary.csv`,
      header: [
        { id: 'metric', title: 'Metric' },
        { id: 'value', title: 'Value' }
      ]
    });

    const summaryRecords = summaryData.map(([metric, value]) => ({ metric, value }));
    await summaryWriter.writeRecords(summaryRecords);

    // If violations are included, create violations CSV
    if (includeViolations && reportData.violations) {
      const violationsWriter = createObjectCsvWriter({
        path: `/tmp/${filename}-violations.csv`,
        header: [
          { id: 'id', title: 'ID' },
          { id: 'violation_type', title: 'Violation Type' },
          { id: 'severity', title: 'Severity' },
          { id: 'description', title: 'Description' },
          { id: 'status', title: 'Status' },
          { id: 'detected_at', title: 'Detected At' },
          { id: 'resolved_at', title: 'Resolved At' }
        ]
      });
      await violationsWriter.writeRecords(reportData.violations.entries);
    }

    // If audit trail is included, create audit trail CSV
    if (includeAuditTrail && reportData.auditTrail) {
      const auditWriter = createObjectCsvWriter({
        path: `/tmp/${filename}-audit-trail.csv`,
        header: [
          { id: 'id', title: 'ID' },
          { id: 'entity_type', title: 'Entity Type' },
          { id: 'action', title: 'Action' },
          { id: 'performed_by', title: 'Performed By' },
          { id: 'performed_at', title: 'Performed At' },
          { id: 'risk_level', title: 'Risk Level' }
        ]
      });
      await auditWriter.writeRecords(reportData.auditTrail.entries);
    }

    // Log audit entry for export
    await auditTrailService.logAuditEntry({
      entityType: 'compliance_report',
      entityId: `export_${Date.now()}`,
      action: 'export_csv',
      performedBy: req.user!.id,
      metadata: {
        reportType,
        dateRange: { startDate, endDate },
        format: 'csv',
        recordCount: reportData.summary.totalRecords,
        includeViolations,
        includeAuditTrail
      },
      complianceCategory: 'reporting',
      riskLevel: 'medium'
    }, req);

    // Send the summary file as response
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}-summary.csv"`);
    
    const fileStream = fs.createReadStream(`/tmp/${filename}-summary.csv`);
    fileStream.pipe(res);
    
    fileStream.on('end', () => {
      // Clean up temporary files
      fs.unlinkSync(`/tmp/${filename}-summary.csv`);
      if (fs.existsSync(`/tmp/${filename}-violations.csv`)) {
        fs.unlinkSync(`/tmp/${filename}-violations.csv`);
      }
      if (fs.existsSync(`/tmp/${filename}-audit-trail.csv`)) {
        fs.unlinkSync(`/tmp/${filename}-audit-trail.csv`);
      }
    });
  } catch (error: any) {
    console.error('Error exporting compliance report:', error);
    res.status(500).json({ error: 'Failed to export compliance report' });
  }
});

export default router;