import pool from '../config/database';
import { notificationService } from './notificationService';

export interface ManualOverrideResult {
  success: boolean;
  attendanceId?: string;
  error?: string;
}

export class ManualOverrideService {
  /**
   * Handle manual override check-in when automatic detection fails
   */
  async handleManualOverride(
    userId: string,
    reason: string,
    autoFailureReason?: string,
    location?: string,
    notes?: string
  ): Promise<ManualOverrideResult> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      
      // Validate reason is provided
      if (!reason || reason.trim().length === 0) {
        return { success: false, error: 'Override reason is required' };
      }
      
      // Check if user already checked in today
      const existingSession = await client.query(
        'SELECT id FROM attendance WHERE user_id = $1 AND date = $2 AND status = $3',
        [userId, today, 'active']
      );
      
      if (existingSession.rows.length > 0) {
        return { success: false, error: 'Already checked in today' };
      }
      
      // Create manual override attendance record
      const attendanceResult = await client.query(
        `INSERT INTO attendance (
          user_id, check_in_time, check_in_type, check_in_location, 
          notes, date, status, is_manual_override, override_reason, 
          auto_checkin_failed, auto_checkin_failure_reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          userId, now, 'manual', location || null, notes || null, 
          today, 'active', true, reason.trim(), 
          !!autoFailureReason, autoFailureReason || null
        ]
      );
      
      const attendance = attendanceResult.rows[0];
      
      // Log manual override for admin notification
      await client.query(
        `INSERT INTO manual_override_logs (
          attendance_id, user_id, override_reason, auto_failure_reason
        ) VALUES ($1, $2, $3, $4)`,
        [attendance.id, userId, reason.trim(), autoFailureReason || null]
      );
      
      await client.query('COMMIT');
      
      // Send admin notification asynchronously
      this.notifyAdminsOfOverride(attendance, reason, autoFailureReason);
      
      // Send user confirmation
      await notificationService.sendNotification({
        userId: userId,
        type: 'manual_override_success',
        title: 'Manual Check-in Successful',
        message: 'Your manual check-in has been processed successfully.',
        data: {
          timestamp: now.toISOString(),
          reason: reason
        }
      });
      
      return { success: true, attendanceId: attendance.id };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Manual override error:', error);
      return { success: false, error: 'Failed to process manual override' };
    } finally {
      client.release();
    }
  }
  
  /**
   * Notify admins of manual override events
   */
  private async notifyAdminsOfOverride(
    attendance: any,
    reason: string,
    autoFailureReason?: string
  ): Promise<void> {
    try {
      // Get user details
      const userResult = await pool.query(
        'SELECT first_name, last_name, email FROM users WHERE id = $1',
        [attendance.user_id]
      );
      
      if (userResult.rows.length === 0) return;
      
      const user = userResult.rows[0];
      
      // Get all admin users
      const adminsResult = await pool.query(
        "SELECT id, email, first_name FROM users WHERE role = 'admin' AND is_active = true"
      );
      
      // Send notification to each admin
      for (const admin of adminsResult.rows) {
        await notificationService.sendNotification({
          userId: admin.id,
          type: 'manual_override_admin_alert',
          title: 'Manual Override Alert',
          message: `${user.first_name} ${user.last_name} has performed a manual check-in override.`,
          data: {
            employeeName: `${user.first_name} ${user.last_name}`,
            employeeEmail: user.email,
            timestamp: attendance.check_in_time,
            reason: reason,
            autoFailureReason: autoFailureReason || 'N/A',
            location: attendance.check_in_location || 'Not specified'
          }
        });
      }
      
      // Mark as notified in logs
      await pool.query(
        'UPDATE manual_override_logs SET admin_notified = true, admin_notified_at = NOW() WHERE attendance_id = $1',
        [attendance.id]
      );
      
    } catch (error) {
      console.error('Failed to notify admins of manual override:', error);
    }
  }
  
  /**
   * Get manual override statistics for admin dashboard
   */
  async getOverrideStats(startDate?: string, endDate?: string) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_overrides,
          COUNT(CASE WHEN auto_checkin_failed = true THEN 1 END) as auto_failure_overrides,
          COUNT(DISTINCT user_id) as unique_users,
          DATE_TRUNC('day', created_at) as date
        FROM attendance 
        WHERE is_manual_override = true
      `;
      
      const params: any[] = [];
      
      if (startDate) {
        query += ' AND date >= $' + (params.length + 1);
        params.push(startDate);
      }
      
      if (endDate) {
        query += ' AND date <= $' + (params.length + 1);
        params.push(endDate);
      }
      
      query += ' GROUP BY DATE_TRUNC(\'day\', created_at) ORDER BY date DESC';
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Failed to get override stats:', error);
      return [];
    }
  }
}

export const manualOverrideService = new ManualOverrideService();