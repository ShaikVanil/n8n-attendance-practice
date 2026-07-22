import pool  from '../config/database';
import { reportService } from './reportService';
import { notificationService } from './notificationService';
import * as cron from 'node-cron';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface ScheduledReport {
  id: string;
  name: string;
  description?: string;
  report_type: 'attendance' | 'team_summary' | 'statistics';
  schedule_cron: string;
  filters: any;
  recipients: string[];
  format: 'pdf' | 'csv' | 'excel';
  is_active: boolean;
  last_run_at?: Date;
  next_run_at?: Date;
  created_by: string;
}

export interface ScheduledReportLog {
  id: string;
  scheduled_report_id: string;
  execution_time: Date;
  status: 'success' | 'failed' | 'running';
  error_message?: string;
  file_path?: string;
  recipients_sent?: string[];
  execution_duration_ms?: number;
}

class ScheduledReportService {
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();
  private reportsDir = path.join(process.cwd(), 'generated-reports');

  constructor() {
    // Ensure reports directory exists
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * Initialize scheduled reports on server startup
   */
  async initializeScheduledReports() {
    try {
      const activeReports = await this.getActiveScheduledReports();
      
      for (const report of activeReports) {
        await this.scheduleReport(report);
      }
      
      console.log(`Initialized ${activeReports.length} scheduled reports`);
    } catch (error) {
      console.error('Error initializing scheduled reports:', error);
    }
  }

  /**
   * Create a new scheduled report
   */
  async createScheduledReport(reportData: Omit<ScheduledReport, 'id' | 'last_run_at' | 'next_run_at'>): Promise<ScheduledReport> {
    const id = uuidv4();
    const nextRunAt = this.getNextRunTime(reportData.schedule_cron);
    
    const query = `
      INSERT INTO scheduled_reports (
        id, name, description, report_type, schedule_cron, filters, 
        recipients, format, is_active, next_run_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      id, reportData.name, reportData.description, reportData.report_type,
      reportData.schedule_cron, JSON.stringify(reportData.filters),
      JSON.stringify(reportData.recipients), reportData.format,
      reportData.is_active, nextRunAt, reportData.created_by
    ];
    
    const result = await pool.query(query, values);
    const scheduledReport = result.rows[0];
    
    if (scheduledReport.is_active) {
      await this.scheduleReport(scheduledReport);
    }
    
    return scheduledReport;
  }

  /**
   * Get all scheduled reports
   */
  async getScheduledReports(userId?: string): Promise<ScheduledReport[]> {
    let query = 'SELECT * FROM scheduled_reports';
    const values: any[] = [];
    
    if (userId) {
      query += ' WHERE created_by = $1';
      values.push(userId);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, values);
    return result.rows.map((row: any) => ({
      ...row,
      filters: JSON.parse(row.filters || '{}'),
      recipients: JSON.parse(row.recipients || '[]')
    }));
  }

  /**
   * Get active scheduled reports
   */
  async getActiveScheduledReports(): Promise<ScheduledReport[]> {
    const query = 'SELECT * FROM scheduled_reports WHERE is_active = true';
    const result = await pool.query(query);
    
    return result.rows.map((row: any) => ({
      ...row,
      filters: JSON.parse(row.filters || '{}'),
      recipients: JSON.parse(row.recipients || '[]')
    }));
  }

  /**
   * Update a scheduled report
   */
  async updateScheduledReport(id: string, updates: Partial<ScheduledReport>): Promise<ScheduledReport> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'filters' || key === 'recipients') {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(JSON.stringify(value));
      } else {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    }
    
    if (updates.schedule_cron) {
      const nextRunAt = this.getNextRunTime(updates.schedule_cron);
      setClause.push(`next_run_at = $${paramIndex}`);
      values.push(nextRunAt);
      paramIndex++;
    }
    
    setClause.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `
      UPDATE scheduled_reports 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    const updatedReport = result.rows[0];
    
    // Reschedule the job
    await this.unscheduleReport(id);
    if (updatedReport.is_active) {
      await this.scheduleReport(updatedReport);
    }
    
    return {
      ...updatedReport,
      filters: JSON.parse(updatedReport.filters || '{}'),
      recipients: JSON.parse(updatedReport.recipients || '[]')
    };
  }

  /**
   * Delete a scheduled report
   */
  async deleteScheduledReport(id: string): Promise<void> {
    await this.unscheduleReport(id);
    await pool.query('DELETE FROM scheduled_reports WHERE id = $1', [id]);
  }

  /**
   * Schedule a report using cron
   */
  private async scheduleReport(report: ScheduledReport): Promise<void> {
    try {
      const task = cron.schedule(report.schedule_cron, async () => {
        await this.executeScheduledReport(report.id);
      }, {
        timezone: 'UTC'
      });
      
      this.scheduledJobs.set(report.id, task);
      console.log(`Scheduled report '${report.name}' with cron: ${report.schedule_cron}`);
    } catch (error) {
      console.error(`Error scheduling report ${report.id}:`, error);
    }
  }

  /**
   * Unschedule a report
   */
  private async unscheduleReport(reportId: string): Promise<void> {
    const task = this.scheduledJobs.get(reportId);
    if (task) {
      task.stop();
      this.scheduledJobs.delete(reportId);
    }
  }

  /**
   * Execute a scheduled report
   */
  async executeScheduledReport(reportId: string): Promise<void> {
    const startTime = Date.now();
    let logId: string;
    
    try {
      // Create execution log
      logId = await this.createExecutionLog(reportId, 'running');
      
      // Get report configuration
      const reportQuery = 'SELECT * FROM scheduled_reports WHERE id = $1';
      const reportResult = await pool.query(reportQuery, [reportId]);
      
      if (reportResult.rows.length === 0) {
        throw new Error('Scheduled report not found');
      }
      
      const report = {
        ...reportResult.rows[0],
        filters: JSON.parse(reportResult.rows[0].filters || '{}'),
        recipients: JSON.parse(reportResult.rows[0].recipients || '[]')
      };
      
      // Generate report data
      let reportData;
      switch (report.report_type) {
        case 'attendance':
          reportData = await reportService.generateAttendanceReport(report.filters);
          break;
        case 'team_summary':
          reportData = await reportService.generateTeamSummary(report.filters);
          break;
        case 'statistics':
          reportData = await reportService.getAttendanceStatistics(report.filters);
          break;
        default:
          throw new Error(`Unknown report type: ${report.report_type}`);
      }
      
      // Generate file
      const fileName = `${report.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.${report.format}`;
      const filePath = path.join(this.reportsDir, fileName);
      
      await this.generateReportFile(reportData, report.format, filePath, report.report_type);
      
      // Send email to recipients
      await this.sendReportEmail(report, filePath);
      
      // Update execution log
      const duration = Date.now() - startTime;
      await this.updateExecutionLog(logId, 'success', undefined, filePath, report.recipients, duration);
      
      // Update last run time
      const nextRunAt = this.getNextRunTime(report.schedule_cron);
      await pool.query(
        'UPDATE scheduled_reports SET last_run_at = NOW(), next_run_at = $1 WHERE id = $2',
        [nextRunAt, reportId]
      );
      
      console.log(`Successfully executed scheduled report: ${report.name}`);
      
    } catch (error) {
      console.error(`Error executing scheduled report ${reportId}:`, error);
      
      if (logId!) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await this.updateExecutionLog(logId, 'failed', errorMessage, undefined, [], duration);
      }
    }
  }

  /**
   * Generate report file in specified format
   */
  private async generateReportFile(data: any, format: string, filePath: string, reportType: string): Promise<void> {
    // Implementation would depend on the specific format and report type
    // This is a simplified version - you'd need to implement the actual file generation logic
    switch (format) {
      case 'csv':
        // Generate CSV file
        break;
      case 'excel':
        // Generate Excel file
        break;
      case 'pdf':
        // Generate PDF file
        break;
    }
  }

  /**
   * Send report via email
   */
  private async sendReportEmail(report: ScheduledReport, filePath: string): Promise<void> {
    const subject = `Scheduled Report: ${report.name}`;
    const body = `
      <h2>Scheduled Report: ${report.name}</h2>
      <p>Please find the attached ${report.report_type} report.</p>
      <p>Report generated on: ${new Date().toLocaleString()}</p>
      <p>This is an automated email from the Attendance Management System.</p>
    `;
    
    for (const recipient of report.recipients) {
      await notificationService.sendNotification({
        userId: recipient, // Note: This assumes recipient is a user ID, not email
        type: 'scheduled_report',
        title: `Scheduled Report: ${report.name}`,
        message: `Your ${report.report_type} report has been generated and is ready for download.`,
        data: {
          reportName: report.name,
          reportType: report.report_type,
          generatedAt: new Date().toLocaleString(),
          attachmentPath: filePath,
          attachmentName: path.basename(filePath)
        },
        channels: ['email'],
        priority: 'medium'
      });
    }
  }

  /**
   * Create execution log entry
   */
  private async createExecutionLog(reportId: string, status: string): Promise<string> {
    const id = uuidv4();
    const query = `
      INSERT INTO scheduled_report_logs (id, scheduled_report_id, status)
      VALUES ($1, $2, $3)
      RETURNING id
    `;
    
    const result = await pool.query(query, [id, reportId, status]);
    return result.rows[0].id;
  }

  /**
   * Update execution log entry
   */
  private async updateExecutionLog(
    logId: string, 
    status: string, 
    errorMessage?: string, 
    filePath?: string, 
    recipients?: string[], 
    duration?: number
  ): Promise<void> {
    const query = `
      UPDATE scheduled_report_logs 
      SET status = $1, error_message = $2, file_path = $3, 
          recipients_sent = $4, execution_duration_ms = $5
      WHERE id = $6
    `;
    
    await pool.query(query, [
      status, errorMessage, filePath, 
      JSON.stringify(recipients || []), duration, logId
    ]);
  }

  /**
   * Get next run time based on cron expression
   */
  private getNextRunTime(cronExpression: string): Date {
    // This is a simplified implementation
    // You might want to use a more sophisticated cron parser
    const now = new Date();
    const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to 24 hours from now
    return nextRun;
  }

  /**
   * Get execution logs for a scheduled report
   */
  async getExecutionLogs(reportId: string, limit: number = 50): Promise<ScheduledReportLog[]> {
    const query = `
      SELECT * FROM scheduled_report_logs 
      WHERE scheduled_report_id = $1 
      ORDER BY execution_time DESC 
      LIMIT $2
    `;
    
    const result = await pool.query(query, [reportId, limit]);
    return result.rows.map(row => ({
      ...row,
      recipients_sent: JSON.parse(row.recipients_sent || '[]')
    }));
  }
}

export const scheduledReportService = new ScheduledReportService();