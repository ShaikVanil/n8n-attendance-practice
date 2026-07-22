import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

export interface DataRetentionPolicy {
  id?: string;
  data_type: string;
  retention_period_days: number;
  description?: string;
  legal_basis?: string;
  auto_delete: boolean;
  is_active: boolean;
  created_by: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface RetentionExecution {
  id?: string;
  policy_id: string;
  execution_date?: Date;
  records_processed: number;
  records_deleted: number;
  execution_status: 'running' | 'completed' | 'failed' | 'cancelled';
  error_message?: string;
  execution_duration_seconds?: number;
  executed_by?: string;
  metadata?: any;
  created_at?: Date;
}

export interface RetentionFilters {
  data_type?: string;
  is_active?: boolean;
  created_by?: string;
  page?: number;
  limit?: number;
}

class DataRetentionService {
  /**
   * Create a new data retention policy
   */
  async createRetentionPolicy(policy: Omit<DataRetentionPolicy, 'id'>, req?: AuthRequest): Promise<string> {
    const id = uuidv4();
    
    const query = `
      INSERT INTO data_retention_policies (
        id, data_type, retention_period_days, description, legal_basis,
        auto_delete, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;

    const result = await pool.query(query, [
      id,
      policy.data_type,
      policy.retention_period_days,
      policy.description,
      policy.legal_basis,
      policy.auto_delete,
      policy.is_active,
      policy.created_by
    ]);

    return result.rows[0].id;
  }

  /**
   * Get all retention policies with optional filtering
   */
  async getRetentionPolicies(filters: RetentionFilters = {}): Promise<{
    policies: DataRetentionPolicy[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (filters.data_type) {
      whereClause += ` AND data_type = $${paramIndex}`;
      queryParams.push(filters.data_type);
      paramIndex++;
    }

    if (filters.is_active !== undefined) {
      whereClause += ` AND is_active = $${paramIndex}`;
      queryParams.push(filters.is_active);
      paramIndex++;
    }

    if (filters.created_by) {
      whereClause += ` AND created_by = $${paramIndex}`;
      queryParams.push(filters.created_by);
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM data_retention_policies ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const dataQuery = `
      SELECT drp.*, CONCAT(u.first_name, ' ', u.last_name) as created_by_name
      FROM data_retention_policies drp
      LEFT JOIN users u ON drp.created_by = u.id
      ${whereClause}
      ORDER BY drp.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, offset);
    const dataResult = await pool.query(dataQuery, queryParams);

    return {
      policies: dataResult.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Update a retention policy
   */
  async updateRetentionPolicy(id: string, updates: Partial<DataRetentionPolicy>): Promise<void> {
    const setClause = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== 'id' && key !== 'created_by' && key !== 'created_at') {
        setClause.push(`${key} = $${paramIndex}`);
        queryParams.push(value);
        paramIndex++;
      }
    }

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    queryParams.push(id);

    const query = `
      UPDATE data_retention_policies 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
    `;

    await pool.query(query, queryParams);
  }

  /**
   * Delete a retention policy
   */
  async deleteRetentionPolicy(id: string): Promise<void> {
    await pool.query('DELETE FROM data_retention_policies WHERE id = $1', [id]);
  }

  /**
   * Execute retention policy for a specific data type
   */
  async executeRetentionPolicy(policyId: string, executedBy?: string): Promise<string> {
    const executionId = uuidv4();
    const startTime = Date.now();

    try {
      // Get policy details
      const policyResult = await pool.query(
        'SELECT * FROM data_retention_policies WHERE id = $1 AND is_active = true',
        [policyId]
      );

      if (policyResult.rows.length === 0) {
        throw new Error('Policy not found or inactive');
      }

      const policy = policyResult.rows[0];
      
      // Create execution record
      await pool.query(`
        INSERT INTO data_retention_executions (
          id, policy_id, execution_status, executed_by
        ) VALUES ($1, $2, 'running', $3)
      `, [executionId, policyId, executedBy]);

      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retention_period_days);

      let recordsProcessed = 0;
      let recordsDeleted = 0;

      // Execute retention based on data type
      switch (policy.data_type) {
        case 'attendance_records':
          const attendanceResult = await this.cleanupAttendanceRecords(cutoffDate);
          recordsProcessed = attendanceResult.processed;
          recordsDeleted = attendanceResult.deleted;
          break;

        case 'audit_logs':
          const auditResult = await this.cleanupAuditLogs(cutoffDate);
          recordsProcessed = auditResult.processed;
          recordsDeleted = auditResult.deleted;
          break;

        case 'automation_logs':
          const automationResult = await this.cleanupAutomationLogs(cutoffDate);
          recordsProcessed = automationResult.processed;
          recordsDeleted = automationResult.deleted;
          break;

        case 'compliance_violations':
          const violationsResult = await this.cleanupComplianceViolations(cutoffDate);
          recordsProcessed = violationsResult.processed;
          recordsDeleted = violationsResult.deleted;
          break;

        default:
          throw new Error(`Unsupported data type: ${policy.data_type}`);
      }

      const endTime = Date.now();
      const durationSeconds = Math.floor((endTime - startTime) / 1000);

      // Update execution record with results
      await pool.query(`
        UPDATE data_retention_executions 
        SET execution_status = 'completed',
            records_processed = $1,
            records_deleted = $2,
            execution_duration_seconds = $3,
            metadata = $4
        WHERE id = $5
      `, [
        recordsProcessed,
        recordsDeleted,
        durationSeconds,
        JSON.stringify({
          cutoff_date: cutoffDate.toISOString(),
          policy_details: {
            data_type: policy.data_type,
            retention_period_days: policy.retention_period_days
          }
        }),
        executionId
      ]);

      return executionId;

    } catch (error) {
      const endTime = Date.now();
      const durationSeconds = Math.floor((endTime - startTime) / 1000);

      // Update execution record with error
      await pool.query(`
        UPDATE data_retention_executions 
        SET execution_status = 'failed',
            error_message = $1,
            execution_duration_seconds = $2
        WHERE id = $3
      `, [error instanceof Error ? error.message : 'Unknown error', durationSeconds, executionId]);

      throw error;
    }
  }

  /**
   * Execute all active retention policies
   */
  async executeAllRetentionPolicies(executedBy?: string): Promise<{
    executed: number;
    failed: number;
    results: Array<{ policyId: string; executionId?: string; error?: string }>
  }> {
    const policiesResult = await pool.query(
      'SELECT id FROM data_retention_policies WHERE is_active = true AND auto_delete = true'
    );

    const results = [];
    let executed = 0;
    let failed = 0;

    for (const policy of policiesResult.rows) {
      try {
        const executionId = await this.executeRetentionPolicy(policy.id, executedBy);
        results.push({ policyId: policy.id, executionId });
        executed++;
      } catch (error) {
        results.push({ 
          policyId: policy.id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        failed++;
      }
    }

    return { executed, failed, results };
  }

  /**
   * Get retention execution history
   */
  async getExecutionHistory(policyId?: string, page: number = 1, limit: number = 20): Promise<{
    executions: RetentionExecution[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * limit;
    let whereClause = '';
    const queryParams: any[] = [];

    if (policyId) {
      whereClause = 'WHERE dre.policy_id = $1';
      queryParams.push(policyId);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM data_retention_executions dre ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    // Around line 332 in getExecutionHistory method
    const dataQuery = `
      SELECT dre.*, drp.data_type, drp.description as policy_description,
             CONCAT(u.first_name, ' ', u.last_name) as executed_by_name
      FROM data_retention_executions dre
      LEFT JOIN data_retention_policies drp ON dre.policy_id = drp.id
      LEFT JOIN users u ON dre.executed_by = u.id
      ${whereClause}
      ORDER BY dre.execution_date DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    queryParams.push(limit, offset);
    const dataResult = await pool.query(dataQuery, queryParams);

    return {
      executions: dataResult.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get retention statistics
   */
  async getRetentionStatistics(): Promise<{
    totalPolicies: number;
    activePolicies: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    totalRecordsDeleted: number;
    lastExecutionDate?: Date;
  }> {
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM data_retention_policies) as total_policies,
        (SELECT COUNT(*) FROM data_retention_policies WHERE is_active = true) as active_policies,
        (SELECT COUNT(*) FROM data_retention_executions) as total_executions,
        (SELECT COUNT(*) FROM data_retention_executions WHERE execution_status = 'completed') as successful_executions,
        (SELECT COUNT(*) FROM data_retention_executions WHERE execution_status = 'failed') as failed_executions,
        (SELECT COALESCE(SUM(records_deleted), 0) FROM data_retention_executions WHERE execution_status = 'completed') as total_records_deleted,
        (SELECT MAX(execution_date) FROM data_retention_executions) as last_execution_date
    `;

    const result = await pool.query(statsQuery);
    const stats = result.rows[0];

    return {
      totalPolicies: parseInt(stats.total_policies),
      activePolicies: parseInt(stats.active_policies),
      totalExecutions: parseInt(stats.total_executions),
      successfulExecutions: parseInt(stats.successful_executions),
      failedExecutions: parseInt(stats.failed_executions),
      totalRecordsDeleted: parseInt(stats.total_records_deleted),
      lastExecutionDate: stats.last_execution_date
    };
  }

  // Private cleanup methods for different data types
  private async cleanupAttendanceRecords(cutoffDate: Date): Promise<{ processed: number; deleted: number }> {
    // Count records to be deleted
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM attendance WHERE created_at < $1',
      [cutoffDate]
    );
    const processed = parseInt(countResult.rows[0].count);

    // Delete old attendance records
    const deleteResult = await pool.query(
      'DELETE FROM attendance WHERE created_at < $1',
      [cutoffDate]
    );
    const deleted = deleteResult.rowCount || 0;

    return { processed, deleted };
  }

  private async cleanupAuditLogs(cutoffDate: Date): Promise<{ processed: number; deleted: number }> {
    // Count records to be deleted
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM audit_trail WHERE created_at < $1',
      [cutoffDate]
    );
    const processed = parseInt(countResult.rows[0].count);

    // Delete old audit logs
    const deleteResult = await pool.query(
      'DELETE FROM audit_trail WHERE created_at < $1',
      [cutoffDate]
    );
    const deleted = deleteResult.rowCount || 0;

    return { processed, deleted };
  }

  private async cleanupAutomationLogs(cutoffDate: Date): Promise<{ processed: number; deleted: number }> {
    // Count records to be deleted
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM automation_logs WHERE created_at < $1',
      [cutoffDate]
    );
    const processed = parseInt(countResult.rows[0].count);

    // Delete old automation logs
    const deleteResult = await pool.query(
      'DELETE FROM automation_logs WHERE created_at < $1',
      [cutoffDate]
    );
    const deleted = deleteResult.rowCount || 0;

    return { processed, deleted };
  }

  private async cleanupComplianceViolations(cutoffDate: Date): Promise<{ processed: number; deleted: number }> {
    // Count records to be deleted (only resolved violations)
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM compliance_violations WHERE created_at < $1 AND status = \'resolved\'',
      [cutoffDate]
    );
    const processed = parseInt(countResult.rows[0].count);

    // Delete old resolved compliance violations
    const deleteResult = await pool.query(
      'DELETE FROM compliance_violations WHERE created_at < $1 AND status = \'resolved\'',
      [cutoffDate]
    );
    const deleted = deleteResult.rowCount || 0;

    return { processed, deleted };
  }

  /**
   * Initialize default retention policies
   */
  async initializeDefaultPolicies(createdBy: string): Promise<void> {
    const defaultPolicies = [
      {
        data_type: 'attendance_records',
        retention_period_days: 2555, // 7 years
        description: 'Legal requirement to retain attendance records for 7 years',
        legal_basis: 'Labor law compliance - 7 year retention requirement',
        auto_delete: false, // Manual review required for attendance data
        is_active: true,
        created_by: createdBy
      },
      {
        data_type: 'audit_logs',
        retention_period_days: 1095, // 3 years
        description: 'Audit trail logs for compliance and security monitoring',
        legal_basis: 'Security and compliance audit requirements',
        auto_delete: true,
        is_active: true,
        created_by: createdBy
      },
      {
        data_type: 'automation_logs',
        retention_period_days: 365, // 1 year
        description: 'System automation and check-in logs',
        legal_basis: 'Operational monitoring and troubleshooting',
        auto_delete: true,
        is_active: true,
        created_by: createdBy
      },
      {
        data_type: 'compliance_violations',
        retention_period_days: 1825, // 5 years
        description: 'Resolved compliance violations for historical reference',
        legal_basis: 'Compliance monitoring and trend analysis',
        auto_delete: false, // Manual review for compliance data
        is_active: true,
        created_by: createdBy
      }
    ];

    for (const policy of defaultPolicies) {
      // Check if policy already exists
      const existingPolicy = await pool.query(
        'SELECT id FROM data_retention_policies WHERE data_type = $1',
        [policy.data_type]
      );

      if (existingPolicy.rows.length === 0) {
        await this.createRetentionPolicy(policy);
      }
    }
  }
}

export const dataRetentionService = new DataRetentionService();