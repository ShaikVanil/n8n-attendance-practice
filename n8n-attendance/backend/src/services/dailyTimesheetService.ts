import pool from "../config/database";

export interface DailyTimesheet {
  id: string;
  userId: string;
  date: string;
  taskName: string; // New field to distinguish multiple entries per day
  startTime?: string;
  endTime?: string;
  breakDuration: number;
  workHours: number;
  description?: string;
  projectCode?: string;
  locationId?: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  managerComments?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDailyTimesheetRequest {
  userId: string;
  date: string;
  taskName: string; // Required field for new entries
  startTime?: string;
  endTime?: string;
  breakDuration?: number;
  description?: string;
  projectCode?: string;
  locationId?: string;
}

export interface UpdateDailyTimesheetRequest {
  taskName?: string; // Allow updating task name
  startTime?: string;
  endTime?: string;
  breakDuration?: number;
  description?: string;
  projectCode?: string;
  status?: "draft" | "submitted";
}

export interface DailyTimesheetFilters {
  userId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

class DailyTimesheetService {
  // Get daily timesheets with filters
  async getDailyTimesheets(filters: DailyTimesheetFilters) {
    const client = await pool.connect();

    try {
      let query = `
        SELECT 
          id, user_id, date, task_name, start_time, end_time, break_duration, work_hours,
          description, project_code, location_id, status,
          submitted_at, approved_at, approved_by, rejection_reason,
          manager_comments, created_at, updated_at
        FROM daily_timesheets
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramCount = 0;

      if (filters.userId) {
        query += ` AND user_id = $${++paramCount}`;
        params.push(filters.userId);
      }

      if (filters.status) {
        query += ` AND status = $${++paramCount}`;
        params.push(filters.status);
      }

      if (filters.dateFrom) {
        query += ` AND date >= $${++paramCount}`;
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        query += ` AND date <= $${++paramCount}`;
        params.push(filters.dateTo);
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM (${query}) as filtered`;
      const countResult = await client.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Add ordering and pagination
      query += ` ORDER BY date DESC, created_at DESC`;

      if (filters.limit) {
        query += ` LIMIT $${++paramCount}`;
        params.push(filters.limit);
      }

      if (filters.offset) {
        query += ` OFFSET $${++paramCount}`;
        params.push(filters.offset);
      }

      const result = await client.query(query, params);

      return {
        timesheets: result.rows.map(this.mapRowToTimesheet),
        total,
      };
    } finally {
      client.release();
    }
  }

  // Get daily timesheet by ID
  async getDailyTimesheet(
    id: string,
    userId: string
  ): Promise<DailyTimesheet | null> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT 
          id, user_id, date, task_name, start_time, end_time, break_duration, work_hours,
          description, project_code, location_id, status,
          submitted_at, approved_at, approved_by, rejection_reason,
          manager_comments, created_at, updated_at
        FROM daily_timesheets 
        WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      return result.rows.length > 0
        ? this.mapRowToTimesheet(result.rows[0])
        : null;
    } finally {
      client.release();
    }
  }

  // Create daily timesheet
  async createDailyTimesheet(
    data: CreateDailyTimesheetRequest
  ): Promise<DailyTimesheet> {
    const client = await pool.connect();

    try {
      // Validate time entry
      this.validateTimeEntry(data.startTime, data.endTime, data.breakDuration);

      // Validate project code if provided
      if (data.projectCode) {
        await this.validateProjectAccess(data.userId, data.projectCode);
      }

      // Calculate work hours
      const workHours = this.calculateWorkHours(
        data.startTime,
        data.endTime,
        data.breakDuration
      );

      // Validate daily hours if work hours are being added
      if (workHours > 0) {
        await this.validateDailyHours(data.userId, data.date, workHours);
      }

      await client.query("BEGIN");

      // Get user's manager_id
      const userResult = await client.query(
        "SELECT manager_id FROM users WHERE id = $1",
        [data.userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error("User not found");
      }

      const managerId = userResult.rows[0].manager_id;
      if (!managerId) {
        throw new Error("User does not have an assigned manager");
      }

      // Insert new timesheet with manager_id column
      const insertQuery = `
        INSERT INTO daily_timesheets (
          user_id, date, task_name, start_time, end_time, break_duration, 
          work_hours, description, project_code, location_id, manager_id,
          status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        data.userId,
        data.date,
        data.taskName,
        data.startTime,
        data.endTime,
        data.breakDuration || 0,
        workHours,
        data.description,
        data.projectCode,
        data.locationId,
        managerId,
        "draft",
      ]);

      await client.query("COMMIT");
      return this.mapRowToTimesheet(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Updated validation logic to allow overlapping time entries
  private validateTimeEntry(
    startTime?: string,
    endTime?: string,
    breakDuration: number = 0
  ): void {
    if (!startTime || !endTime) {
      return; // Allow partial time entries
    }

    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);

    if (start >= end) {
      throw new Error("End time must be after start time");
    }

    const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    if (breakDuration >= totalMinutes) {
      throw new Error(
        "Break duration cannot be greater than or equal to total work time"
      );
    }

    // Removed overlap validation to allow multiple tasks with overlapping times
    // This supports scenarios where users work on multiple projects simultaneously
  }

  private calculateWorkHours(
    startTime?: string,
    endTime?: string,
    breakDuration: number = 0
  ): number {
    if (!startTime || !endTime) {
      return 0;
    }

    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);

    const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    const workMinutes = Math.max(0, totalMinutes - breakDuration);

    return Math.round((workMinutes / 60) * 100) / 100; // Round to 2 decimal places
  }

  private mapRowToTimesheet(row: any): DailyTimesheet {
    return {
      id: row.id,
      userId: row.user_id,
      date: row.date,
      taskName: row.task_name,
      startTime: row.start_time,
      endTime: row.end_time,
      breakDuration: row.break_duration || 0,
      workHours: parseFloat(row.work_hours) || 0,
      description: row.description,
      projectCode: row.project_code,
      locationId: row.location_id,
      status: row.status,
      submittedAt: row.submitted_at,
      approvedAt: row.approved_at,
      approvedBy: row.approved_by,
      rejectionReason: row.rejection_reason,
      managerComments: row.manager_comments,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Update daily timesheet
  async updateDailyTimesheet(
    id: string,
    userId: string,
    data: UpdateDailyTimesheetRequest
  ): Promise<DailyTimesheet | null> {
    const client = await pool.connect();

    try {
      // Get existing timesheet
      const existing = await this.getDailyTimesheet(id, userId);
      if (!existing) {
        return null;
      }

      // Check if timesheet can be modified
      if (existing.status === "approved") {
        throw new Error("Approved timesheet cannot be modified");
      }

      // Calculate work hours if times are provided
      let workHours = existing.workHours;
      if (
        data.startTime !== undefined ||
        data.endTime !== undefined ||
        data.breakDuration !== undefined
      ) {
        const newStartTime = data.startTime ?? existing.startTime;
        const newEndTime = data.endTime ?? existing.endTime;
        const newBreakDuration = data.breakDuration ?? existing.breakDuration;

        // Validate time entry
        this.validateTimeEntry(newStartTime, newEndTime, newBreakDuration);

        workHours = this.calculateWorkHours(
          newStartTime,
          newEndTime,
          newBreakDuration
        );

        // Validate daily hours (excluding current timesheet)
        if (workHours > 0) {
          await this.validateDailyHours(
            existing.userId,
            existing.date,
            workHours,
            id
          );
        }
      }

      const result = await client.query(
        `UPDATE daily_timesheets 
        SET 
          start_time = COALESCE($3, start_time),
          end_time = COALESCE($4, end_time),
          break_duration = COALESCE($5, break_duration),
          work_hours = $6,
          description = COALESCE($7, description),
          project_code = COALESCE($8, project_code),
          status = COALESCE($9, status),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING 
          id, user_id, date, task_name, start_time, end_time, break_duration, work_hours,
          description, project_code, location_id, status,
          submitted_at, approved_at, approved_by, rejection_reason,
          manager_comments, created_at, updated_at`,
        [
          id,
          userId,
          data.startTime,
          data.endTime,
          data.breakDuration,
          workHours,
          data.description,
          data.projectCode,
          data.status,
        ]
      );

      return result.rows.length > 0
        ? this.mapRowToTimesheet(result.rows[0])
        : null;
    } finally {
      client.release();
    }
  }

  // Submit daily timesheet
  async submitDailyTimesheet(
    id: string,
    userId: string
  ): Promise<DailyTimesheet | null> {
    const client = await pool.connect();

    try {
      const existing = await this.getDailyTimesheet(id, userId);
      if (!existing) {
        return null;
      }

      if (existing.status !== "draft" && existing.status !== "rejected") {
        throw new Error("Only draft or rejected timesheets can be submitted");
      }

      if (!existing.startTime || !existing.endTime) {
        throw new Error(
          "Start time and end time are required to submit timesheet"
        );
      }

      const result = await client.query(
        `UPDATE daily_timesheets 
        SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING 
          id, user_id, date, task_name, start_time, end_time, break_duration, work_hours,
          description, project_code, location_id, status,
          submitted_at, approved_at, approved_by, rejection_reason,
          manager_comments, created_at, updated_at`,
        [id, userId]
      );

      return result.rows.length > 0
        ? this.mapRowToTimesheet(result.rows[0])
        : null;
    } finally {
      client.release();
    }
  }

  // Delete daily timesheet
  async deleteDailyTimesheet(id: string, userId: string): Promise<boolean> {
    const client = await pool.connect();

    try {
      const existing = await this.getDailyTimesheet(id, userId);
      if (!existing) {
        return false;
      }

      if (existing.status !== "draft") {
        throw new Error("Only draft timesheets can be deleted");
      }

      const result = await client.query(
        "DELETE FROM daily_timesheets WHERE id = $1 AND user_id = $2",
        [id, userId]
      );

      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }

  // Get daily timesheets for review (managers)
  async getDailyTimesheetsForReview(
    filters: DailyTimesheetFilters & { managerId?: string }
  ) {
    const client = await pool.connect();

    try {
      let query = `
      SELECT 
        dt.id, dt.user_id, dt.manager_id, dt.date, dt.task_name, dt.start_time, dt.end_time, 
        dt.break_duration, dt.work_hours, dt.description, dt.project_code, dt.location_id, 
        dt.status, dt.submitted_at, dt.approved_at, dt.approved_by, dt.rejection_reason,
        dt.manager_comments, dt.created_at, dt.updated_at,
        u.first_name, u.last_name, u.email, u.department,
        creator.first_name as creator_first_name, creator.last_name as creator_last_name
      FROM daily_timesheets dt
      JOIN users u ON dt.user_id = u.id
      LEFT JOIN users creator ON dt.user_id = creator.id
      WHERE dt.status = 'submitted'
    `;

      const params: any[] = [];
      let paramCount = 0;
      if (filters.managerId) {
        query += ` AND dt.manager_id = $${++paramCount}`;
        params.push(filters.managerId);
      }

      if (filters.dateFrom) {
        query += ` AND dt.date >= $${++paramCount}`;
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        query += ` AND dt.date <= $${++paramCount}`;
        params.push(filters.dateTo);
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM (${query}) as filtered`;
      const countResult = await client.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Add ordering and pagination
      query += ` ORDER BY dt.submitted_at DESC`;

      if (filters.limit) {
        query += ` LIMIT $${++paramCount}`;
        params.push(filters.limit);
      }

      if (filters.offset) {
        query += ` OFFSET $${++paramCount}`;
        params.push(filters.offset);
      }

      const result = await client.query(query, params);

      const timesheets = result.rows.map((row) => ({
        ...this.mapRowToTimesheet(row),
        user: {
          id: row.user_id,
          name: `${row.first_name} ${row.last_name}`,
          department: row.department
          // Exclude email and other personal details for privacy
        },
        creator: {
          name: `${row.creator_first_name} ${row.creator_last_name}`
        }
      }));

      return {
        timesheets,
        total,
        limit: filters.limit || 50,
        offset: filters.offset || 0
      };
    } finally {
      client.release();
    }
  }

  // Approve daily timesheet
  async approveDailyTimesheet(
    id: string,
    managerId: string,
    comments?: string
  ): Promise<DailyTimesheet | null> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `UPDATE daily_timesheets 
        SET status = 'approved', approved_at = CURRENT_TIMESTAMP, 
            approved_by = $2, manager_comments = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND manager_id = $2 AND status = 'submitted'
        RETURNING 
          id, user_id, date, task_name, start_time, end_time, break_duration, work_hours,
          description, project_code, location_id, status,
          submitted_at, approved_at, approved_by, rejection_reason,
          manager_comments, created_at, updated_at`,
        [id, managerId, comments]
      );

      return result.rows.length > 0
        ? this.mapRowToTimesheet(result.rows[0])
        : null;
    } finally {
      client.release();
    }
  }

  // Reject daily timesheet
  async rejectDailyTimesheet(
    id: string,
    managerId: string,
    reason: string
  ): Promise<DailyTimesheet | null> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `UPDATE daily_timesheets 
        SET status = 'rejected', rejection_reason = $3, 
            manager_comments = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND manager_id = $2 AND status = 'submitted'
        RETURNING 
          id, user_id, date, task_name, start_time, end_time, break_duration, work_hours,
          description, project_code, location_id, status,
          submitted_at, approved_at, approved_by, rejection_reason,
          manager_comments, created_at, updated_at`,
        [id, managerId, reason]
      );

      return result.rows.length > 0
        ? this.mapRowToTimesheet(result.rows[0])
        : null;
    } finally {
      client.release();
    }
  }

  // Get daily timesheet by date
  async getDailyTimesheetByDate(
    date: string,
    userId: string
  ): Promise<DailyTimesheet[]> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT 
          id, user_id, date, task_name, start_time, end_time, break_duration, work_hours,
          description, project_code, location_id, status,
          submitted_at, approved_at, approved_by, rejection_reason,
          manager_comments, created_at, updated_at
        FROM daily_timesheets 
        WHERE date = $1 AND user_id = $2 
        ORDER BY created_at ASC`,
        [date, userId]
      );

      return result.rows.map(this.mapRowToTimesheet);
    } finally {
      client.release();
    }
  }

  // Get daily summary
  async getDailySummary(
    date: string,
    userId: string
  ): Promise<{
    date: string;
    totalHours: number;
    timesheetCount: number;
    timesheets: DailyTimesheet[];
  }> {
    const timesheets = await this.getDailyTimesheetByDate(date, userId);
    const totalHours = timesheets.reduce(
      (sum, timesheet) => sum + timesheet.workHours,
      0
    );

    return {
      date,
      totalHours: Math.round(totalHours * 100) / 100,
      timesheetCount: timesheets.length,
      timesheets,
    };
  }

  private async validateDailyHours(
    userId: string,
    date: string,
    newWorkHours: number,
    excludeTimesheetId?: string
  ): Promise<void> {
    const client = await pool.connect();

    try {
      let query = `
        SELECT COALESCE(SUM(work_hours), 0) as total_hours
        FROM daily_timesheets 
        WHERE user_id = $1 AND date = $2
      `;
      const params = [userId, date];

      if (excludeTimesheetId) {
        query += ` AND id != $3`;
        params.push(excludeTimesheetId);
      }

      const result = await client.query(query, params);
      const currentTotalHours = parseFloat(result.rows[0].total_hours) || 0;
      const projectedTotal = currentTotalHours + newWorkHours;

      // Allow up to 24 hours per day (configurable)
      const maxDailyHours = 24;
      if (projectedTotal > maxDailyHours) {
        throw new Error(
          `Total daily hours (${projectedTotal.toFixed(
            2
          )}) would exceed maximum allowed (${maxDailyHours} hours)`
        );
      }
    } finally {
      client.release();
    }
  }

  private async validateProjectAccess(
    userId: string,
    projectCode: string
  ): Promise<void> {
    // Simplified validation - you may want to implement proper project access control
    if (!projectCode || projectCode.trim().length === 0) {
      throw new Error("Invalid project code");
    }
  }

  // Submit multiple daily timesheets
  async submitMultipleDailyTimesheets(
    ids: string[],
    userId: string
  ): Promise<DailyTimesheet[]> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const results: DailyTimesheet[] = [];
      for (const id of ids) {
        const result = await this.submitDailyTimesheet(id, userId);
        if (result) {
          results.push(result);
        }
      }

      await client.query("COMMIT");
      return results;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

export const dailyTimesheetService = new DailyTimesheetService();
