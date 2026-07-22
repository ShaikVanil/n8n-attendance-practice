import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { authenticateToken } from '../middleware/auth';
import { Attendance, CheckInRequest, CheckOutRequest, AttendanceStatus, ManualOverrideRequest } from '../types/attendance';
import { manualOverrideService } from '../services/manualOverrideService';
import { User } from '../types/device';
import { overtimeService } from '../services/overtimeService';
import { policyEnforcementService } from '../services/policyEnforcementService';
import { leaveManagementService } from '../services/leaveManagementService';
import { locationValidationService } from '../services/locationValidationService';
import { attendanceConsolidationService } from '../services/attendanceConsolidationService';

// Define AuthRequest interface to match the one in auth middleware
interface AuthRequest extends Request {
  user?: User;
}

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Check-in endpoint
// Updated Check-in endpoint with GPS validation
router.post('/checkin', authenticateToken, async (req, res) => {
  try {
    const { type, device_id, location, latitude, longitude, notes }: CheckInRequest = req.body;
    const user = (req as any).user;
    const user_id = user.id;
    const today = new Date().toISOString().split('T')[0];
    const todayDate = new Date(today);

    // Validate required GPS coordinates for manual check-in
    if (type === 'manual' && (!latitude || !longitude)) {
      return res.status(400).json({ 
        error: 'GPS coordinates are required for manual check-in',
        details: 'Please enable location services and try again'
      });
    }

    // Role-based location validation - skip for managers and admins
    if (latitude && longitude) {
      // Only validate location for regular employees
      if (user.role !== 'manager' && user.role !== 'admin') {
        const locationValidation = await locationValidationService.validateUserLocation(
          { latitude, longitude },
          location // office_id
        );

        // Log location detection attempt
        await locationValidationService.logLocationDetection(
          user_id,
          { latitude, longitude },
          locationValidation.office?.id || null,
          locationValidation.distance
        );

        if (!locationValidation.isValid) {
          return res.status(400).json({
            error: 'Location validation failed',
            details: {
              message: locationValidation.error || 'You are not within the office geofence boundary',
              distance: locationValidation.distance,
              office: locationValidation.office,
              requiredRadius: locationValidation.office?.geofence_radius_meters
            }
          });
        }
      } else {
        // For managers and admins, still log the location but skip validation
        await locationValidationService.logLocationDetection(
          user_id,
          { latitude, longitude },
          location || null,
          0 // Distance not relevant for privileged users
        );
      }
    }

    // Check if user has approved leave today
    const leaveCheck = await leaveManagementService.hasApprovedLeaveOnDate(user_id, todayDate);
    if (leaveCheck.hasLeave) {
      return res.status(400).json({ 
        error: 'Cannot check in during approved leave period',
        details: {
          leaveType: leaveCheck.leaveType?.name,
          leaveStartDate: leaveCheck.leaveRequest?.startDate,
          leaveEndDate: leaveCheck.leaveRequest?.endDate,
          message: `You have approved ${leaveCheck.leaveType?.name} from ${leaveCheck.leaveRequest?.startDate.toDateString()} to ${leaveCheck.leaveRequest?.endDate.toDateString()}`
        }
      });
    }

    // Check if user is already checked in today
    const existingSession = await pool.query(
      'SELECT * FROM attendance WHERE user_id = $1 AND date = $2 AND status = $3',
      [user_id, today, 'active']
    );

    if (existingSession.rows.length > 0) {
      return res.status(400).json({ error: 'Already checked in today' });
    }

    // Validate device if automatic check-in
    if (type === 'automatic' && device_id) {
      const device = await pool.query(
        'SELECT * FROM devices WHERE id = $1 AND user_id = $2 AND status = $3',
        [device_id, user_id, 'approved']
      );

      if (device.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid or unapproved device' });
      }
    }

    // Create new attendance record with GPS coordinates
    const result = await pool.query(
      `INSERT INTO attendance (
        user_id, device_id, check_in_time, check_in_type, check_in_location, 
        check_in_latitude, check_in_longitude, notes, date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        user_id, 
        device_id || null, 
        new Date(), 
        type, 
        location || null,
        latitude || null,
        longitude || null,
        notes || null, 
        today, 
        'active'
      ]
    );

    const attendanceRecord = result.rows[0];

    // Run policy enforcement for check-in
    try {
      const enforcementResult = await policyEnforcementService.enforceAttendancePolicy(
        user_id,
        attendanceRecord.id
      );

      // Include enforcement results in response
      res.status(201).json({
        message: 'Checked in successfully',
        attendance: attendanceRecord,
        location_validation: {
          coordinates: { latitude, longitude },
          validated: true
        },
        policy_enforcement: {
          is_compliant: enforcementResult.isCompliant,
          violations_count: enforcementResult.violations.length,
          warnings_count: enforcementResult.warnings.length,
          grace_periods_applied: enforcementResult.gracePeriodsApplied.length,
          escalations_triggered: enforcementResult.escalationsTriggered.length
        }
      });
    } catch (enforcementError) {
      console.error('Policy enforcement error during check-in:', enforcementError);
      // Still return success for attendance, but log the enforcement error
      res.status(201).json({
        message: 'Checked in successfully',
        attendance: attendanceRecord,
        location_validation: {
          coordinates: { latitude, longitude },
          validated: true
        },
        policy_enforcement: {
          error: 'Policy enforcement failed'
        }
      });
    }
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Failed to check in' });
  }
});

// Check-out endpoint
// Updated Check-out endpoint with GPS validation
// Check-out endpoint with role-based location bypass
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const { type, device_id, location, latitude, longitude, notes }: CheckOutRequest = req.body;
    const user_id = (req as any).user.id;
    const user = (req as any).user; // Get full user object with role
    const today = new Date().toISOString().split('T')[0];
    const todayDate = new Date(today);
    let locationValidation: any = null;

    // Validate required GPS coordinates for manual check-out
    if (type === 'manual' && (!latitude || !longitude)) {
      return res.status(400).json({ 
        error: 'GPS coordinates are required for manual check-out',
        details: 'Please enable location services and try again'
      });
    }

    // Role-based location validation - skip for managers and admins
    if (latitude && longitude) {
      // Only validate location for regular employees
      if (user.role !== 'manager' && user.role !== 'admin') {
        locationValidation = await locationValidationService.validateUserLocation(
          { latitude, longitude },
          location // office_id
        );

        // Log location detection attempt
        await locationValidationService.logLocationDetection(
          user_id,
          { latitude, longitude },
          locationValidation.office?.id || null,
          locationValidation.distance
        );

        if (!locationValidation.isValid) {
          return res.status(400).json({
            error: 'Location validation failed',
            details: {
              message: locationValidation.error || 'You are not within the office geofence boundary',
              distance: locationValidation.distance,
              office: locationValidation.office,
              requiredRadius: locationValidation.office?.geofence_radius_meters
            }
          });
        }
      } else {
        // For managers and admins, still log the location but skip validation
        await locationValidationService.logLocationDetection(
          user_id,
          { latitude, longitude },
          location || null,
          0 // Distance not relevant for privileged users
        );
      }
    }

    // Check if user has approved leave today
    const leaveCheck = await leaveManagementService.hasApprovedLeaveOnDate(user_id, todayDate);
    if (leaveCheck.hasLeave) {
      return res.status(400).json({ 
        error: 'Cannot check out during approved leave period',
        details: {
          leaveType: leaveCheck.leaveType?.name,
          leaveStartDate: leaveCheck.leaveRequest?.startDate,
          leaveEndDate: leaveCheck.leaveRequest?.endDate,
          message: `You have approved ${leaveCheck.leaveType?.name} from ${leaveCheck.leaveRequest?.startDate.toDateString()} to ${leaveCheck.leaveRequest?.endDate.toDateString()}`
        }
      });
    }

    // Find active attendance session
    const activeSession = await pool.query(
      'SELECT * FROM attendance WHERE user_id = $1 AND date = $2 AND status = $3',
      [user_id, today, 'active']
    );

    if (activeSession.rows.length === 0) {
      return res.status(400).json({ error: 'No active check-in session found' });
    }

    const checkOutTime = new Date();
    const checkInTime = new Date(activeSession.rows[0].check_in_time);
    
    // Calculate total work hours
    const totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

    // Update attendance record with check-out and GPS coordinates
    const result = await pool.query(
      `UPDATE attendance 
       SET check_out_time = $1, check_out_type = $2, check_out_location = $3, 
           check_out_latitude = $4, check_out_longitude = $5, 
           notes = COALESCE(notes, '') || $6, status = 'completed', total_hours = $7
       WHERE id = $8
       RETURNING *`,
      [
        checkOutTime, 
        type, 
        location || null, 
        latitude || null, 
        longitude || null,
        notes ? `\nCheck-out: ${notes}` : '', 
        totalHours,
        activeSession.rows[0].id
      ]
    );

    const attendanceRecord = result.rows[0];

    // Run policy enforcement for check-out
    try {
      const enforcementResult = await policyEnforcementService.enforceAttendancePolicy(
        user_id,
        attendanceRecord.id
      );

      // Include enforcement results and work hours summary in response
      res.json({
        message: 'Checked out successfully',
        attendance: attendanceRecord,
        workHoursSummary: {
          checkInTime: checkInTime.toISOString(),
          checkOutTime: checkOutTime.toISOString(),
          totalHours: parseFloat(totalHours.toFixed(2)),
          location: locationValidation?.office?.name || 'Unknown'
        },
        policy_enforcement: {
          is_compliant: enforcementResult.isCompliant,
          violations_count: enforcementResult.violations.length,
          warnings_count: enforcementResult.warnings.length,
          grace_periods_applied: enforcementResult.gracePeriodsApplied.length,
          escalations_triggered: enforcementResult.escalationsTriggered.length
        }
      });
    } catch (enforcementError) {
      console.error('Policy enforcement error during check-out:', enforcementError);
      // Still return success for attendance, but log the enforcement error
      res.json({
        message: 'Checked out successfully',
        attendance: attendanceRecord,
        workHoursSummary: {
          checkInTime: checkInTime.toISOString(),
          checkOutTime: checkOutTime.toISOString(),
          totalHours: parseFloat(totalHours.toFixed(2)),
          location: locationValidation?.office?.name || 'Unknown'
        },
        policy_enforcement: {
          error: 'Policy enforcement failed, but attendance recorded successfully'
        }
      });
    }
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current attendance status
router.get('/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get current attendance session
    const attendanceResult = await pool.query(
      `SELECT * FROM attendance 
       WHERE user_id = $1 AND date = CURRENT_DATE AND status = 'active'
       ORDER BY check_in_time DESC LIMIT 1`,
      [userId]
    );

    // Get current active break (break without end_time)
    const currentBreakResult = await pool.query(
      `SELECT * FROM breaks 
       WHERE user_id = $1 AND end_time IS NULL
       ORDER BY start_time DESC LIMIT 1`,
      [userId]
    );

    // Get today's breaks
    const todayBreaksResult = await pool.query(
      `SELECT * FROM breaks 
       WHERE user_id = $1 AND DATE(start_time) = CURRENT_DATE
       ORDER BY start_time ASC`,
      [userId]
    );

    // Calculate total hours for today (including current session)
    let todayTotalHours = 0;
    
    // Add completed sessions
    const completedHoursResult = await pool.query(
      `SELECT COALESCE(SUM(total_hours), 0) as total_hours 
       FROM attendance 
       WHERE user_id = $1 AND date = CURRENT_DATE AND status = 'completed'`,
      [userId]
    );
    todayTotalHours += parseFloat(completedHoursResult.rows[0].total_hours);
    
    // Add current active session hours (if checked in)
    const isCheckedIn = attendanceResult.rows.length > 0;
    if (isCheckedIn) {
      const currentSession = attendanceResult.rows[0];
      const checkInTime = new Date(currentSession.check_in_time);
      const currentTime = new Date();
      const currentSessionHours = (currentTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      
      // Subtract break time from current session
      const todayBreaks = todayBreaksResult.rows;
      let totalBreakMinutes = 0;
      
      for (const breakItem of todayBreaks) {
        if (breakItem.end_time) {
          // Completed break
          totalBreakMinutes += breakItem.duration_minutes || 0;
        } else {
          // Active break - calculate current duration
          const breakStart = new Date(breakItem.start_time);
          const breakDuration = (currentTime.getTime() - breakStart.getTime()) / (1000 * 60);
          totalBreakMinutes += breakDuration;
        }
      }
      
      const currentSessionWorkHours = Math.max(0, currentSessionHours - (totalBreakMinutes / 60));
      todayTotalHours += currentSessionWorkHours;
    }

    // Calculate remaining hours (standard 8-hour work day)
    const standardWorkDay = 8; // hours
    const remainingHours = Math.max(0, standardWorkDay - todayTotalHours);

    const currentSession = isCheckedIn ? {
      ...attendanceResult.rows[0],
      check_in_time: attendanceResult.rows[0].check_in_time ? new Date(attendanceResult.rows[0].check_in_time) : null,
      check_out_time: attendanceResult.rows[0].check_out_time ? new Date(attendanceResult.rows[0].check_out_time) : null,
      created_at: new Date(attendanceResult.rows[0].created_at),
      updated_at: new Date(attendanceResult.rows[0].updated_at)
    } : null;

    const currentBreak = currentBreakResult.rows.length > 0 ? {
      ...currentBreakResult.rows[0],
      start_time: new Date(currentBreakResult.rows[0].start_time),
      end_time: currentBreakResult.rows[0].end_time ? new Date(currentBreakResult.rows[0].end_time) : undefined,
      created_at: new Date(currentBreakResult.rows[0].created_at),
      updated_at: new Date(currentBreakResult.rows[0].updated_at)
    } : null;

    const todayBreaks = todayBreaksResult.rows.map(row => ({
      ...row,
      start_time: new Date(row.start_time),
      end_time: row.end_time ? new Date(row.end_time) : undefined,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    }));

    // Add overtime calculation
    const overtimeStatus = await overtimeService.getCurrentOvertimeStatus(userId);
    const overtimeLimit = await overtimeService.checkOvertimeLimit(userId);
    
    const status = {
      is_checked_in: isCheckedIn,
      current_session: currentSession,
      today_total_hours: todayTotalHours,
      remaining_hours: remainingHours,
      current_break: currentBreak,
      today_breaks: todayBreaks,
      // Add overtime information
      overtime_status: overtimeStatus,
      overtime_limit_check: overtimeLimit
    };

    res.json(status);
  } catch (error) {
    console.error('Error getting attendance status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new overtime-specific endpoints
router.get('/overtime/current', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  
  try {
    const overtimeStatus = await overtimeService.getCurrentOvertimeStatus(userId);
    res.json(overtimeStatus);
  } catch (error) {
    console.error('Error getting current overtime status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/overtime/history', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { start_date, end_date, limit = '50', offset = '0' } = req.query;
  
  try {
    const history = await overtimeService.getOvertimeHistory(
      userId,
      start_date as string,
      end_date as string,
      parseInt(limit as string),
      parseInt(offset as string)
    );
    res.json(history);
  } catch (error) {
    console.error('Error getting overtime history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/overtime/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { start_date, end_date, user_id } = req.query;
  
  try {
    const stats = await overtimeService.getOvertimeStats(
      start_date as string,
      end_date as string,
      user_id as string
    );
    res.json(stats);
  } catch (error) {
    console.error('Error getting overtime stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attendance history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const user_id = (req as any).user.id;
    const { 
      start_date, 
      end_date, 
      limit = 30, 
      offset = 0, 
      status_filter 
    } = req.query;

    // Build base query for attendance records
    let attendanceQuery = `
      SELECT a.*, 
             CASE 
               WHEN a.check_out_time IS NOT NULL THEN 'checked_out'
               ELSE 'checked_in'
             END as status
      FROM attendance a 
      WHERE a.user_id = $1`;
    
    const params: any[] = [user_id];

    // Add date filters
    if (start_date) {
      attendanceQuery += ' AND a.date >= $' + (params.length + 1);
      params.push(start_date);
    }

    if (end_date) {
      attendanceQuery += ' AND a.date <= $' + (params.length + 1);
      params.push(end_date);
    }

    // Add status filter
    if (status_filter) {
      if (status_filter === 'present') {
        attendanceQuery += ' AND a.check_in_time IS NOT NULL';
      } else if (status_filter === 'absent') {
        attendanceQuery += ' AND a.check_in_time IS NULL';
      } else if (status_filter === 'partial') {
        attendanceQuery += ' AND a.check_in_time IS NOT NULL AND a.check_out_time IS NULL';
      }
    }

    // Get total count for pagination
    const countQuery = attendanceQuery.replace(
      /SELECT a\.\*, .*? FROM/,
      'SELECT COUNT(*) as total FROM'
    );
    const countResult = await pool.query(countQuery, params);

    // Handle case where no records exist (this is normal, not an error)
    const totalRecords = parseInt(countResult.rows[0]?.total || '0');

    // If no records exist, return empty result immediately
    if (totalRecords === 0) {
      return res.json({
        attendance: [],
        total: 0,
        page: 1,
        limit: parseInt(limit.toString()),
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false
      });
    }

    if (!countResult.rows || countResult.rows.length === 0) {
      console.error('Count query returned no results:', countQuery);
      return res.status(500).json({ error: 'Failed to get attendance count' });
    }
    
    // Add ordering and pagination
    attendanceQuery += ' ORDER BY a.date DESC, a.created_at DESC';
    attendanceQuery += ' LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    // Get attendance records
    const attendanceResult = await pool.query(attendanceQuery, params);
    
    // Get breaks for each attendance record
    const attendanceWithBreaks = await Promise.all(
      attendanceResult.rows.map(async (attendance) => {
        const breaksQuery = `
          SELECT * FROM breaks 
          WHERE attendance_id = $1 
          ORDER BY start_time ASC`;
        const breaksResult = await pool.query(breaksQuery, [attendance.id]);
        
        // Calculate total work hours excluding breaks
        let totalHours = 0;
        if (attendance.check_in_time && attendance.check_out_time) {
          const workDuration = new Date(attendance.check_out_time).getTime() - 
                              new Date(attendance.check_in_time).getTime();
          
          // Subtract break time
          const totalBreakTime = breaksResult.rows.reduce((total, breakRecord) => {
            if (breakRecord.end_time) {
              const breakDuration = new Date(breakRecord.end_time).getTime() - 
                                  new Date(breakRecord.start_time).getTime();
              return total + breakDuration;
            }
            return total;
          }, 0);
          
          totalHours = (workDuration - totalBreakTime) / (1000 * 60 * 60); // Convert to hours
        }
        
        return {
          ...attendance,
          total_hours: totalHours,
          breaks: breaksResult.rows.map(breakRecord => ({
            ...breakRecord,
            start_time: new Date(breakRecord.start_time),
            end_time: breakRecord.end_time ? new Date(breakRecord.end_time) : null,
            created_at: new Date(breakRecord.created_at),
            updated_at: new Date(breakRecord.updated_at)
          })),
          check_in_time: attendance.check_in_time ? new Date(attendance.check_in_time) : null,
          check_out_time: attendance.check_out_time ? new Date(attendance.check_out_time) : null,
          created_at: new Date(attendance.created_at),
          updated_at: new Date(attendance.updated_at)
        };
      })
    );

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalRecords / parseInt(limit.toString()));
    const currentPage = Math.floor(parseInt(offset.toString()) / parseInt(limit.toString())) + 1;

    res.json({
      attendance: attendanceWithBreaks,
      total: totalRecords,
      page: currentPage,
      limit: parseInt(limit.toString()),
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manual override check-in endpoint
router.post('/manual-override', authenticateToken, async (req, res) => {
  try {
    const { reason, auto_failure_reason, location, notes }: ManualOverrideRequest = req.body;
    const user_id = (req as any).user.id;
    
    // Validate required fields
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Override reason is required' });
    }
    
    if (reason.trim().length < 10) {
      return res.status(400).json({ error: 'Override reason must be at least 10 characters' });
    }
    
    const result = await manualOverrideService.handleManualOverride(
      user_id,
      reason.trim(),
      auto_failure_reason,
      location,
      notes
    );
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.status(201).json({
      message: 'Manual override check-in successful',
      attendanceId: result.attendanceId
    });
    
  } catch (error) {
    console.error('Manual override error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get manual override statistics (admin only)
router.get('/override-stats', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { start_date, end_date } = req.query;
    const stats = await manualOverrideService.getOverrideStats(
      start_date as string,
      end_date as string
    );
    
    res.json({ stats });
    
  } catch (error) {
    console.error('Override stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attendance history filtered by location
router.get('/location-history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { start_date, end_date, location_id } = req.query;
    
    let query = `
      SELECT 
        a.id,
        a.date,
        a.location_id,
        ol.name as location_name,
        a.check_in_time,
        a.check_out_time,
        a.total_hours,
        CASE 
          WHEN a.check_in_time IS NOT NULL AND a.check_out_time IS NOT NULL THEN 'present'
          WHEN a.check_in_time IS NOT NULL AND a.check_out_time IS NULL THEN 'partial'
          ELSE 'absent'
        END as status
      FROM attendance a
      LEFT JOIN office_locations ol ON a.location_id = ol.id
      WHERE a.user_id = $1
    `;
    
    const params: any[] = [userId];
    let paramCount = 2;
    
    if (start_date) {
      query += ` AND a.date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }
    
    if (end_date) {
      query += ` AND a.date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }
    
    if (location_id) {
      query += ` AND a.location_id = $${paramCount}`;
      params.push(location_id);
      paramCount++;
    }
    
    query += ' ORDER BY a.date DESC';
    
    const result = await pool.query(query, params);
    
    // Calculate summary statistics
    const records = result.rows;
    const totalDays = records.length;
    const presentDays = records.filter(r => r.status === 'present').length;
    const totalHours = records.reduce((sum, r) => sum + (r.total_hours || 0), 0);
    
    // Calculate location breakdown
    const locationBreakdown: Record<string, { days: number; hours: number }> = {};
    records.forEach(record => {
      if (record.location_id && record.location_name) {
        if (!locationBreakdown[record.location_name]) {
          locationBreakdown[record.location_name] = { days: 0, hours: 0 };
        }
        if (record.status === 'present') {
          locationBreakdown[record.location_name].days++;
          locationBreakdown[record.location_name].hours += record.total_hours || 0;
        }
      }
    });
    
    res.json({
      records,
      summary: {
        totalDays,
        presentDays,
        totalHours,
        locationBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching location attendance history:', error);
    res.status(500).json({ error: 'Failed to fetch location attendance history' });
  }
});

// GET /api/attendance/team - Get consolidated team attendance for managers
router.get('/team', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const managerId = req.user?.id;
    if (!managerId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if user has manager role
    if (req.user?.role !== 'manager' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Manager or admin role required.' });
    }

    const { date, view = 'daily' } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    
    // Calculate date ranges based on view type
    let startDate: string, endDate: string, dateStr: string;
    
    switch (view) {
      case 'weekly':
        // Get start of week (Monday)
        const weekStart = new Date(targetDate);
        weekStart.setDate(targetDate.getDate() - targetDate.getDay() + 1);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        startDate = weekStart.toISOString().split('T')[0];
        endDate = weekEnd.toISOString().split('T')[0];
        dateStr = `${startDate} to ${endDate}`;
        break;
        
      case 'monthly':
        // Get start and end of month
        const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
        
        startDate = monthStart.toISOString().split('T')[0];
        endDate = monthEnd.toISOString().split('T')[0];
        dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
        break;
        
      default: // daily
        startDate = endDate = targetDate.toISOString().split('T')[0];
        dateStr = startDate;
        break;
    }

    // Get team members - different logic for admin vs manager
    let teamQuery: string;
    let queryParams: any[];
    
    if (req.user?.role === 'admin') {
      // Admin can see all active users
      teamQuery = `
        SELECT u.id, u.first_name as "firstName", u.last_name as "lastName", u.email
        FROM users u 
        WHERE u.is_active = true
        ORDER BY u.first_name, u.last_name
      `;
      queryParams = [];
    } else {
      // Manager can only see their direct reports
      teamQuery = `
        SELECT u.id, u.first_name as "firstName", u.last_name as "lastName", u.email
        FROM users u 
        WHERE u.manager_id = $1 AND u.is_active = true
        ORDER BY u.first_name, u.last_name
      `;
      queryParams = [managerId];
    }
    
    const teamResult = await pool.query(teamQuery, queryParams);
    const teamMembers = teamResult.rows;

    if (teamMembers.length === 0) {
      return res.json({
        view,
        period: dateStr,
        members: [],
        summary: {
          totalMembers: 0,
          present: 0,
          absent: 0,
          late: 0,
          onLeave: 0,
          partial: 0
        }
      });
    }

    const userIds = teamMembers.map(member => member.id);
    
    // Get consolidated attendance data for all team members
    const consolidatedAttendance = await attendanceConsolidationService.consolidateAttendanceForDate(
      userIds, 
      dateStr
    );

    // Check for leave requests
    const leaveQuery = `
      SELECT user_id FROM leave_requests 
      WHERE status = 'approved' 
      AND start_date <= $1::date 
      AND end_date >= $1::date
      AND user_id = ANY($2::uuid[])
    `;
    
    const leaveResult = await pool.query(leaveQuery, [dateStr, userIds]);
    const onLeaveSet = new Set(leaveResult.rows.map(row => row.user_id));

    // Build response data with consolidated attendance
    const members = teamMembers.map(member => {
      const attendance = consolidatedAttendance.get(member.id);
      const isOnLeave = onLeaveSet.has(member.id);
      
      return {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        status: isOnLeave ? 'on_leave' : (attendance?.status || 'absent'),
        checkInTime: attendance?.first_check_in,
        checkOutTime: attendance?.has_unclosed_session ? null : attendance?.last_check_out,
        totalHours: attendance?.total_hours || 0,
        location: attendance?.location || 'Unknown',
        // Additional consolidated data
        sessions: attendance?.sessions || [],
        hasMultipleSessions: (attendance?.sessions?.length || 0) > 1,
        hasOverlaps: attendance?.has_overlaps || false,
        hasDuplicates: attendance?.has_duplicates || false,
        hasUnclosedSession: attendance?.has_unclosed_session || false,
        sessionCount: attendance?.sessions?.length || 0
      };
    });

    // Calculate summary with all status types
    const summary = {
      totalMembers: members.length,
      present: members.filter(m => m.status === 'present').length,
      absent: members.filter(m => m.status === 'absent').length,
      late: members.filter(m => m.status === 'late').length,
      partial: members.filter(m => m.status === 'partial').length,
      onLeave: members.filter(m => m.status === 'on_leave').length,
      // Additional metrics
      withMultipleSessions: members.filter(m => m.hasMultipleSessions).length,
      withOverlaps: members.filter(m => m.hasOverlaps).length,
      withDuplicates: members.filter(m => m.hasDuplicates).length,
      withUnclosedSessions: members.filter(m => m.hasUnclosedSession).length
    };

    const response = {
      date: dateStr,
      members,
      summary,
      consolidationMetrics: {
        totalRecordsProcessed: Array.from(consolidatedAttendance.values())
          .reduce((sum, att) => sum + att.sessions.length, 0),
        usersWithMultipleRecords: Array.from(consolidatedAttendance.values())
          .filter(att => att.sessions.length > 1).length,
        duplicatesDetected: Array.from(consolidatedAttendance.values())
          .filter(att => att.has_duplicates).length,
        overlapsResolved: Array.from(consolidatedAttendance.values())
          .filter(att => att.has_overlaps).length
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching consolidated team attendance:', error);
    res.status(500).json({ error: 'Failed to fetch team attendance' });
  }
});

export default router;