import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { User } from '../types/device';
import pool from '../config/database';

interface AuthRequest extends Request {
  user?: User;
}

const router = Router();

// Employee Dashboard Routes
// Fix date calculations to use PostgreSQL syntax
router.get('/employee/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's attendance
    const attendanceQuery = `
      SELECT 
        check_in_time,
        check_out_time,
        total_hours,
        break_duration
      FROM attendance 
      WHERE user_id = $1 AND date = $2
    `;
    
    const attendanceResult = await pool.query(attendanceQuery, [userId, today]);
    const todayAttendance = attendanceResult.rows[0];
    
    // Get weekly hours
    // Fix weekly hours query for PostgreSQL
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weeklyQuery = `
      SELECT COALESCE(SUM(total_hours), 0) as weekly_hours
      FROM attendance 
      WHERE user_id = $1 AND date >= $2
    `;
    
    const weeklyResult = await pool.query(weeklyQuery, [userId, weekStart.toISOString().split('T')[0]]);
    
    // Get monthly hours
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthlyQuery = `
      SELECT COALESCE(SUM(total_hours), 0) as monthly_hours
      FROM attendance 
      WHERE user_id = $1 AND date >= $2
    `;
    
    const monthlyResult = await pool.query(monthlyQuery, [userId, monthStart.toISOString().split('T')[0]]);
    
    // Get leave balance (if leave table exists)
    const leaveBalance = {
      annual: 20,
      sick: 10,
      personal: 5
    };
    
    const stats = {
      todayHours: todayAttendance?.total_hours || '0:00',
      breakTime: todayAttendance?.break_duration || '0:00',
      weeklyHours: weeklyResult.rows[0].weekly_hours || '0:00',
      monthlyHours: monthlyResult.rows[0].monthly_hours || '0:00',
      attendanceRate: 95,
      leaveBalance
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching employee stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

router.get('/employee/activity', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const query = `
      SELECT 
        'attendance' as type,
        'Clock In' as title,
        date,
        'completed' as status,
        check_in_time as time
      FROM attendance 
      WHERE user_id = $1 
      ORDER BY date DESC, check_in_time DESC 
      LIMIT $2
    `;
    
    const result = await pool.query(query, [userId, limit]);
    const activities = result.rows.map(row => ({
      id: `${row.type}-${row.date}`,
      type: row.type,
      title: row.title,
      date: row.date,
      status: row.status
    }));
    
    res.json(activities);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

router.get('/employee/events', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Return empty array for now - can be enhanced with actual events
    res.json([]);
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

router.get('/employee/notifications', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Return empty array for now - can be enhanced with actual notifications
    res.json([]);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Admin Dashboard Routes
router.get('/admin/stats', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    // Get total users
    const usersQuery = 'SELECT COUNT(*) as total_users FROM users';
    const usersResult = await pool.query(usersQuery);
    
    // Get today's attendance
    const today = new Date().toISOString().split('T')[0];
    const attendanceQuery = `
      SELECT COUNT(*) as present_today 
      FROM attendance 
      WHERE date = $1 AND check_in_time IS NOT NULL
    `;
    const attendanceResult = await pool.query(attendanceQuery, [today]);
    
    const stats = {
      totalUsers: parseInt(usersResult.rows[0].total_users),
      presentToday: parseInt(attendanceResult.rows[0].present_today),
      systemHealth: 'healthy',
      activeDevices: 0
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin dashboard stats' });
  }
});

// Manager Dashboard Routes
router.get('/manager/stats', authenticateToken, requireRole(['manager', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    // Get team stats - simplified for now
    const stats = {
      pendingLocationTransfers: 0,
      pendingLeaveRequests: 0,
      pendingGracePeriodRequests: 0,
      pendingTimesheets: 0,
      teamMembersPresent: 0,
      totalTeamMembers: 0,
      attendanceRate: 0,
      overdueApprovals: 0
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching manager stats:', error);
    res.status(500).json({ error: 'Failed to fetch manager dashboard stats' });
  }
});

// Add these missing endpoints before the Admin Dashboard Routes section

// Get today's work summary
router.get('/employee/today', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const today = new Date().toISOString().split('T')[0];
    
    const query = `
      SELECT 
        check_in_time,
        check_out_time,
        total_hours,
        break_duration,
        location,
        is_late
      FROM attendance 
      WHERE user_id = $1 AND date = $2
    `;
    
    const result = await pool.query(query, [userId, today]);
    const attendance = result.rows[0];
    
    const workSummary = {
      clockInTime: attendance?.check_in_time,
      clockOutTime: attendance?.check_out_time,
      totalHours: attendance?.total_hours || '0:00',
      breakTime: attendance?.break_duration || '0:00',
      status: attendance?.check_out_time ? 'clocked_out' : (attendance?.check_in_time ? 'clocked_in' : 'clocked_out'),
      location: attendance?.location,
      isLate: attendance?.is_late || false,
      expectedClockIn: '09:00'
    };
    
    res.json(workSummary);
  } catch (error) {
    console.error('Error fetching today work summary:', error);
    res.status(500).json({ error: 'Failed to fetch today work summary' });
  }
});

// Get attendance trends
router.get('/employee/trends', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const period = req.query.period || 'month';
    
    // Simplified trends data
    const trends = {
      weeklyTrend: [
        { week: 'Week 1', hours: 40, attendanceRate: 100 },
        { week: 'Week 2', hours: 38, attendanceRate: 95 },
        { week: 'Week 3', hours: 42, attendanceRate: 100 },
        { week: 'Week 4', hours: 39, attendanceRate: 98 }
      ],
      monthlyComparison: {
        thisMonth: 159,
        lastMonth: 152,
        change: 4.6
      },
      punctualityScore: 95
    };
    
    res.json(trends);
  } catch (error) {
    console.error('Error fetching attendance trends:', error);
    res.status(500).json({ error: 'Failed to fetch attendance trends' });
  }
});

// Get performance metrics
router.get('/employee/performance', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    const performance = {
      attendanceRate: 95,
      punctualityScore: 92,
      overtimeHours: 8,
      averageWorkingHours: 8.2,
      complianceScore: 98
    };
    
    res.json(performance);
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

// Get quick access data
router.get('/employee/quick-access', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    const quickAccess = {
      pendingTimesheets: 0,
      pendingLeaveRequests: 0,
      upcomingLeave: 0,
      recentTimesheets: [],
      recentLeaveRequests: []
    };
    
    res.json(quickAccess);
  } catch (error) {
    console.error('Error fetching quick access data:', error);
    res.status(500).json({ error: 'Failed to fetch quick access data' });
  }
});

export default router;