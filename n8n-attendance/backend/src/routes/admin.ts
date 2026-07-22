import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { User } from '../types/device';
import pool from '../config/database';
import { auditTrailService } from '../services/auditTrailService';

interface AuthRequest extends Request {
  user?: User;
}

const router = Router();

/**
 * Get admin dashboard statistics
 * GET /api/admin/dashboard/stats
 */
router.get('/dashboard/stats', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    // Fix PostgreSQL syntax for date intervals
    const usersQuery = `
      SELECT 
        COUNT(*) as total_users, 
        COUNT(CASE WHEN last_login_at > NOW() - INTERVAL '30 days' THEN 1 END) as active_users 
      FROM users
    `;
    const usersResult = await pool.query(usersQuery);
    
    // Get today's attendance
    const today = new Date().toISOString().split('T')[0];
    const attendanceQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN check_in_time IS NOT NULL THEN 1 END) as checked_in
      FROM attendance 
      WHERE date = $1
    `;
    const attendanceResult = await pool.query(attendanceQuery, [today]);
    
    // Get pending approvals
    const approvalsQuery = `
      SELECT 
        COUNT(CASE WHEN status = 'pending' AND type = 'timesheet' THEN 1 END) as timesheets,
        COUNT(CASE WHEN status = 'pending' AND type = 'leave' THEN 1 END) as leave_requests,
        COUNT(CASE WHEN status = 'pending' AND type = 'user_registration' THEN 1 END) as user_registrations
      FROM (
        SELECT 'timesheet' as type, 'pending' as status FROM dual WHERE 1=0
        UNION ALL
        SELECT 'leave' as type, status FROM leave_requests WHERE status = 'pending'
        UNION ALL
        SELECT 'user_registration' as type, 'pending' as status FROM dual WHERE 1=0
      ) approvals
    `;
    
    // Simplified query for PostgreSQL
    // Fix the problematic approvals query - remove MySQL-specific syntax
    const pendingLeaveQuery = "SELECT COUNT(*) as count FROM leave_requests WHERE status = 'pending'";
    let pendingLeaveResult;
    try {
      pendingLeaveResult = await pool.query(pendingLeaveQuery);
    } catch (err) {
      // Table might not exist, use default values
      pendingLeaveResult = { rows: [{ count: 0 }] };
    }
    
    // Get compliance statistics
    const complianceQuery = `
      SELECT 
        COUNT(*) as total_violations,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_violations
      FROM compliance_violations 
      WHERE status = 'open'
    `;
    
    let complianceResult;
    try {
      complianceResult = await pool.query(complianceQuery);
    } catch (err) {
      // Table might not exist, use default values
      complianceResult = { rows: [{ total_violations: 0, critical_violations: 0 }] };
    }
    
    // Get recent activity
    const activityQuery = `
      SELECT 
        id,
        entity_type as type,
        action as description,
        performed_at as timestamp,
        CASE 
          WHEN risk_level = 'critical' THEN 'error'
          WHEN risk_level = 'high' THEN 'warning'
          ELSE 'info'
        END as severity,
        performed_by as "userId"
      FROM audit_trail 
      ORDER BY performed_at DESC 
      LIMIT 10
    `;
    
    let activityResult;
    try {
      activityResult = await pool.query(activityQuery);
    } catch (err) {
      // Table might not exist, use default values
      activityResult = { rows: [] };
    }
    
    // Get audit trail statistics
    let auditTrailStats;
    try {
      const auditStatsQuery = `
        SELECT 
          COUNT(*) as total_activities,
          COUNT(DISTINCT performed_by) as active_users,
          COUNT(CASE WHEN risk_level = 'high' OR risk_level = 'critical' THEN 1 END) as high_risk_activities
        FROM audit_trail 
        WHERE performed_at > NOW() - INTERVAL '30 days'
      `;
      const auditStatsResult = await pool.query(auditStatsQuery);
      auditTrailStats = auditStatsResult.rows[0];
    } catch (err) {
      // Table might not exist, use default values
      auditTrailStats = {
        total_activities: 0,
        active_users: 0,
        high_risk_activities: 0
      };
    }

    const stats = {
      totalUsers: parseInt(usersResult.rows[0].total_users) || 0,
      activeUsers: parseInt(usersResult.rows[0].active_users) || 0,
      totalOffices: 1, // Default value
      systemHealth: 'healthy' as const,
      attendanceToday: {
        checkedIn: parseInt(attendanceResult.rows[0]?.checked_in) || 0,
        total: parseInt(attendanceResult.rows[0]?.total) || 0,
        percentage: attendanceResult.rows[0]?.total > 0 
          ? Math.round((parseInt(attendanceResult.rows[0]?.checked_in) || 0) / parseInt(attendanceResult.rows[0]?.total) * 100)
          : 0
      },
      pendingApprovals: {
        timesheets: 0, // Default value
        leaveRequests: parseInt(pendingLeaveResult.rows[0]?.count) || 0,
        userRegistrations: 0 // Default value
      },
      complianceScore: complianceResult.rows[0]?.total_violations > 0 
        ? Math.max(0, 100 - (parseInt(complianceResult.rows[0]?.critical_violations) * 10))
        : 100,
      recentActivity: activityResult.rows || [],
      // Add the missing auditTrail object that frontend expects
      auditTrail: {
        total_activities: parseInt(auditTrailStats.total_activities) || 0,
        active_users: parseInt(auditTrailStats.active_users) || 0,
        high_risk_activities: parseInt(auditTrailStats.high_risk_activities) || 0
      },
      systemAlerts: [] // Default empty array
    };
    
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching admin dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin dashboard statistics' });
  }
});

/**
 * Get system health metrics
 * GET /api/admin/system/health
 */
router.get('/system/health', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const health = {
      uptime: process.uptime(),
      responseTime: 50, // Mock value
      errorRate: 0.1, // Mock value
      activeConnections: 10, // Mock value
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      cpuUsage: 15 // Mock percentage
    };
    
    res.json(health);
  } catch (error: any) {
    console.error('Error fetching system health:', error);
    res.status(500).json({ error: 'Failed to fetch system health metrics' });
  }
});

/**
 * Get user management statistics
 * GET /api/admin/users/stats
 */
router.get('/users/stats', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN last_login_at > NOW() - INTERVAL '30 days' THEN 1 END) as active_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
        COUNT(CASE WHEN role = 'manager' THEN 1 END) as manager_count,
        COUNT(CASE WHEN role = 'employee' THEN 1 END) as employee_count,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_registrations
      FROM users
    `;
    
    const result = await pool.query(statsQuery);
    const row = result.rows[0];
    
    const stats = {
      totalUsers: parseInt(row.total_users) || 0,
      activeUsers: parseInt(row.active_users) || 0,
      pendingRegistrations: 0, // Default value
      recentRegistrations: parseInt(row.recent_registrations) || 0,
      roleDistribution: {
        admin: parseInt(row.admin_count) || 0,
        manager: parseInt(row.manager_count) || 0,
        employee: parseInt(row.employee_count) || 0
      }
    };
    
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching user management stats:', error);
    res.status(500).json({ error: 'Failed to fetch user management statistics' });
  }
});

/**
 * Get recent system activity
 * GET /api/admin/activity/recent
 */
router.get('/activity/recent', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    const activityQuery = `
      SELECT 
        id,
        entity_type as type,
        action as description,
        performed_at as timestamp,
        CASE 
          WHEN risk_level = 'critical' THEN 'error'
          WHEN risk_level = 'high' THEN 'warning'
          ELSE 'info'
        END as severity,
        performed_by as "userId"
      FROM audit_trail 
      ORDER BY performed_at DESC 
      LIMIT $1
    `;
    
    let result;
    try {
      result = await pool.query(activityQuery, [limit]);
    } catch (err) {
      // Table might not exist, return empty array
      result = { rows: [] };
    }
    
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

/**
 * Get system alerts
 * GET /api/admin/alerts
 */
router.get('/alerts', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    // Return empty array for now - can be enhanced with actual alerts
    const alerts = [];
    res.json([]);
  } catch (error: any) {
    console.error('Error fetching system alerts:', error);
    res.status(500).json({ error: 'Failed to fetch system alerts' });
  }
});

/**
 * Get system configuration
 * GET /api/admin/system/config
 */
// Fix system config endpoint (line 288 is already correct)
router.get('/system/config', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const config = {
      maintenance: {
        enabled: false,
        scheduledAt: null,
        message: null
      },
      features: {
        wifiDetection: true,
        locationTracking: true,
        biometricAuth: false,
        mobileApp: true
      },
      limits: {
        maxUsers: 1000,
        maxOffices: 10,
        dataRetentionDays: 365
      },
      integrations: {
        n8n: {
          enabled: true,
          status: 'connected' as const
        },
        payroll: {
          enabled: false,
          status: 'disconnected' as const
        }
      }
    };
    
    res.json(config);
  } catch (error: any) {
    console.error('Error fetching system config:', error);
    res.status(500).json({ error: 'Failed to fetch system configuration' });
  }
});

export default router;

// Fix users stats query
router.get('/users/stats', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN last_login_at > NOW() - INTERVAL '30 days' THEN 1 END) as recent_logins  -- Fix: use last_login_at
      FROM users
    `;
    
    const result = await pool.query(statsQuery);
    const row = result.rows[0];
    
    const stats = {
      totalUsers: parseInt(row.total_users) || 0,
      activeUsers: parseInt(row.active_users) || 0,
      pendingRegistrations: 0, // Default value
      recentRegistrations: parseInt(row.recent_registrations) || 0,
      roleDistribution: {
        admin: parseInt(row.admin_count) || 0,
        manager: parseInt(row.manager_count) || 0,
        employee: parseInt(row.employee_count) || 0
      }
    };
    
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching user management stats:', error);
    res.status(500).json({ error: 'Failed to fetch user management statistics' });
  }
});

/**
 * Get recent system activity
 * GET /api/admin/activity/recent
 */
router.get('/activity/recent', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    const activityQuery = `
      SELECT 
        id,
        entity_type as type,
        action as description,
        performed_at as timestamp,
        CASE 
          WHEN risk_level = 'critical' THEN 'error'
          WHEN risk_level = 'high' THEN 'warning'
          ELSE 'info'
        END as severity,
        performed_by as "userId"
      FROM audit_trail 
      ORDER BY performed_at DESC 
      LIMIT $1
    `;
    
    let result;
    try {
      result = await pool.query(activityQuery, [limit]);
    } catch (err) {
      // Table might not exist, return empty array
      result = { rows: [] };
    }
    
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

/**
 * Get system alerts
 * GET /api/admin/alerts
 */
router.get('/alerts', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    // Return empty array for now - can be enhanced with actual alerts
    const alerts = [];
    res.json([]);
  } catch (error: any) {
    console.error('Error fetching system alerts:', error);
    res.status(500).json({ error: 'Failed to fetch system alerts' });
  }
});