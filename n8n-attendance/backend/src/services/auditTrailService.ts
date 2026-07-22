import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

export interface AuditTrailEntry {
  id?: string;
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  performedByRole?: string;
  performedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  oldValues?: any;
  newValues?: any;
  changesSummary?: string;
  reason?: string;
  sessionId?: string;
  requestId?: string;
  complianceCategory?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: any;
}

export interface AccessLogEntry {
  userId?: string;
  accessType: string;
  ipAddress: string;
  userAgent?: string;
  locationInfo?: any;
  success: boolean;
  failureReason?: string;
  sessionDuration?: number;
  mfaUsed?: boolean;
  deviceFingerprint?: string;
}

export interface DataAccessLogEntry {
  userId: string;
  accessedUserId?: string;
  dataType: string;
  accessMethod: string;
  dataScope?: string;
  justification?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ComplianceViolation {
  id?: string;
  violation_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  description: string;
  detection_method: string;
  impact_assessment?: string;
  status?: 'open' | 'investigating' | 'resolved';
  detected_at?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  corrective_actions?: string;
  metadata?: any;
}

export interface AuditFilters {
  entityType?: string;
  action?: string;
  performedBy?: string;
  complianceCategory?: string;
  riskLevel?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface ComplianceReportFilters {
  reportType: 'comprehensive' | 'violations_only' | 'audit_summary' | 'regulatory';
  startDate: Date;
  endDate: Date;
  includeViolations?: boolean;
  includeAuditTrail?: boolean;
  includeStatistics?: boolean;
  filters?: {
    entityType?: string;
    complianceCategory?: string;
    riskLevel?: string;
    userId?: string;
    violationType?: string;
    severity?: string;
  };
}

export interface ComplianceReportData {
  metadata: {
    reportType: string;
    generatedAt: Date;
    dateRange: {
      startDate: Date;
      endDate: Date;
    };
    generatedBy: string;
  };
  summary: {
    totalRecords: number;
    totalViolations: number;
    resolvedViolations: number;
    criticalViolations: number;
    complianceScore: number;
  };
  auditTrail?: {
    entries: any[];
    totalEntries: number;
  };
  violations?: {
    entries: any[];
    totalViolations: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  statistics?: {
    auditStats: any;
    violationStats: any;
    accessStats: any;
  };
  trends?: {
    violationTrends: Array<{
      period: string;
      count: number;
      resolved: number;
    }>;
    auditActivityTrends: Array<{
      period: string;
      count: number;
    }>;
  };
}

export interface ViolationDetectionRule {
  id: string;
  name: string;
  description: string;
  category: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  conditions: ViolationCondition[];
  actions: ViolationAction[];
  isActive: boolean;
}

export interface ViolationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'pattern_match';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface ViolationAction {
  type: 'create_violation' | 'send_alert' | 'escalate' | 'log_audit';
  parameters: Record<string, any>;
}

class AuditTrailService {
  /**
   * Log an audit trail entry
   */
  async logAuditEntry(entry: AuditTrailEntry, req?: AuthRequest): Promise<string> {
    const client = await pool.connect();
    try {
      // Extract request information if available
      const ipAddress = req?.ip || entry.ipAddress;
      const userAgent = req?.get('User-Agent') || entry.userAgent;
      const requestId = req?.headers['x-request-id'] as string || entry.requestId;

      const result = await client.query(
        `INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, ip_address, user_agent,
          old_values, new_values, changes_summary, reason, request_id,
          compliance_category, risk_level, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id`,
        [
          entry.entityType,
          entry.entityId,
          entry.action,
          entry.performedBy,
          ipAddress,
          userAgent,
          entry.oldValues ? JSON.stringify(entry.oldValues) : null,
          entry.newValues ? JSON.stringify(entry.newValues) : null,
          entry.changesSummary,
          entry.reason,
          requestId,
          entry.complianceCategory,
          entry.riskLevel || 'low',
          entry.metadata ? JSON.stringify(entry.metadata) : null
        ]
      );

      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  /**
   * Log access attempt
   */
  async logAccess(entry: AccessLogEntry): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO access_logs (
          user_id, access_type, ip_address, user_agent, location_info,
          success, failure_reason, session_duration, mfa_used, device_fingerprint
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          entry.userId,
          entry.accessType,
          entry.ipAddress,
          entry.userAgent,
          entry.locationInfo ? JSON.stringify(entry.locationInfo) : null,
          entry.success,
          entry.failureReason,
          entry.sessionDuration,
          entry.mfaUsed || false,
          entry.deviceFingerprint
        ]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Log data access
   */
  async logDataAccess(entry: DataAccessLogEntry, req?: AuthRequest): Promise<void> {
    const client = await pool.connect();
    try {
      const ipAddress = req?.ip || entry.ipAddress;
      const userAgent = req?.get('User-Agent') || entry.userAgent;

      await client.query(
        `INSERT INTO data_access_logs (
          user_id, accessed_user_id, data_type, access_method, data_scope,
          justification, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          entry.userId,
          entry.accessedUserId,
          entry.dataType,
          entry.accessMethod,
          entry.dataScope,
          entry.justification,
          ipAddress,
          userAgent
        ]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Record compliance violation
   */
  async recordViolation(violation: ComplianceViolation): Promise<string> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO compliance_violations (
          violation_type, severity, entity_type, entity_id, user_id,
          description, detection_method, impact_assessment, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          violation.violation_type,
          violation.severity,
          violation.entity_type,
          violation.entity_id,
          violation.user_id,
          violation.description,
          violation.detection_method,
          violation.impact_assessment,
          violation.metadata ? JSON.stringify(violation.metadata) : '{}'
        ]
      );

      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  /**
   * Get audit trail with filters
   */
  async getAuditTrail(filters: AuditFilters = {}) {
    const client = await pool.connect();
    try {
      let query = `
        SELECT 
          at.*,
          u.first_name || ' ' || u.last_name as performed_by_name,
          u.email as performed_by_email
        FROM audit_trail at
        LEFT JOIN users u ON at.performed_by = u.id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramCount = 0;

      if (filters.entityType) {
        query += ` AND at.entity_type = $${++paramCount}`;
        params.push(filters.entityType);
      }

      if (filters.action) {
        query += ` AND at.action = $${++paramCount}`;
        params.push(filters.action);
      }

      if (filters.performedBy) {
        query += ` AND at.performed_by = $${++paramCount}`;
        params.push(filters.performedBy);
      }

      if (filters.complianceCategory) {
        query += ` AND at.compliance_category = $${++paramCount}`;
        params.push(filters.complianceCategory);
      }

      if (filters.riskLevel) {
        query += ` AND at.risk_level = $${++paramCount}`;
        params.push(filters.riskLevel);
      }

      if (filters.startDate) {
        query += ` AND at.performed_at >= $${++paramCount}`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND at.performed_at <= $${++paramCount}`;
        params.push(filters.endDate);
      }

      query += ` ORDER BY at.performed_at DESC`;

      // Add pagination
      const limit = filters.limit || 50;
      const offset = ((filters.page || 1) - 1) * limit;
      query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
      params.push(limit, offset);

      const result = await client.query(query, params);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM audit_trail at
        WHERE 1=1
      `;
      
      const countParams = params.slice(0, -2); // Remove limit and offset
      let countParamCount = 0;

      if (filters.entityType) {
        countQuery += ` AND at.entity_type = $${++countParamCount}`;
      }
      if (filters.action) {
        countQuery += ` AND at.action = $${++countParamCount}`;
      }
      if (filters.performedBy) {
        countQuery += ` AND at.performed_by = $${++countParamCount}`;
      }
      if (filters.complianceCategory) {
        countQuery += ` AND at.compliance_category = $${++countParamCount}`;
      }
      if (filters.riskLevel) {
        countQuery += ` AND at.risk_level = $${++countParamCount}`;
      }
      if (filters.startDate) {
        countQuery += ` AND at.performed_at >= $${++countParamCount}`;
      }
      if (filters.endDate) {
        countQuery += ` AND at.performed_at <= $${++countParamCount}`;
      }

      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      return {
        data: result.rows,
        pagination: {
          page: filters.page || 1,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get compliance violations
   */
  async getComplianceViolations(filters: any = {}) {
    const client = await pool.connect();
    try {
      let query = `
        SELECT 
          cv.*,
          u.first_name || ' ' || u.last_name as user_name,
          u.email as user_email,
          resolver.first_name || ' ' || resolver.last_name as resolved_by_name
        FROM compliance_violations cv
        LEFT JOIN users u ON cv.user_id = u.id
        LEFT JOIN users resolver ON cv.resolved_by = resolver.id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramCount = 0;

      if (filters.status) {
        query += ` AND cv.status = $${++paramCount}`;
        params.push(filters.status);
      }

      if (filters.severity) {
        query += ` AND cv.severity = $${++paramCount}`;
        params.push(filters.severity);
      }

      if (filters.violationType) {
        query += ` AND cv.violation_type = $${++paramCount}`;
        params.push(filters.violationType);
      }

      if (filters.userId) {
        query += ` AND cv.user_id = $${++paramCount}`;
        params.push(filters.userId);
      }

      if (filters.startDate) {
        query += ` AND cv.detected_at >= $${++paramCount}`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND cv.detected_at <= $${++paramCount}`;
        params.push(filters.endDate);
      }

      query += ` ORDER BY cv.detected_at DESC`;

      // Add pagination
      const limit = filters.limit || 50;
      const offset = ((filters.page || 1) - 1) * limit;
      query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
      params.push(limit, offset);

      const result = await client.query(query, params);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM compliance_violations cv
        WHERE 1=1
      `;
      
      const countParams = params.slice(0, -2); // Remove limit and offset
      let countParamCount = 0;

      if (filters.status) {
        countQuery += ` AND cv.status = $${++countParamCount}`;
      }
      if (filters.severity) {
        countQuery += ` AND cv.severity = $${++countParamCount}`;
      }
      if (filters.violationType) {
        countQuery += ` AND cv.violation_type = $${++countParamCount}`;
      }
      if (filters.userId) {
        countQuery += ` AND cv.user_id = $${++countParamCount}`;
      }
      if (filters.startDate) {
        countQuery += ` AND cv.detected_at >= $${++countParamCount}`;
      }
      if (filters.endDate) {
        countQuery += ` AND cv.detected_at <= $${++countParamCount}`;
      }

      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      return {
        data: result.rows,
        pagination: {
          page: filters.page || 1,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get compliance statistics
   */
  async getComplianceStatistics(startDate?: Date, endDate?: Date) {
    const client = await pool.connect();
    try {
      const params: any[] = [];
      let whereClause = '';
      
      if (startDate && endDate) {
        whereClause = 'WHERE performed_at BETWEEN $1 AND $2';
        params.push(startDate, endDate);
      }
  
      // Get audit trail statistics
      const auditStats = await client.query(`
        SELECT 
          COUNT(*) as total_activities,
          COUNT(DISTINCT performed_by) as active_users,
          COUNT(CASE WHEN risk_level = 'high' OR risk_level = 'critical' THEN 1 END) as high_risk_activities
        FROM audit_trail ${whereClause}
      `, params);
  
      // Get violation statistics
      const violationStats = await client.query(`
        SELECT 
          COUNT(*) as total_violations,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_violations,
          COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_violations
        FROM compliance_violations
        ${startDate && endDate ? 'WHERE detected_at BETWEEN $1 AND $2' : ''}
      `, params);
  
      // Get access statistics
      const accessStats = await client.query(`
        SELECT 
          COUNT(*) as total_access_attempts,
          COUNT(CASE WHEN success = false THEN 1 END) as failed_attempts,
          COUNT(DISTINCT user_id) as unique_users
        FROM access_logs
        ${startDate && endDate ? 'WHERE timestamp BETWEEN $1 AND $2' : ''}
      `, params);
  
      return {
        auditStats: auditStats.rows[0],
        violationStats: violationStats.rows[0],
        accessStats: accessStats.rows[0]
      };
    } finally {
      client.release();
    }
  }

  async generateComplianceReport(filters: ComplianceReportFilters): Promise<ComplianceReportData> {
    const reportData: ComplianceReportData = {
      metadata: {
        reportType: filters.reportType,
        generatedAt: new Date(),
        dateRange: {
          startDate: filters.startDate,
          endDate: filters.endDate
        },
        generatedBy: 'system' // This should be passed from the request
      },
      summary: {
        totalRecords: 0,
        totalViolations: 0,
        resolvedViolations: 0,
        criticalViolations: 0,
        complianceScore: 0
      }
    };

    // Get audit trail data if requested
    if (filters.includeAuditTrail || filters.reportType === 'comprehensive' || filters.reportType === 'regulatory') {
      const auditFilters = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        entityType: filters.filters?.entityType,
        complianceCategory: filters.filters?.complianceCategory,
        riskLevel: filters.filters?.riskLevel,
        performedBy: filters.filters?.userId,
        page: 1,
        limit: 1000 // Get all records for report
      };

      const auditResult = await this.getAuditTrail(auditFilters);
      reportData.auditTrail = {
        entries: auditResult.data,
        totalEntries: auditResult.pagination.total
      };
      reportData.summary.totalRecords += auditResult.pagination.total;
    }

    // Get violations data if requested
    if (filters.includeViolations || filters.reportType === 'comprehensive' || filters.reportType === 'violations_only' || filters.reportType === 'regulatory') {
      const violationFilters = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        violationType: filters.filters?.violationType,
        severity: filters.filters?.severity,
        userId: filters.filters?.userId,
        page: 1,
        limit: 1000
      };

      const violationsResult = await this.getComplianceViolations(violationFilters);
      
      // Calculate violation statistics
      const byCategory: Record<string, number> = {};
      const bySeverity: Record<string, number> = {};
      let resolvedCount = 0;
      let criticalCount = 0;

      violationsResult.data.forEach((violation: any) => {
        byCategory[violation.violation_type] = (byCategory[violation.violation_type] || 0) + 1;
        bySeverity[violation.severity] = (bySeverity[violation.severity] || 0) + 1;
        
        if (violation.status === 'resolved') resolvedCount++;
        if (violation.severity === 'critical') criticalCount++;
      });

      reportData.violations = {
        entries: violationsResult.data,
        totalViolations: violationsResult.pagination.total,
        byCategory,
        bySeverity
      };

      reportData.summary.totalViolations = violationsResult.pagination.total;
      reportData.summary.resolvedViolations = resolvedCount;
      reportData.summary.criticalViolations = criticalCount;
    }

    // Get statistics if requested
    if (filters.includeStatistics || filters.reportType === 'comprehensive' || filters.reportType === 'audit_summary') {
      reportData.statistics = await this.getComplianceStatistics(filters.startDate, filters.endDate);
    }

    // Generate trends data
    if (filters.reportType === 'comprehensive' || filters.reportType === 'audit_summary') {
      reportData.trends = await this.generateTrendsData(filters.startDate, filters.endDate);
    }

    // Calculate compliance score
    if (reportData.summary.totalViolations > 0) {
      reportData.summary.complianceScore = Math.round(
        ((reportData.summary.totalViolations - reportData.summary.criticalViolations) / reportData.summary.totalViolations) * 100
      );
    } else {
      reportData.summary.complianceScore = 100;
    }

    return reportData;
  }

  private async generateTrendsData(startDate: Date, endDate: Date) {
    // Generate weekly violation trends
    const violationTrendsQuery = `
      SELECT 
        DATE_TRUNC('week', created_at) as period,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved
      FROM compliance_violations
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY period
    `;

    // Generate weekly audit activity trends
    const auditTrendsQuery = `
      SELECT 
        DATE_TRUNC('week', created_at) as period,
        COUNT(*) as count
      FROM audit_trail
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY period
    `;

    const [violationTrends, auditTrends] = await Promise.all([
      pool.query(violationTrendsQuery, [startDate, endDate]),
      pool.query(auditTrendsQuery, [startDate, endDate])
    ]);

    return {
      violationTrends: violationTrends.rows.map(row => ({
        period: row.period.toISOString().split('T')[0],
        count: parseInt(row.count),
        resolved: parseInt(row.resolved)
      })),
      auditActivityTrends: auditTrends.rows.map(row => ({
        period: row.period.toISOString().split('T')[0],
        count: parseInt(row.count)
      }))
    };
  }

  /**
   * Enhanced violation detection with automated rules
   */
  async detectViolations(auditEntry: AuditTrailEntry): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    const detectionRules = await this.getActiveDetectionRules();

    for (const rule of detectionRules) {
      if (await this.evaluateRule(rule, auditEntry)) {
        const violation = await this.createViolationFromRule(rule, auditEntry);
        violations.push(violation);
        
        // Execute rule actions
        await this.executeRuleActions(rule, violation, auditEntry);
      }
    }

    return violations;
  }

  /**
   * Get active detection rules
   */
  private async getActiveDetectionRules(): Promise<ViolationDetectionRule[]> {
    const query = `
      SELECT * FROM violation_detection_rules 
      WHERE is_active = true 
      ORDER BY priority DESC
    `;
    
    const result = await pool.query(query);
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      riskLevel: row.risk_level,
      conditions: JSON.parse(row.conditions),
      actions: JSON.parse(row.actions),
      isActive: row.is_active
    }));
  }

  /**
   * Evaluate if a rule matches an audit entry
   */
  private async evaluateRule(rule: ViolationDetectionRule, auditEntry: AuditTrailEntry): Promise<boolean> {
    let result = true;
    let currentLogicalOperator = 'AND';

    for (const condition of rule.conditions) {
      const conditionResult = this.evaluateCondition(condition, auditEntry);
      
      if (currentLogicalOperator === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }
      
      currentLogicalOperator = condition.logicalOperator || 'AND';
    }

    return result;
  }

  /**
   * Evaluate individual condition
   */
  private evaluateCondition(condition: ViolationCondition, auditEntry: AuditTrailEntry): boolean {
    const fieldValue = this.getFieldValue(condition.field, auditEntry);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'pattern_match':
        return new RegExp(condition.value).test(String(fieldValue));
      default:
        return false;
    }
  }

  /**
   * Get field value from audit entry
   */
  private getFieldValue(field: string, auditEntry: AuditTrailEntry): any {
    const fieldParts = field.split('.');
    let value: any = auditEntry;
    
    for (const part of fieldParts) {
      value = value?.[part];
    }
    
    return value;
  }

  /**
   * Create violation from rule
   */
  private async createViolationFromRule(rule: ViolationDetectionRule, auditEntry: AuditTrailEntry): Promise<ComplianceViolation> {
    const violation: ComplianceViolation = {
      id: uuidv4(),
      violation_type: rule.category,
      severity: rule.riskLevel,
      entity_type: auditEntry.entityType,
      entity_id: auditEntry.entityId,
      user_id: auditEntry.performedBy,
      description: `${rule.name}: ${rule.description}`,
      detection_method: 'automated_rule',
      impact_assessment: this.generateImpactAssessment(rule, auditEntry),
      status: 'open',
      detected_at: new Date().toISOString(),
      metadata: {
        ruleId: rule.id,
        ruleName: rule.name,
        auditEntryId: auditEntry.id,
        detectionContext: {
          action: auditEntry.action,
          entityType: auditEntry.entityType,
          riskLevel: auditEntry.riskLevel
        }
      }
    };

    // Save violation to database
    await this.saveComplianceViolation(violation);
    return violation;
  }

  /**
   * Execute rule actions
   */
  private async executeRuleActions(rule: ViolationDetectionRule, violation: ComplianceViolation, auditEntry: AuditTrailEntry): Promise<void> {
    for (const action of rule.actions) {
      switch (action.type) {
        case 'send_alert':
          await this.sendViolationAlert(violation, action.parameters);
          break;
        case 'escalate':
          await this.escalateViolation(violation, action.parameters);
          break;
        case 'log_audit':
          await this.logAuditEntry({
            entityType: 'compliance_violation',
            entityId: violation.id || uuidv4(), // Ensure we have a valid ID
            action: 'auto_detected',
            performedBy: 'system',
            metadata: {
              ruleId: rule.id,
              originalAuditEntry: auditEntry.id,
              severity: violation.severity
            },
            complianceCategory: 'violation_detection',
            riskLevel: rule.riskLevel
          });
          break;
      }
    }
  }

  /**
   * Generate impact assessment
   */
  private generateImpactAssessment(rule: ViolationDetectionRule, auditEntry: AuditTrailEntry): string {
    const impacts = {
      low: 'Minimal impact on compliance posture',
      medium: 'Moderate impact requiring attention',
      high: 'Significant impact requiring immediate action',
      critical: 'Critical impact requiring urgent intervention'
    };
    
    return impacts[rule.riskLevel] || 'Impact assessment pending';
  }

  /**
   * Send violation alert
   */
  private async sendViolationAlert(violation: ComplianceViolation, parameters: Record<string, any>): Promise<void> {
    // Implementation for sending alerts (email, notifications, etc.)
    console.log(`Sending violation alert for ${violation.id}`, parameters);
  }

  /**
   * Escalate violation
   */
  private async escalateViolation(violation: ComplianceViolation, parameters: Record<string, any>): Promise<void> {
    // Implementation for escalating violations
    console.log(`Escalating violation ${violation.id}`, parameters);
  }

  /**
   * Save compliance violation
   */
  private async saveComplianceViolation(violation: ComplianceViolation): Promise<void> {
    const query = `
      INSERT INTO compliance_violations (
        id, violation_type, severity, entity_type, entity_id, user_id,
        description, detection_method, impact_assessment, status,
        detected_at, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
    `;
    
    await pool.query(query, [
      violation.id,
      violation.violation_type,
      violation.severity,
      violation.entity_type,
      violation.entity_id,
      violation.user_id,
      violation.description,
      violation.detection_method,
      violation.impact_assessment,
      violation.status,
      violation.detected_at,
      JSON.stringify(violation.metadata)
    ]);
  }

  /**
   * Initialize default detection rules
   */
  async initializeDefaultDetectionRules(): Promise<void> {
    const defaultRules: Omit<ViolationDetectionRule, 'id'>[] = [
      {
        name: 'Suspicious Login Activity',
        description: 'Multiple failed login attempts from same IP',
        category: 'security_breach',
        riskLevel: 'high',
        conditions: [
          { field: 'action', operator: 'equals', value: 'login_failed' },
          { field: 'metadata.attempt_count', operator: 'greater_than', value: 5 }
        ],
        actions: [
          { type: 'create_violation', parameters: {} },
          { type: 'send_alert', parameters: { recipients: ['security@company.com'] } }
        ],
        isActive: true
      },
      {
        name: 'Unauthorized Data Access',
        description: 'Access to sensitive data outside business hours',
        category: 'data_access_violation',
        riskLevel: 'critical',
        conditions: [
          { field: 'entity_type', operator: 'equals', value: 'sensitive_data' },
          { field: 'metadata.access_time', operator: 'pattern_match', value: '^(2[2-3]|0[0-6]):' }
        ],
        actions: [
          { type: 'create_violation', parameters: {} },
          { type: 'escalate', parameters: { level: 'immediate' } },
          { type: 'log_audit', parameters: {} }
        ],
        isActive: true
      },
      {
        name: 'Privilege Escalation',
        description: 'User role or permissions changed',
        category: 'privilege_violation',
        riskLevel: 'high',
        conditions: [
          { field: 'action', operator: 'contains', value: 'role_change' },
          { field: 'old_values.role', operator: 'not_equals', value: 'new_values.role' }
        ],
        actions: [
          { type: 'create_violation', parameters: {} },
          { type: 'send_alert', parameters: { recipients: ['admin@company.com'] } }
        ],
        isActive: true
      }
    ];

    for (const rule of defaultRules) {
      await this.createDetectionRule(rule);
    }
  }

  /**
   * Create detection rule
   */
  private async createDetectionRule(rule: Omit<ViolationDetectionRule, 'id'>): Promise<void> {
    const query = `
      INSERT INTO violation_detection_rules (
        id, name, description, category, risk_level, conditions, actions, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (name) DO NOTHING
    `;
    
    await pool.query(query, [
      uuidv4(),
      rule.name,
      rule.description,
      rule.category,
      rule.riskLevel,
      JSON.stringify(rule.conditions),
      JSON.stringify(rule.actions),
      rule.isActive
    ]);
  }
}
export const auditTrailService = new AuditTrailService();