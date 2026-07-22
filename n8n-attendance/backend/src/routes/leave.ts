import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { leaveManagementService } from '../services/leaveManagementService';
import { User } from '../types/device';
import {
  CreateLeaveRequestRequest,
  UpdateLeaveRequestRequest,
  ReviewLeaveRequestRequest,
  LeaveRequestFilters,
  LeaveBalanceFilters
} from '../types/leave';

interface AuthRequest extends Request {
  user?: User;
}

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all leave types
router.get('/types', async (req: AuthRequest, res: Response) => {
  try {
    const leaveTypes = await leaveManagementService.getAllLeaveTypes();
    res.json({
      success: true,
      data: leaveTypes
    });
  } catch (error: any) {
    console.error('Error fetching leave types:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch leave types' });
  }
});

// Get leave type by ID
router.get('/types/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const leaveType = await leaveManagementService.getLeaveTypeById(id);
    
    if (!leaveType) {
      return res.status(404).json({ error: 'Leave type not found' });
    }
    
    res.json({
      success: true,
      data: leaveType
    });
  } catch (error: any) {
    console.error('Error fetching leave type:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch leave type' });
  }
});

// Submit leave request
router.post('/requests', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const requestData: CreateLeaveRequestRequest = req.body;
    
    // Validate required fields
    if (!requestData.leaveTypeId || !requestData.startDate || !requestData.endDate) {
      return res.status(400).json({ 
        error: 'Leave type ID, start date, and end date are required' 
      });
    }

    const leaveRequest = await leaveManagementService.submitLeaveRequest(userId, requestData);
    
    res.status(201).json({
      success: true,
      data: leaveRequest,
      message: 'Leave request submitted successfully'
    });
  } catch (error: any) {
    console.error('Error submitting leave request:', error);
    res.status(400).json({ error: error.message || 'Failed to submit leave request' });
  }
});

// Get leave requests with filters and pagination
router.get('/requests', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    const filters: LeaveRequestFilters = {
      userId: userRole === 'employee' ? userId : req.query.userId as string,
      leaveTypeId: req.query.leaveTypeId as string,
      status: req.query.status as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      emergencyLeave: req.query.emergencyLeave ? req.query.emergencyLeave === 'true' : undefined,
      submittedAfter: req.query.submittedAfter as string,
      submittedBefore: req.query.submittedBefore as string
    };
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const result = await leaveManagementService.getLeaveRequests(filters, page, limit);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch leave requests' });
  }
});

// Get leave request by ID
router.get('/requests/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    const leaveRequest = await leaveManagementService.getLeaveRequestById(id);
    
    if (!leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    
    // Check authorization - employees can only view their own requests
    if (userRole === 'employee' && leaveRequest.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to view this leave request' });
    }
    
    res.json({
      success: true,
      data: leaveRequest
    });
  } catch (error: any) {
    console.error('Error fetching leave request:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch leave request' });
  }
});

// Update leave request (employees can only update their own pending requests)
router.put('/requests/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    const updateData: UpdateLeaveRequestRequest = req.body;
    
    const updatedRequest = await leaveManagementService.updateLeaveRequest(id, userId, updateData);
    
    res.json({
      success: true,
      data: updatedRequest,
      message: 'Leave request updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating leave request:', error);
    res.status(400).json({ error: error.message || 'Failed to update leave request' });
  }
});

// Cancel leave request
router.delete('/requests/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    const cancelledRequest = await leaveManagementService.cancelLeaveRequest(id, userId);
    
    res.json({
      success: true,
      data: cancelledRequest,
      message: 'Leave request cancelled successfully'
    });
  } catch (error: any) {
    console.error('Error cancelling leave request:', error);
    res.status(400).json({ error: error.message || 'Failed to cancel leave request' });
  }
});

// Review leave request (managers/admins only)
router.put('/requests/:id/review', requireRole(['manager', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const reviewerId = req.user?.id;
    
    if (!reviewerId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    const reviewData: ReviewLeaveRequestRequest = req.body;
    
    // Validate review data
    if (!reviewData.status || !['approved', 'rejected'].includes(reviewData.status)) {
      return res.status(400).json({ 
        error: 'Review status must be either "approved" or "rejected"' 
      });
    }
    
    const reviewedRequest = await leaveManagementService.reviewLeaveRequest(id, reviewerId, reviewData);
    
    res.json({
      success: true,
      data: reviewedRequest,
      message: `Leave request ${reviewData.status} successfully`
    });
  } catch (error: any) {
    console.error('Error reviewing leave request:', error);
    res.status(400).json({ error: error.message || 'Failed to review leave request' });
  }
});

// Get user leave balances
router.get('/balances', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    // For employees, only show their own balances
    // For managers/admins, allow querying other users
    const targetUserId = userRole === 'employee' ? userId : (req.query.userId as string || userId);
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    
    if (!targetUserId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const balances = await leaveManagementService.getUserLeaveBalances(targetUserId, year);
    
    res.json({
      success: true,
      data: balances
    });
  } catch (error: any) {
    console.error('Error fetching leave balances:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch leave balances' });
  }
});

// Get specific leave balance
router.get('/balances/:leaveTypeId', async (req: AuthRequest, res: Response) => {
  try {
    const { leaveTypeId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    const targetUserId = userRole === 'employee' ? userId : (req.query.userId as string || userId);
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    
    if (!targetUserId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const balance = await leaveManagementService.getLeaveBalance(targetUserId, leaveTypeId, year);
    
    if (!balance) {
      return res.status(404).json({ error: 'Leave balance not found' });
    }
    
    res.json({
      success: true,
      data: balance
    });
  } catch (error: any) {
    console.error('Error fetching leave balance:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch leave balance' });
  }
});

// Initialize leave balances for a user (admin only)
router.post('/balances/initialize', requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { userId, year } = req.body;
    
    if (!userId || !year) {
      return res.status(400).json({ error: 'User ID and year are required' });
    }
    
    await leaveManagementService.initializeLeaveBalances(userId, year);
    
    res.json({
      success: true,
      message: 'Leave balances initialized successfully'
    });
  } catch (error: any) {
    console.error('Error initializing leave balances:', error);
    res.status(400).json({ error: error.message || 'Failed to initialize leave balances' });
  }
});

// Get leave statistics (managers/admins only)
router.get('/statistics', requireRole(['manager', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    
    const statistics = await leaveManagementService.getLeaveStatistics(userId, year);
    
    res.json({
      success: true,
      data: statistics
    });
  } catch (error: any) {
    console.error('Error fetching leave statistics:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch leave statistics' });
  }
});

// Get user leave overview (includes balances, recent requests, and statistics)
router.get('/overview/:userId', requireRole(['manager', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    
    const overview = await leaveManagementService.getUserLeaveOverview(userId);
    
    res.json({
      success: true,
      data: overview
    });
  } catch (error: any) {
    console.error('Error fetching user leave overview:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch user leave overview' });
  }
});

// Get current user's leave overview
router.get('/my-overview', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    const overview = await leaveManagementService.getUserLeaveOverview(userId);
    
    res.json({
      success: true,
      data: overview
    });
  } catch (error: any) {
    console.error('Error fetching user leave overview:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch user leave overview' });
  }
});

// Get leave request history (audit trail)
router.get('/requests/:id/history', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    // Check if user can access this leave request
    const leaveRequest = await leaveManagementService.getLeaveRequestById(id);
    if (!leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    
    // Users can only see their own history, managers/admins can see all
    const userRole = req.user?.role;
    if (leaveRequest.userId !== userId && !['manager', 'admin'].includes(userRole || '')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const history = await leaveManagementService.getLeaveRequestHistory(id);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    console.error('Error fetching leave request history:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch leave request history' });
  }
});

// Get user's leave history
router.get('/history/user/:userId', requireRole(['manager', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, action } = req.query;
    
    const filters: any = {};
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (action) filters.action = action as string;
    
    const history = await leaveManagementService.getUserLeaveHistory(userId, filters);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    console.error('Error fetching user leave history:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch user leave history' });
  }
});

// Get my leave history
router.get('/history/my', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    const { startDate, endDate, action } = req.query;
    
    const filters: any = {};
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (action) filters.action = action as string;
    
    const history = await leaveManagementService.getUserLeaveHistory(userId, filters);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    console.error('Error fetching my leave history:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch leave history' });
  }
});

// Get comprehensive audit trail (admin/manager only)
router.get('/audit-trail', requireRole(['manager', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { userId, performedBy, action, startDate, endDate, page = 1, limit = 50 } = req.query;
    
    const filters: any = {};
    if (userId) filters.userId = userId as string;
    if (performedBy) filters.performedBy = performedBy as string;
    if (action) filters.action = action as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    
    const auditTrail = await leaveManagementService.getAuditTrail(
      filters,
      parseInt(page as string),
      parseInt(limit as string)
    );
    
    res.json({
      success: true,
      ...auditTrail
    });
  } catch (error: any) {
    console.error('Error fetching audit trail:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch audit trail' });
  }
});

// Add this new endpoint before the export statement

// Check leave eligibility
router.post('/check-eligibility', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const { leaveTypeId, startDate, endDate } = req.body;
    
    if (!leaveTypeId || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'leaveTypeId, startDate, and endDate are required' 
      });
    }

    // Get leave type details
    const leaveType = await leaveManagementService.getLeaveTypeById(leaveTypeId);
    if (!leaveType) {
      return res.status(404).json({ 
        eligible: false,
        reason: 'Invalid leave type',
        availableDays: 0
      });
    }

    // Calculate requested days
    const start = new Date(startDate);
    const end = new Date(endDate);
    let totalDays = 0;
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        totalDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get user's leave balance for this year
    const year = new Date(startDate).getFullYear();
    const userBalances = await leaveManagementService.getUserLeaveBalances(userId, year);
    const balance = userBalances.find(b => b.leaveTypeId === leaveTypeId);
    
    if (!balance) {
      // Initialize balance if it doesn't exist
      await leaveManagementService.initializeLeaveBalances(userId, year);
      const newBalances = await leaveManagementService.getUserLeaveBalances(userId, year);
      const newBalance = newBalances.find(b => b.leaveTypeId === leaveTypeId);
      
      if (!newBalance) {
        return res.status(500).json({
          eligible: false,
          reason: 'Unable to determine leave balance',
          availableDays: 0
        });
      }
      
      const availableDays = newBalance.remainingDays;
      const eligible = totalDays <= availableDays;
      
      return res.json({
        eligible,
        reason: eligible ? undefined : `Insufficient leave balance. You have ${availableDays} days available but requested ${totalDays} days.`,
        availableDays
      });
    }

    const availableDays = balance.remainingDays;
    const eligible = totalDays <= availableDays;
    
    res.json({
      eligible,
      reason: eligible ? undefined : `Insufficient leave balance. You have ${availableDays} days available but requested ${totalDays} days.`,
      availableDays
    });
  } catch (error: any) {
    console.error('Error checking leave eligibility:', error);
    res.status(500).json({ 
      eligible: false,
      reason: 'Failed to check leave eligibility',
      availableDays: 0
    });
  }
});

// Calculate leave days
router.post('/calculate-days', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, halfDay = false } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    
    // Use the same calculation logic from leaveManagementService
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let totalDays = 0;
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      // Only count weekdays (Monday = 1, Sunday = 0)
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        totalDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const finalDays = halfDay ? totalDays / 2 : totalDays;
    
    res.json({
      success: true,
      totalDays: finalDays
    });
  } catch (error: any) {
    console.error('Error calculating leave days:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate leave days' });
  }
});

export default router;