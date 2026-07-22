import { Pool } from 'pg';
import pool from '../config/database';

interface ReportFilters {
  startDate: string;
  endDate: string;
  employeeIds?: string[];
  teamIds?: string[];
  officeLocation?: string;
  status?: 'present' | 'absent' | 'partial';
}

interface AttendanceReportData {
  employee: {
    id: string;
    name: string;
    email: string;
    department: string;
    office_location: string;
  };
  summary: {
    total_days: number;
    present_days: number;
    absent_days: number;
    partial_days: number;
    total_hours: number;
    average_hours_per_day: number;
    overtime_hours: number;
    break_hours: number;
  };
  attendance_records: AttendanceRecord[];
  overtime_patterns: OvertimePattern[];
  absence_patterns: AbsencePattern[];
}

interface AttendanceRecord {
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  total_hours: number;
  overtime_hours: number;
  break_duration: number;
  status: 'present' | 'absent' | 'partial';
  notes?: string;
}

interface OvertimePattern {
  date: string;
  overtime_hours: number;
  overtime_pay: number;
  reason: string;
}

interface AbsencePattern {
  date: string;
  absence_type: 'full_day' | 'partial_day' | 'late_arrival' | 'early_departure';
  duration_hours: number;
  reason?: string;
}

interface TeamReportSummary {
  team_name: string;
  total_employees: number;
  average_attendance_rate: number;
  total_overtime_hours: number;
  total_absence_hours: number;
  productivity_score: number;
}

class ReportService {
  /**
   * Generate comprehensive attendance report for employees
   */
  async generateAttendanceReport(filters: ReportFilters): Promise<AttendanceReportData[]> {
    try {
      const employees = await this.getFilteredEmployees(filters);
      const reports: AttendanceReportData[] = [];

      for (const employee of employees) {
        const reportData = await this.generateEmployeeReport(employee.id, filters);
        reports.push(reportData);
      }

      return reports;
    } catch (error) {
      console.error('Error generating attendance report:', error);
      throw new Error('Failed to generate attendance report');
    }
  }

  /**
   * Generate report for a specific employee
   */
  private async generateEmployeeReport(employeeId: string, filters: ReportFilters): Promise<AttendanceReportData> {
    const employee = await this.getEmployeeDetails(employeeId);
    const attendanceRecords = await this.getAttendanceRecords(employeeId, filters);
    const summary = await this.calculateAttendanceSummary(employeeId, filters);
    const overtimePatterns = await this.getOvertimePatterns(employeeId, filters);
    const absencePatterns = await this.getAbsencePatterns(employeeId, filters);

    return {
      employee,
      summary,
      attendance_records: attendanceRecords,
      overtime_patterns: overtimePatterns,
      absence_patterns: absencePatterns
    };
  }

  /**
   * Get filtered list of employees
   */
  private async getFilteredEmployees(filters: ReportFilters) {
    let query = `
      SELECT u.id, CONCAT(u.first_name, ' ', u.last_name) as name, u.email, u.department, u.office_location
      FROM users u
      WHERE u.role = 'employee'
    `;
    const params: any[] = [];

    if (filters.employeeIds && filters.employeeIds.length > 0) {
      query += ` AND u.id = ANY($${params.length + 1})`;
      params.push(filters.employeeIds);
    }

    if (filters.teamIds && filters.teamIds.length > 0) {
      query += ` AND u.department = ANY($${params.length + 1})`;
      params.push(filters.teamIds);
    }

    if (filters.officeLocation) {
      query += ` AND u.office_location = $${params.length + 1}`;
      params.push(filters.officeLocation);
    }

    query += ` ORDER BY u.first_name, u.last_name`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get employee details
   */
  private async getEmployeeDetails(employeeId: string) {
    const query = `
      SELECT id, CONCAT(first_name, ' ', last_name) as name, email, department, office_location
      FROM users
      WHERE id = $1
    `;
    const result = await pool.query(query, [employeeId]);
    return result.rows[0];
  }

  /**
   * Get attendance records for employee within date range
   */
  private async getAttendanceRecords(employeeId: string, filters: ReportFilters): Promise<AttendanceRecord[]> {
    const query = `
      SELECT 
        a.date,
        a.check_in_time,
        a.check_out_time,
        a.total_hours,
        a.notes,
        COALESCE(o.overtime_hours, 0) as overtime_hours,
        COALESCE(b.total_break_minutes, 0) / 60.0 as break_duration,
        CASE 
          WHEN a.check_in_time IS NULL THEN 'absent'
          WHEN a.check_out_time IS NULL THEN 'partial'
          ELSE 'present'
        END as status
      FROM attendance a
      LEFT JOIN (
        SELECT attendance_id, SUM(overtime_hours) as overtime_hours
        FROM overtime_records
        GROUP BY attendance_id
      ) o ON a.id = o.attendance_id
      LEFT JOIN (
        SELECT attendance_id, SUM(duration_minutes) as total_break_minutes
        FROM breaks
        WHERE status = 'completed'
        GROUP BY attendance_id
      ) b ON a.id = b.attendance_id
      WHERE a.user_id = $1
        AND a.date >= $2
        AND a.date <= $3
      ORDER BY a.date DESC
    `;

    const result = await pool.query(query, [employeeId, filters.startDate, filters.endDate]);
    return result.rows;
  }

  /**
   * Calculate attendance summary statistics
   */
  private async calculateAttendanceSummary(employeeId: string, filters: ReportFilters) {
    const query = `
      SELECT 
        COUNT(*) as total_days,
        COUNT(CASE WHEN check_in_time IS NOT NULL AND check_out_time IS NOT NULL THEN 1 END) as present_days,
        COUNT(CASE WHEN check_in_time IS NULL THEN 1 END) as absent_days,
        COUNT(CASE WHEN check_in_time IS NOT NULL AND check_out_time IS NULL THEN 1 END) as partial_days,
        COALESCE(SUM(total_hours), 0) as total_hours,
        COALESCE(AVG(total_hours), 0) as average_hours_per_day,
        COALESCE(SUM(o.overtime_hours), 0) as overtime_hours,
        COALESCE(SUM(b.break_hours), 0) as break_hours
      FROM attendance a
      LEFT JOIN (
        SELECT attendance_id, SUM(overtime_hours) as overtime_hours
        FROM overtime_records
        GROUP BY attendance_id
      ) o ON a.id = o.attendance_id
      LEFT JOIN (
        SELECT attendance_id, SUM(duration_minutes) / 60.0 as break_hours
        FROM breaks
        WHERE status = 'completed'
        GROUP BY attendance_id
      ) b ON a.id = b.attendance_id
      WHERE a.user_id = $1
        AND a.date >= $2
        AND a.date <= $3
    `;

    const result = await pool.query(query, [employeeId, filters.startDate, filters.endDate]);
    return result.rows[0];
  }

  /**
   * Get overtime patterns for analysis
   */
  private async getOvertimePatterns(employeeId: string, filters: ReportFilters): Promise<OvertimePattern[]> {
    const query = `
      SELECT 
        a.date,
        o.overtime_hours,
        o.overtime_pay,
        o.reason
      FROM attendance a
      JOIN overtime_records o ON a.id = o.attendance_id
      WHERE a.user_id = $1
        AND a.date >= $2
        AND a.date <= $3
        AND o.overtime_hours > 0
      ORDER BY a.date DESC
    `;

    const result = await pool.query(query, [employeeId, filters.startDate, filters.endDate]);
    return result.rows;
  }

  /**
   * Get absence patterns for analysis
   */
  private async getAbsencePatterns(employeeId: string, filters: ReportFilters): Promise<AbsencePattern[]> {
    const query = `
      SELECT 
        a.date,
        CASE 
          WHEN a.check_in_time IS NULL THEN 'full_day'
          WHEN a.check_out_time IS NULL THEN 'partial_day'
          WHEN EXTRACT(HOUR FROM a.check_in_time) > 9 THEN 'late_arrival'
          WHEN EXTRACT(HOUR FROM a.check_out_time) < 17 THEN 'early_departure'
          ELSE 'other'
        END as absence_type,
        CASE 
          WHEN a.check_in_time IS NULL THEN 8.0
          WHEN a.check_out_time IS NULL THEN 8.0 - COALESCE(a.total_hours, 0)
          ELSE 0
        END as duration_hours,
        a.notes as reason
      FROM attendance a
      WHERE a.user_id = $1
        AND a.date >= $2
        AND a.date <= $3
        AND (
          a.check_in_time IS NULL OR 
          a.check_out_time IS NULL OR
          EXTRACT(HOUR FROM a.check_in_time) > 9 OR
          EXTRACT(HOUR FROM a.check_out_time) < 17
        )
      ORDER BY a.date DESC
    `;

    const result = await pool.query(query, [employeeId, filters.startDate, filters.endDate]);
    return result.rows;
  }

  /**
   * Generate team summary report
   */
  async generateTeamSummary(filters: ReportFilters): Promise<TeamReportSummary[]> {
    const query = `
      SELECT 
        u.department as team_name,
        COUNT(DISTINCT u.id) as total_employees,
        AVG(CASE WHEN a.check_in_time IS NOT NULL THEN 1.0 ELSE 0.0 END) * 100 as average_attendance_rate,
        COALESCE(SUM(o.overtime_hours), 0) as total_overtime_hours,
        COALESCE(SUM(CASE WHEN a.check_in_time IS NULL THEN 8.0 ELSE 0 END), 0) as total_absence_hours,
        AVG(COALESCE(a.total_hours, 0)) / 8.0 * 100 as productivity_score
      FROM users u
      LEFT JOIN attendance a ON u.id = a.user_id 
        AND a.date >= $1 AND a.date <= $2
      LEFT JOIN overtime_records o ON a.id = o.attendance_id
      WHERE u.role = 'employee'
      GROUP BY u.department
      ORDER BY average_attendance_rate DESC
    `;

    const result = await pool.query(query, [filters.startDate, filters.endDate]);
    return result.rows;
  }

  /**
   * Get attendance statistics for dashboard
   */
  async getAttendanceStatistics(filters: ReportFilters) {
    const totalEmployeesQuery = `
      SELECT COUNT(DISTINCT u.id) as total_employees
      FROM users u
      WHERE u.role = 'employee'
    `;

    const attendanceStatsQuery = `
      SELECT 
        COUNT(DISTINCT a.user_id) as active_employees,
        AVG(CASE WHEN a.check_in_time IS NOT NULL THEN 1.0 ELSE 0.0 END) * 100 as attendance_rate,
        AVG(COALESCE(a.total_hours, 0)) as average_daily_hours,
        SUM(COALESCE(o.overtime_hours, 0)) as total_overtime_hours
      FROM attendance a
      LEFT JOIN overtime_records o ON a.id = o.attendance_id
      WHERE a.date >= $1 AND a.date <= $2
    `;

    const [totalResult, statsResult] = await Promise.all([
      pool.query(totalEmployeesQuery),
      pool.query(attendanceStatsQuery, [filters.startDate, filters.endDate])
    ]);

    return {
      total_employees: totalResult.rows[0].total_employees,
      ...statsResult.rows[0]
    };
  }
}

export const reportService = new ReportService();