import { Pool } from 'pg';
import pool  from '../config/database';

export interface Timesheet {
  id: string;
  userId: string;
  managerId: string;
  weekStartDate: string;
  weekEndDate: string;
  totalHours: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  managerComments?: string;
  createdAt: string;
  updatedAt: string;
  entries?: TimesheetEntry[];
}

export interface TimesheetEntry {
  id: string;
  timesheetId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  breakDuration: number;
  workHours: number;
  description?: string;
  projectCode?: string;
  locationId?: string;
  isAutoPopulated: boolean;
  attendanceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTimesheetRequest {
  weekStartDate: string;
  entries?: Partial<TimesheetEntry>[];
}

export interface UpdateTimesheetRequest {
  entries?: Partial<TimesheetEntry>[];
  status?: 'draft' | 'submitted';
}

export interface TimesheetFilters {
  userId?: string;
  managerId?: string;
  status?: string;
  weekStartDate?: string;
  limit?: number;
  offset?: number;
}

class TimesheetService {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  async createTimesheet(userId: string, data: CreateTimesheetRequest): Promise<Timesheet> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get user's manager
      const managerResult = await client.query(
        'SELECT manager_id FROM users WHERE id = $1',
        [userId]
      );
      
      if (!managerResult.rows[0]?.manager_id) {
        throw new Error('User does not have an assigned manager');
      }
      
      const managerId = managerResult.rows[0].manager_id;
      
      // Calculate week end date (6 days after start)
      const weekStartDate = new Date(data.weekStartDate);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      
      // Create timesheet
      const timesheetResult = await client.query(
        `INSERT INTO timesheets (user_id, manager_id, week_start_date, week_end_date)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, managerId, data.weekStartDate, weekEndDate.toISOString().split('T')[0]]
      );
      
      const timesheet = timesheetResult.rows[0];
      
      // Auto-populate from attendance data if no entries provided
      if (!data.entries || data.entries.length === 0) {
        await this.autoPopulateFromAttendance(timesheet.id, userId, data.weekStartDate);
      } else {
        // Create provided entries
        for (const entry of data.entries) {
          await this.createTimesheetEntry(client, timesheet.id, entry);
        }
      }
      
      await client.query('COMMIT');
      
      return this.getTimesheetById(timesheet.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getTimesheets(filters: TimesheetFilters): Promise<{ timesheets: Timesheet[]; total: number }> {
    let query = `
      SELECT t.*, u.first_name, u.last_name, m.first_name as manager_first_name, m.last_name as manager_last_name
      FROM timesheets t
      JOIN users u ON t.user_id = u.id
      JOIN users m ON t.manager_id = m.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 0;
    
    if (filters.userId) {
      query += ` AND t.user_id = $${++paramCount}`;
      params.push(filters.userId);
    }
    
    if (filters.managerId) {
      query += ` AND t.manager_id = $${++paramCount}`;
      params.push(filters.managerId);
    }
    
    if (filters.status) {
      query += ` AND t.status = $${++paramCount}`;
      params.push(filters.status);
    }
    
    if (filters.weekStartDate) {
      query += ` AND t.week_start_date = $${++paramCount}`;
      params.push(filters.weekStartDate);
    }
    
    // Get total count
    const countResult = await this.pool.query(
      query.replace('SELECT t.*, u.first_name, u.last_name, m.first_name as manager_first_name, m.last_name as manager_last_name', 'SELECT COUNT(*)')
    , params);
    
    const total = parseInt(countResult.rows[0].count);
    
    // Add ordering and pagination
    query += ` ORDER BY t.week_start_date DESC, t.created_at DESC`;
    
    if (filters.limit) {
      query += ` LIMIT $${++paramCount}`;
      params.push(filters.limit);
    }
    
    if (filters.offset) {
      query += ` OFFSET $${++paramCount}`;
      params.push(filters.offset);
    }
    
    const result = await this.pool.query(query, params);
    
    const timesheets = await Promise.all(
      result.rows.map(async (row) => {
        const entries = await this.getTimesheetEntries(row.id);
        return {
          id: row.id,
          userId: row.user_id,
          managerId: row.manager_id,
          weekStartDate: row.week_start_date,
          weekEndDate: row.week_end_date,
          totalHours: parseFloat(row.total_hours),
          status: row.status,
          submittedAt: row.submitted_at,
          approvedAt: row.approved_at,
          approvedBy: row.approved_by,
          rejectionReason: row.rejection_reason,
          managerComments: row.manager_comments,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          entries
        };
      })
    );
    
    return { timesheets, total };
  }

  async getTimesheetById(id: string): Promise<Timesheet> {
    const result = await this.pool.query(
      'SELECT * FROM timesheets WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Timesheet not found');
    }
    
    const row = result.rows[0];
    const entries = await this.getTimesheetEntries(id);
    
    return {
      id: row.id,
      userId: row.user_id,
      managerId: row.manager_id,
      weekStartDate: row.week_start_date,
      weekEndDate: row.week_end_date,
      totalHours: parseFloat(row.total_hours),
      status: row.status,
      submittedAt: row.submitted_at,
      approvedAt: row.approved_at,
      approvedBy: row.approved_by,
      rejectionReason: row.rejection_reason,
      managerComments: row.manager_comments,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      entries
    };
  }

  async updateTimesheet(id: string, userId: string, data: UpdateTimesheetRequest): Promise<Timesheet> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Verify ownership and that timesheet can be edited
      const timesheetResult = await client.query(
        'SELECT * FROM timesheets WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      
      if (timesheetResult.rows.length === 0) {
        throw new Error('Timesheet not found or access denied');
      }
      
      const timesheet = timesheetResult.rows[0];
      
      if (timesheet.status === 'submitted' || timesheet.status === 'approved') {
        throw new Error('Cannot edit submitted or approved timesheet');
      }
      
      // Update timesheet status if provided
      if (data.status) {
        const updateFields: string[] = [];
        const updateParams: any[] = [];
        let paramCount = 0;
        
        updateFields.push(`status = $${++paramCount}`);
        updateParams.push(data.status);
        
        if (data.status === 'submitted') {
          updateFields.push(`submitted_at = $${++paramCount}`);
          updateParams.push(new Date());
        }
        
        updateParams.push(id);
        
        await client.query(
          `UPDATE timesheets SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${++paramCount}`,
          updateParams
        );
      }
      
      // Update entries if provided
      if (data.entries) {
        for (const entry of data.entries) {
          if (entry.id) {
            await this.updateTimesheetEntry(client, entry.id, entry);
          } else {
            await this.createTimesheetEntry(client, id, entry);
          }
        }
      }
      
      await client.query('COMMIT');
      
      return this.getTimesheetById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteTimesheet(id: string, userId: string): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM timesheets WHERE id = $1 AND user_id = $2 AND status = $3',
      [id, userId, 'draft']
    );
    
    if (result.rowCount === 0) {
      throw new Error('Timesheet not found or cannot be deleted');
    }
  }

  async submitTimesheet(id: string, userId: string): Promise<Timesheet> {
    const result = await this.pool.query(
      `UPDATE timesheets 
       SET status = 'submitted', submitted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'draft'
       RETURNING *`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Timesheet not found or cannot be submitted');
    }
    
    return this.getTimesheetById(id);
  }

  // Manager functions
  async approveTimesheet(id: string, managerId: string, comments?: string): Promise<Timesheet> {
    const result = await this.pool.query(
      `UPDATE timesheets 
       SET status = 'approved', approved_at = NOW(), approved_by = $2, manager_comments = $3, updated_at = NOW()
       WHERE id = $1 AND manager_id = $2 AND status = 'submitted'
       RETURNING *`,
      [id, managerId, comments]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Timesheet not found or cannot be approved');
    }
    
    return this.getTimesheetById(id);
  }

  async rejectTimesheet(id: string, managerId: string, reason: string): Promise<Timesheet> {
    const result = await this.pool.query(
      `UPDATE timesheets 
       SET status = 'rejected', rejection_reason = $3, updated_at = NOW()
       WHERE id = $1 AND manager_id = $2 AND status = 'submitted'
       RETURNING *`,
      [id, managerId, reason]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Timesheet not found or cannot be rejected');
    }
    
    return this.getTimesheetById(id);
  }

  // Private helper methods
  private async getTimesheetEntries(timesheetId: string): Promise<TimesheetEntry[]> {
    const result = await this.pool.query(
      'SELECT * FROM timesheet_entries WHERE timesheet_id = $1 ORDER BY date',
      [timesheetId]
    );
    
    return result.rows.map(row => ({
      id: row.id,
      timesheetId: row.timesheet_id,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      breakDuration: row.break_duration,
      workHours: parseFloat(row.work_hours),
      description: row.description,
      projectCode: row.project_code,
      locationId: row.location_id,
      isAutoPopulated: row.is_auto_populated,
      attendanceId: row.attendance_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  private async createTimesheetEntry(client: any, timesheetId: string, entry: Partial<TimesheetEntry>): Promise<void> {
    await client.query(
      `INSERT INTO timesheet_entries 
       (timesheet_id, date, start_time, end_time, break_duration, description, project_code, location_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        timesheetId,
        entry.date,
        entry.startTime,
        entry.endTime,
        entry.breakDuration || 0,
        entry.description,
        entry.projectCode,
        entry.locationId
      ]
    );
  }

  private async updateTimesheetEntry(client: any, entryId: string, entry: Partial<TimesheetEntry>): Promise<void> {
    const updateFields: string[] = [];
    const updateParams: any[] = [];
    let paramCount = 0;
    
    if (entry.startTime !== undefined) {
      updateFields.push(`start_time = $${++paramCount}`);
      updateParams.push(entry.startTime);
    }
    
    if (entry.endTime !== undefined) {
      updateFields.push(`end_time = $${++paramCount}`);
      updateParams.push(entry.endTime);
    }
    
    if (entry.breakDuration !== undefined) {
      updateFields.push(`break_duration = $${++paramCount}`);
      updateParams.push(entry.breakDuration);
    }
    
    if (entry.description !== undefined) {
      updateFields.push(`description = $${++paramCount}`);
      updateParams.push(entry.description);
    }
    
    if (entry.projectCode !== undefined) {
      updateFields.push(`project_code = $${++paramCount}`);
      updateParams.push(entry.projectCode);
    }
    
    if (updateFields.length > 0) {
      updateParams.push(entryId);
      await client.query(
        `UPDATE timesheet_entries SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${++paramCount}`,
        updateParams
      );
    }
  }

  async autoPopulateFromAttendance(timesheetId: string, userId: string, weekStartDate: string): Promise<Timesheet> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Verify timesheet exists and belongs to user
      const timesheetResult = await client.query(
        'SELECT * FROM timesheets WHERE id = $1 AND user_id = $2',
        [timesheetId, userId]
      );
      
      if (timesheetResult.rows.length === 0) {
        throw new Error('Timesheet not found');
      }
      
      const timesheet = timesheetResult.rows[0];
      
      // Check if timesheet can be modified
      if (timesheet.status !== 'draft' && timesheet.status !== 'rejected') {
        throw new Error('Cannot auto-populate submitted or approved timesheet');
      }
      
      // Clear existing auto-populated entries
      await client.query(
        'DELETE FROM timesheet_entries WHERE timesheet_id = $1 AND is_auto_populated = true',
        [timesheetId]
      );
      
      // Auto-populate from attendance
      await this.populateEntriesFromAttendance(client, timesheetId, userId, weekStartDate);
      
      await client.query('COMMIT');
      
      // Return updated timesheet
      return await this.getTimesheetById(timesheetId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Add the missing private method
  private async populateEntriesFromAttendance(client: any, timesheetId: string, userId: string, weekStartDate: string): Promise<void> {
    // Calculate week end date (6 days after start)
    const weekStart = new Date(weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    // Get attendance records for the week
    const attendanceQuery = `
      SELECT 
        a.id,
        a.date,
        a.check_in_time,
        a.check_out_time,
        a.total_hours,
        a.check_in_location,
        a.notes,
        COALESCE(SUM(b.duration_minutes), 0) as total_break_minutes
      FROM attendance a
      LEFT JOIN breaks b ON a.id = b.attendance_id AND b.status = 'completed'
      WHERE a.user_id = $1 
        AND a.date >= $2 
        AND a.date <= $3
        AND a.check_in_time IS NOT NULL
      GROUP BY a.id, a.date, a.check_in_time, a.check_out_time, a.total_hours, a.check_in_location, a.notes
      ORDER BY a.date
    `;
    
    const attendanceResult = await client.query(attendanceQuery, [
      userId,
      weekStart.toISOString().split('T')[0],
      weekEnd.toISOString().split('T')[0]
    ]);
    
    // Create timesheet entries from attendance data
    for (const attendance of attendanceResult.rows) {
      const workHours = attendance.check_out_time && attendance.total_hours 
        ? parseFloat(attendance.total_hours) 
        : 0;
      
      const breakDuration = Math.round(attendance.total_break_minutes || 0);
      
      // Create timesheet entry
      await client.query(
        `INSERT INTO timesheet_entries (
          timesheet_id, 
          date, 
          start_time, 
          end_time, 
          break_duration, 
          work_hours, 
          description, 
          is_auto_populated, 
          attendance_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          timesheetId,
          attendance.date,
          attendance.check_in_time,
          attendance.check_out_time,
          breakDuration,
          workHours,
          attendance.notes || 'Auto-populated from attendance',
          true,
          attendance.id
        ]
      );
    }
  }
}

export const timesheetService = new TimesheetService();