import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { policyEnforcementService } from '../services/policyEnforcementService';
import { User } from '../types/device';
import pool from '../config/database';

interface AuthRequest extends Request {
  user?: User;
}

const router = Router();

// Enforce policy for specific attendance record (Admin/Manager)
router.post('/enforce/:attendanceId', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { attendanceId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const result = await policyEnforcementService.enforceAttendancePolicy(userId, attendanceId);
    res.json(result);
  } catch (error: any) {
    console.error('Error enforcing policy:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to enforce policy' });
  }
});

// Get violations for a user (Admin/Manager/User)
router.get('/violations/user/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    
    // Users can only view their own violations unless they're admin/manager
    if (req.user?.role !== 'admin' && req.user?.role !== 'manager' && req.user?.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;
    
    const violations = await policyEnforcementService.getViolationsForUser(userId, start, end);
    res.json(violations);
  } catch (error: any) {
    console.error('Error getting violations:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to retrieve violations' });
  }
});

// Acknowledge a violation (User)
router.post('/violations/:violationId/acknowledge', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { violationId } = req.params;
    const { notes } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    await policyEnforcementService.acknowledgeViolation(violationId, userId, notes);
    res.json({ message: 'Violation acknowledged successfully' });
  } catch (error: any) {
    console.error('Error acknowledging violation:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to acknowledge violation' });
  }
});

// Dismiss a violation (Admin/Manager)
router.post('/violations/:violationId/dismiss', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { violationId } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!reason) {
      return res.status(400).json({ error: 'Dismissal reason is required' });
    }
    
    await policyEnforcementService.dismissViolation(violationId, userId, reason);
    res.json({ message: 'Violation dismissed successfully' });
  } catch (error: any) {
    console.error('Error dismissing violation:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to dismiss violation' });
  }
});

// Create escalation rule (Admin)
router.post('/escalation-rules', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const ruleData = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const rule = await policyEnforcementService.createEscalationRule({
      ...ruleData,
      createdBy: userId
    });
    
    res.status(201).json(rule);
  } catch (error: any) {
    console.error('Error creating escalation rule:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create escalation rule' });
  }
});

// Get escalation statistics (Admin/Manager)
router.get('/statistics/escalations', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    const statistics = await policyEnforcementService.getEscalationStatistics(start, end);
    res.json(statistics);
  } catch (error: any) {
    console.error('Error getting escalation statistics:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to retrieve escalation statistics' });
  }
});

// Get enforcement statistics (Admin/Manager)
router.get('/statistics/enforcement', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    const statistics = await policyEnforcementService.getEnforcementStatistics(start, end);
    res.json(statistics);
  } catch (error: any) {
    console.error('Error getting enforcement statistics:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to retrieve enforcement statistics' });
  }
});

// Get grace period applications for a user (Admin/Manager/User)
router.get('/grace-periods/user/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    
    // Users can only view their own grace periods unless they're admin/manager
    if (req.user?.role !== 'admin' && req.user?.role !== 'manager' && req.user?.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const query = `
      SELECT gpa.*, u.name as user_name, u.email as user_email
      FROM grace_period_applications gpa
      JOIN users u ON gpa.user_id = u.id
      WHERE gpa.user_id = $1
      ${startDate ? 'AND gpa.created_at >= $2' : ''}
      ${endDate ? `AND gpa.created_at <= $${startDate ? '3' : '2'}` : ''}
      ORDER BY gpa.created_at DESC
    `;
    
    const params = [userId];
    if (startDate) params.push(startDate as string);
    if (endDate) params.push(endDate as string);
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error getting grace period applications:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to retrieve grace period applications' });
  }
});

// Get all violations with filters (Admin/Manager)
router.get('/violations', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { 
      userId, 
      violationType, 
      severity, 
      status, 
      startDate, 
      endDate, 
      page = '1', 
      limit = '50' 
    } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    let query = `
      SELECT pv.*, u.name as user_name, u.email as user_email, u.employee_id
      FROM policy_violations pv
      JOIN users u ON pv.user_id = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 0;
    
    if (userId) {
      paramCount++;
      query += ` AND pv.user_id = $${paramCount}`;
      params.push(userId);
    }
    
    if (violationType) {
      paramCount++;
      query += ` AND pv.violation_type = $${paramCount}`;
      params.push(violationType);
    }
    
    if (severity) {
      paramCount++;
      query += ` AND pv.severity = $${paramCount}`;
      params.push(severity);
    }
    
    if (status) {
      paramCount++;
      query += ` AND pv.status = $${paramCount}`;
      params.push(status);
    }
    
    if (startDate) {
      paramCount++;
      query += ` AND pv.created_at >= $${paramCount}`;
      params.push(startDate);
    }
    
    if (endDate) {
      paramCount++;
      query += ` AND pv.created_at <= $${paramCount}`;
      params.push(endDate);
    }
    
    query += ` ORDER BY pv.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit as string), offset);
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM policy_violations pv
      WHERE 1=1
    `;
    
    const countParams: any[] = [];
    let countParamCount = 0;
    
    if (userId) {
      countParamCount++;
      countQuery += ` AND pv.user_id = $${countParamCount}`;
      countParams.push(userId);
    }
    
    if (violationType) {
      countParamCount++;
      countQuery += ` AND pv.violation_type = $${countParamCount}`;
      countParams.push(violationType);
    }
    
    if (severity) {
      countParamCount++;
      countQuery += ` AND pv.severity = $${countParamCount}`;
      countParams.push(severity);
    }
    
    if (status) {
      countParamCount++;
      countQuery += ` AND pv.status = $${countParamCount}`;
      countParams.push(status);
    }
    
    if (startDate) {
      countParamCount++;
      countQuery += ` AND pv.created_at >= $${countParamCount}`;
      countParams.push(startDate);
    }
    
    if (endDate) {
      countParamCount++;
      countQuery += ` AND pv.created_at <= $${countParamCount}`;
      countParams.push(endDate);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      violations: result.rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error: any) {
    console.error('Error getting violations:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to retrieve violations' });
  }
});

// Get escalation actions with filters (Admin/Manager)
router.get('/escalations', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { 
      userId, 
      escalationLevel, 
      actionType, 
      status, 
      startDate, 
      endDate, 
      page = '1', 
      limit = '50' 
    } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    let query = `
      SELECT ea.*, u.name as user_name, u.email as user_email, u.employee_id,
             pv.violation_type, pv.description as violation_description
      FROM escalation_actions ea
      JOIN users u ON ea.user_id = u.id
      LEFT JOIN policy_violations pv ON ea.violation_id = pv.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 0;
    
    if (userId) {
      paramCount++;
      query += ` AND ea.user_id = $${paramCount}`;
      params.push(userId);
    }
    
    if (escalationLevel) {
      paramCount++;
      query += ` AND ea.escalation_level = $${paramCount}`;
      params.push(parseInt(escalationLevel as string));
    }
    
    if (actionType) {
      paramCount++;
      query += ` AND ea.action_type = $${paramCount}`;
      params.push(actionType);
    }
    
    if (status) {
      paramCount++;
      query += ` AND ea.status = $${paramCount}`;
      params.push(status);
    }
    
    if (startDate) {
      paramCount++;
      query += ` AND ea.triggered_at >= $${paramCount}`;
      params.push(startDate);
    }
    
    if (endDate) {
      paramCount++;
      query += ` AND ea.triggered_at <= $${paramCount}`;
      params.push(endDate);
    }
    
    query += ` ORDER BY ea.triggered_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit as string), offset);
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM escalation_actions ea
      WHERE 1=1
    `;
    
    const countParams: any[] = [];
    let countParamCount = 0;
    
    if (userId) {
      countParamCount++;
      countQuery += ` AND ea.user_id = $${countParamCount}`;
      countParams.push(userId);
    }
    
    if (escalationLevel) {
      countParamCount++;
      countQuery += ` AND ea.escalation_level = $${countParamCount}`;
      countParams.push(parseInt(escalationLevel as string));
    }
    
    if (actionType) {
      countParamCount++;
      countQuery += ` AND ea.action_type = $${countParamCount}`;
      countParams.push(actionType);
    }
    
    if (status) {
      countParamCount++;
      countQuery += ` AND ea.status = $${countParamCount}`;
      countParams.push(status);
    }
    
    if (startDate) {
      countParamCount++;
      countQuery += ` AND ea.triggered_at >= $${countParamCount}`;
      countParams.push(startDate);
    }
    
    if (endDate) {
      countParamCount++;
      countQuery += ` AND ea.triggered_at <= $${countParamCount}`;
      countParams.push(endDate);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      escalations: result.rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error: any) {
    console.error('Error getting escalations:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to retrieve escalations' });
  }
});

// Get disciplinary actions (Admin/Manager)
router.get('/disciplinary-actions', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { 
      employeeId, 
      actionType, 
      status, 
      startDate, 
      endDate, 
      page = '1', 
      limit = '50' 
    } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    let query = `
      SELECT da.*, u.name as employee_name, u.email as employee_email, u.employee_id,
             initiator.name as initiated_by_name
      FROM disciplinary_actions da
      JOIN users u ON da.employee_id = u.id
      JOIN users initiator ON da.initiated_by = initiator.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 0;
    
    if (employeeId) {
      paramCount++;
      query += ` AND da.employee_id = $${paramCount}`;
      params.push(employeeId);
    }
    
    if (actionType) {
      paramCount++;
      query += ` AND da.action_type = $${paramCount}`;
      params.push(actionType);
    }
    
    if (status) {
      paramCount++;
      query += ` AND da.status = $${paramCount}`;
      params.push(status);
    }
    
    if (startDate) {
      paramCount++;
      query += ` AND da.initiated_at >= $${paramCount}`;
      params.push(startDate);
    }
    
    if (endDate) {
      paramCount++;
      query += ` AND da.initiated_at <= $${paramCount}`;
      params.push(endDate);
    }
    
    query += ` ORDER BY da.initiated_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit as string), offset);
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error getting disciplinary actions:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to retrieve disciplinary actions' });
  }
});

export default router;