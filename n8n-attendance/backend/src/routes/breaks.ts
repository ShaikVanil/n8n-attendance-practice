import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import pool from '../config/database';
import { 
  Break, 
  StartBreakRequest, 
  EndBreakRequest, 
  BreakValidationResult,
  BreakPolicy 
} from '../types/attendance';
import { User } from '../types/device';

// Define AuthRequest interface to match the one in auth middleware
interface AuthRequest extends Request {
  user?: User;
}

const router = Router();

// Start a break
router.post('/start', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { break_type, notes }: StartBreakRequest = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!break_type || !['lunch', 'short', 'personal'].includes(break_type)) {
      return res.status(400).json({ error: 'Valid break type is required (lunch, short, personal)' });
    }

    // Check if user is currently checked in
    const attendanceResult = await pool.query(
      `SELECT id FROM attendance 
       WHERE user_id = $1 AND date = CURRENT_DATE AND status = 'active'`,
      [userId]
    );

    if (attendanceResult.rows.length === 0) {
      return res.status(400).json({ error: 'You must be checked in to start a break' });
    }

    const attendanceId = attendanceResult.rows[0].id;

    // Check if user already has an active break
    const activeBreakResult = await pool.query(
      `SELECT id FROM breaks 
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    if (activeBreakResult.rows.length > 0) {
      return res.status(400).json({ error: 'You already have an active break. Please end it before starting a new one.' });
    }

    // Validate break policies
    const validation = await validateBreakRequest(userId, break_type);
    if (!validation.is_valid) {
      return res.status(400).json({ error: validation.error_message });
    }

    // Create new break record
    const result = await pool.query(
      `INSERT INTO breaks (user_id, attendance_id, break_type, start_time, notes, date, status)
       VALUES ($1, $2, $3, NOW(), $4, CURRENT_DATE, 'active')
       RETURNING *`,
      [userId, attendanceId, break_type, notes]
    );

    const newBreak: Break = {
      ...result.rows[0],
      start_time: new Date(result.rows[0].start_time),
      created_at: new Date(result.rows[0].created_at),
      updated_at: new Date(result.rows[0].updated_at)
    };

    res.status(201).json({
      message: 'Break started successfully',
      break: newBreak
    });
  } catch (error) {
    console.error('Error starting break:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// End a break
router.post('/end', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { notes }: EndBreakRequest = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Find active break
    const activeBreakResult = await pool.query(
      `SELECT * FROM breaks 
       WHERE user_id = $1 AND status = 'active'
       ORDER BY start_time DESC LIMIT 1`,
      [userId]
    );

    if (activeBreakResult.rows.length === 0) {
      return res.status(400).json({ error: 'No active break found' });
    }

    const breakId = activeBreakResult.rows[0].id;

    // Update break with end time
    const result = await pool.query(
      `UPDATE breaks 
       SET end_time = NOW(), notes = COALESCE($2, notes), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [breakId, notes]
    );

    const updatedBreak: Break = {
      ...result.rows[0],
      start_time: new Date(result.rows[0].start_time),
      end_time: result.rows[0].end_time ? new Date(result.rows[0].end_time) : undefined,
      created_at: new Date(result.rows[0].created_at),
      updated_at: new Date(result.rows[0].updated_at)
    };

    res.json({
      message: 'Break ended successfully',
      break: updatedBreak
    });
  } catch (error) {
    console.error('Error ending break:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current break status
router.get('/current', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const result = await pool.query(
      `SELECT * FROM breaks 
       WHERE user_id = $1 AND status = 'active'
       ORDER BY start_time DESC LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ current_break: null });
    }

    const currentBreak: Break = {
      ...result.rows[0],
      start_time: new Date(result.rows[0].start_time),
      end_time: result.rows[0].end_time ? new Date(result.rows[0].end_time) : undefined,
      created_at: new Date(result.rows[0].created_at),
      updated_at: new Date(result.rows[0].updated_at)
    };

    res.json({ current_break: currentBreak });
  } catch (error) {
    console.error('Error getting current break:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get break history
router.get('/history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { start_date, end_date, limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    let query = `
      SELECT * FROM breaks 
      WHERE user_id = $1
    `;
    const params: any[] = [userId];

    if (start_date) {
      query += ` AND date >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND date <= $${params.length + 1}`;
      params.push(end_date);
    }

    query += ` ORDER BY start_time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const breaks: Break[] = result.rows.map(row => ({
      ...row,
      start_time: new Date(row.start_time),
      end_time: row.end_time ? new Date(row.end_time) : undefined,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    }));

    res.json({ breaks });
  } catch (error) {
    console.error('Error getting break history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get today's breaks
router.get('/today', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const result = await pool.query(
      `SELECT * FROM breaks 
       WHERE user_id = $1 AND date = CURRENT_DATE
       ORDER BY start_time ASC`,
      [userId]
    );

    const breaks: Break[] = result.rows.map(row => ({
      ...row,
      start_time: new Date(row.start_time),
      end_time: row.end_time ? new Date(row.end_time) : undefined,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    }));

    // Calculate total break time for today
    const totalBreakMinutes = breaks
      .filter(b => b.status === 'completed')
      .reduce((total, b) => total + (b.duration_minutes || 0), 0);

    res.json({ 
      breaks,
      total_break_minutes: totalBreakMinutes
    });
  } catch (error) {
    console.error('Error getting today\'s breaks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to validate break requests
async function validateBreakRequest(userId: string, breakType: string): Promise<BreakValidationResult> {
  try {
    // Check for active breaks that might have exceeded duration
    const activeBreakResult = await pool.query(
      `SELECT b.*, bp.max_duration_minutes 
       FROM breaks b
       JOIN break_policies bp ON b.break_type = bp.break_type
       WHERE b.user_id = $1 AND b.status = 'active' AND bp.is_active = true`,
      [userId]
    );

    // Auto-end any breaks that have exceeded their maximum duration
    for (const activeBreak of activeBreakResult.rows) {
      const startTime = new Date(activeBreak.start_time);
      const currentTime = new Date();
      const elapsedMinutes = Math.floor((currentTime.getTime() - startTime.getTime()) / (1000 * 60));
      
      if (elapsedMinutes > activeBreak.max_duration_minutes + 5) {
        await pool.query(
          `UPDATE breaks 
           SET end_time = start_time + INTERVAL '${activeBreak.max_duration_minutes} minutes', 
               notes = COALESCE(notes, '') || ' [Auto-ended: exceeded maximum duration]',
               updated_at = NOW()
           WHERE id = $1`,
          [activeBreak.id]
        );
      }
    }

    // Get break policies
    const policyResult = await pool.query(
      `SELECT * FROM break_policies 
       WHERE break_type = $1 AND is_active = true
       ORDER BY office_id NULLS LAST LIMIT 1`,
      [breakType]
    );

    if (policyResult.rows.length === 0) {
      return { is_valid: false, error_message: 'No policy found for this break type' };
    }

    const policy: BreakPolicy = policyResult.rows[0];

    // Check for any remaining active breaks after auto-ending
    const stillActiveResult = await pool.query(
      `SELECT COUNT(*) as count FROM breaks 
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    if (parseInt(stillActiveResult.rows[0].count) > 0) {
      return { is_valid: false, error_message: 'You already have an active break' };
    }

    // Check how many breaks of this type user has taken today
    const todayBreaksResult = await pool.query(
      `SELECT COUNT(*) as count FROM breaks 
       WHERE user_id = $1 AND break_type = $2 AND date = CURRENT_DATE`,
      [userId, breakType]
    );

    const breaksUsedToday = parseInt(todayBreaksResult.rows[0].count);

    if (breaksUsedToday >= policy.max_breaks_per_day) {
      return {
        is_valid: false,
        error_message: `Maximum ${policy.max_breaks_per_day} ${breakType} break(s) per day exceeded`,
        breaks_used_today: breaksUsedToday
      };
    }

    return {
      is_valid: true,
      breaks_used_today: breaksUsedToday,
      remaining_break_time: policy.max_duration_minutes
    };
  } catch (error) {
    console.error('Error validating break request:', error);
    return { is_valid: false, error_message: 'Error validating break request' };
  }
}

// Check break duration and enforce policies
router.get('/check-duration', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Find active break
    const activeBreakResult = await pool.query(
      `SELECT b.*, bp.max_duration_minutes 
       FROM breaks b
       JOIN break_policies bp ON b.break_type = bp.break_type
       WHERE b.user_id = $1 AND b.status = 'active' AND bp.is_active = true
       ORDER BY b.start_time DESC LIMIT 1`,
      [userId]
    );

    if (activeBreakResult.rows.length === 0) {
      return res.json({ has_active_break: false });
    }

    const activeBreak = activeBreakResult.rows[0];
    const startTime = new Date(activeBreak.start_time);
    const currentTime = new Date();
    const elapsedMinutes = Math.floor((currentTime.getTime() - startTime.getTime()) / (1000 * 60));
    const maxDuration = activeBreak.max_duration_minutes;
    const remainingMinutes = Math.max(0, maxDuration - elapsedMinutes);
    const isOvertime = elapsedMinutes > maxDuration;

    // Auto-end break if it exceeds maximum duration by 5 minutes
    if (elapsedMinutes > maxDuration + 5) {
      await pool.query(
        `UPDATE breaks 
         SET end_time = start_time + INTERVAL '${maxDuration} minutes', 
             notes = COALESCE(notes, '') || ' [Auto-ended: exceeded maximum duration]',
             updated_at = NOW()
         WHERE id = $1`,
        [activeBreak.id]
      );

      return res.json({
        has_active_break: false,
        was_auto_ended: true,
        message: `Break was automatically ended after exceeding ${maxDuration} minute limit`
      });
    }

    res.json({
      has_active_break: true,
      break_id: activeBreak.id,
      break_type: activeBreak.break_type,
      elapsed_minutes: elapsedMinutes,
      max_duration_minutes: maxDuration,
      remaining_minutes: remainingMinutes,
      is_overtime: isOvertime,
      warning_threshold: maxDuration - 5 // Warn 5 minutes before limit
    });
  } catch (error) {
    console.error('Error checking break duration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;