import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { DailyTimesheetFilters, dailyTimesheetService } from '../services/dailyTimesheetService';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';

const router = Router();

// Get daily timesheets for current user
router.get('/',
  authenticateToken,
  [
    query('status').optional().isIn(['draft', 'submitted', 'approved', 'rejected']),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const filters = {
        userId,
        status: req.query.status as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      };

      const result = await dailyTimesheetService.getDailyTimesheets(filters);
      res.json(result);
    } catch (error) {
      console.error('Error fetching daily timesheets:', error);
      res.status(500).json({ message: 'Failed to fetch daily timesheets' });
    }
  }
);

// GET /api/timesheets/daily/review - Get daily timesheets for review (managers)
router.get('/review',
  authenticateToken,
  [
    query('status').optional().isIn(['draft', 'submitted', 'approved', 'rejected']),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user || (user.role !== 'manager' && user.role !== 'admin')) {
        return res.status(403).json({ error: 'Access denied. Manager or admin role required.' });
      }

      const filters: DailyTimesheetFilters = {
        status: req.query.status as string || 'submitted',
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      };

      const result = await dailyTimesheetService.getDailyTimesheetsForReview(filters);
      
      res.set('X-Total-Count', result.total.toString());
      res.json(result);
    } catch (error) {
      console.error('Error getting daily timesheets for review:', error);
      res.status(500).json({ error: 'Failed to get daily timesheets for review' });
    }
  }
);

// Get daily timesheet by ID
router.get('/:id',
  authenticateToken,
  [param('id').isUUID()],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const timesheet = await dailyTimesheetService.getDailyTimesheet(req.params.id, req.user!.id);
      
      if (!timesheet) {
        return res.status(404).json({ message: 'Daily timesheet not found' });
      }

      res.json(timesheet);
    } catch (error) {
      console.error('Error fetching daily timesheet:', error);
      res.status(500).json({ message: 'Failed to fetch daily timesheet' });
    }
  }
);

// Get daily timesheet by date
// Remove this duplicate route definition:
// router.get('/date/:date',
//   authenticateToken,
//   [param('date').isISO8601()],
//   validateRequest,
//   async (req: AuthRequest, res: Response) => {
//     try {
//       const timesheet = await dailyTimesheetService.getDailyTimesheetByDate(
//         req.params.date,
//         req.user!.id
//       );
//       
//       if (!timesheet) {
//         return res.status(404).json({ message: 'Daily timesheet not found for this date' });
//       }
//
//       res.json(timesheet);
//     } catch (error) {
//       console.error('Error fetching daily timesheet by date:', error);
//       res.status(500).json({ message: 'Failed to fetch daily timesheet' });
//     }
//   }
// );

// Get daily timesheets by date (updated to return array)
router.get('/by-date/:date',
  authenticateToken,
  [param('date').isISO8601()],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const timesheets = await dailyTimesheetService.getDailyTimesheetByDate(
        req.params.date,
        req.user!.id
      );
      
      // Return empty array instead of 404 when no timesheets found
      res.json(timesheets);
    } catch (error) {
      console.error('Error fetching daily timesheets by date:', error);
      res.status(500).json({ message: 'Failed to fetch daily timesheets' });
    }
  }
);

// Create daily timesheet
router.post('/',
  authenticateToken,
  [
    body('date').isISO8601(),
    body('startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('breakDuration').optional().isInt({ min: 0 }),
    body('description').optional().isString().isLength({ max: 1000 }),
    body('projectCode').optional().isString().isLength({ max: 50 })
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const data = {
        ...req.body,
        userId
      };

      const timesheet = await dailyTimesheetService.createDailyTimesheet(data);
      res.status(201).json(timesheet);
    } catch (error: any) {
      console.error('Error creating daily timesheet:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({ message: error.message });
      }
      
      res.status(500).json({ message: 'Failed to create daily timesheet' });
    }
  }
);

// Update daily timesheet
router.put('/:id',
  authenticateToken,
  [
    param('id').isUUID(),
    body('startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('breakDuration').optional().isInt({ min: 0 }),
    body('description').optional().isString().isLength({ max: 1000 }),
    body('projectCode').optional().isString().isLength({ max: 50 }),
    body('status').optional().isIn(['draft', 'submitted'])
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const timesheet = await dailyTimesheetService.updateDailyTimesheet(
        req.params.id,
        req.user!.id,
        req.body
      );
      
      if (!timesheet) {
        return res.status(404).json({ message: 'Daily timesheet not found' });
      }

      res.json(timesheet);
    } catch (error: any) {
      console.error('Error updating daily timesheet:', error);
      
      if (error.message.includes('cannot be modified')) {
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ message: 'Failed to update daily timesheet' });
    }
  }
);

// Submit daily timesheet
router.post('/:id/submit',
  authenticateToken,
  [param('id').isUUID()],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const timesheet = await dailyTimesheetService.submitDailyTimesheet(
        req.params.id,
        req.user!.id
      );
      
      if (!timesheet) {
        return res.status(404).json({ message: 'Daily timesheet not found' });
      }

      res.json(timesheet);
    } catch (error: any) {
      console.error('Error submitting daily timesheet:', error);
      
      if (error.message.includes('cannot be submitted')) {
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ message: 'Failed to submit daily timesheet' });
    }
  }
);

// Submit multiple daily timesheets
router.post('/submit-multiple',
  authenticateToken,
  [
    body('ids').isArray().withMessage('IDs must be an array'),
    body('ids.*').isUUID().withMessage('Each ID must be a valid UUID')
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const { ids } = req.body;
      const results = await dailyTimesheetService.submitMultipleDailyTimesheets(
        ids,
        req.user!.id
      );
      
      res.json({
        message: `Successfully submitted ${results.length} timesheets`,
        submitted: results
      });
    } catch (error: any) {
      console.error('Error submitting multiple daily timesheets:', error);
      res.status(500).json({ message: 'Failed to submit timesheets' });
    }
  }
);

// Delete daily timesheet
router.delete('/:id',
  authenticateToken,
  [param('id').isUUID()],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const success = await dailyTimesheetService.deleteDailyTimesheet(
        req.params.id,
        req.user!.id
      );
      
      if (!success) {
        return res.status(404).json({ message: 'Daily timesheet not found' });
      }

      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting daily timesheet:', error);
      
      if (error.message.includes('cannot be deleted')) {
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ message: 'Failed to delete daily timesheet' });
    }
  }
);

// POST /api/timesheets/daily/:id/approve - Approve daily timesheet
router.post('/:id/approve',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Timesheet ID must be a valid UUID')
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user || (user.role !== 'manager' && user.role !== 'admin')) {
        return res.status(403).json({ error: 'Access denied. Manager or admin role required.' });
      }

      const { comments } = req.body;
      const timesheet = await dailyTimesheetService.approveDailyTimesheet(
        req.params.id, 
        user.id, 
        comments
      );

      if (!timesheet) {
        return res.status(404).json({ error: 'Timesheet not found or cannot be approved' });
      }

      res.json(timesheet);
    } catch (error) {
      console.error('Error approving daily timesheet:', error);
      res.status(500).json({ error: 'Failed to approve daily timesheet' });
    }
  }
);

// POST /api/timesheets/daily/:id/reject - Reject daily timesheet
router.post('/:id/reject',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Timesheet ID must be a valid UUID'),
    body('reason').notEmpty().withMessage('Rejection reason is required')
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user || (user.role !== 'manager' && user.role !== 'admin')) {
        return res.status(403).json({ error: 'Access denied. Manager or admin role required.' });
      }

      const { reason } = req.body;
      const timesheet = await dailyTimesheetService.rejectDailyTimesheet(
        req.params.id, 
        user.id, 
        reason
      );

      if (!timesheet) {
        return res.status(404).json({ error: 'Timesheet not found or cannot be rejected' });
      }

      res.json(timesheet);
    } catch (error) {
      console.error('Error rejecting daily timesheet:', error);
      res.status(500).json({ error: 'Failed to reject daily timesheet' });
    }
  }
);

// Add this route after the existing routes

// Get daily summary
router.get('/summary/:date',
  authenticateToken,
  [param('date').isISO8601()],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const summary = await dailyTimesheetService.getDailySummary(
        req.params.date,
        req.user!.id
      );
      
      res.json(summary);
    } catch (error) {
      console.error('Error fetching daily summary:', error);
      res.status(500).json({ message: 'Failed to fetch daily summary' });
    }
  }
);

export default router;