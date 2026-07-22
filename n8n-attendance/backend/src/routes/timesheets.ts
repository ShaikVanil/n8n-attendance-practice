import { Router, Request, Response } from 'express';
import { timesheetService, CreateTimesheetRequest, UpdateTimesheetRequest, TimesheetFilters } from '../services/timesheetService';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, query, param } from 'express-validator';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Validation schemas
const createTimesheetValidation = [
    body('weekStartDate').isISO8601().withMessage('Week start date must be a valid date'),
    body('entries').optional().isArray().withMessage('Entries must be an array'),
    body('entries.*.date').optional().isISO8601().withMessage('Entry date must be valid'),
    body('entries.*.startTime').optional().isISO8601().withMessage('Start time must be valid'),
    body('entries.*.endTime').optional().isISO8601().withMessage('End time must be valid'),
    body('entries.*.breakDuration').optional().isInt({ min: 0 }).withMessage('Break duration must be a positive integer'),
    body('entries.*.description').optional().isString().withMessage('Description must be a string'),
    body('entries.*.projectCode').optional().isString().withMessage('Project code must be a string')
];

const updateTimesheetValidation = [
    param('id').isUUID().withMessage('Timesheet ID must be a valid UUID'),
    body('entries').optional().isArray().withMessage('Entries must be an array'),
    body('status').optional().isIn(['draft', 'submitted']).withMessage('Status must be draft or submitted')
];

const approvalValidation = [
    param('id').isUUID().withMessage('Timesheet ID must be a valid UUID'),
    body('comments').optional().isString().withMessage('Comments must be a string'),
    body('reason').optional().isString().withMessage('Reason must be a string')
];

// GET /api/timesheets - Get user's timesheets
router.get('/',
    authenticateToken,
    [
        query('status').optional().isIn(['draft', 'submitted', 'approved', 'rejected']).withMessage('Invalid status'),
        query('weekStartDate').optional().isISO8601().withMessage('Week start date must be valid'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
    ],
    validateRequest,
    async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const filters: TimesheetFilters = {
                userId,
                status: req.query.status as string,
                weekStartDate: req.query.weekStartDate as string,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
                offset: req.query.offset ? parseInt(req.query.offset as string) : 0
            };

            const result = await timesheetService.getTimesheets(filters);
            res.json(result);
        } catch (error) {
            console.error('Error fetching timesheets:', error);
            res.status(500).json({ error: 'Failed to fetch timesheets' });
        }
    }
);

// GET /api/timesheets/:id - Get specific timesheet
router.get('/:id',
    authenticateToken,
    [param('id').isUUID().withMessage('Timesheet ID must be a valid UUID')],
    validateRequest,
    async (req: AuthRequest, res: Response) => {
        try {
            const timesheet = await timesheetService.getTimesheetById(req.params.id);

            // Check if user owns this timesheet or is the manager
            if (timesheet.userId !== req.user?.id && timesheet.managerId !== req.user?.id) {
                return res.status(403).json({ error: 'Access denied' });
            }

            res.json(timesheet);
        } catch (error) {
            console.error('Error fetching timesheet:', error);
            if (error instanceof Error && error.message === 'Timesheet not found') {
                res.status(404).json({ error: 'Timesheet not found' });
            } else {
                res.status(500).json({ error: 'Failed to fetch timesheet' });
            }
        }
    }
);

// POST /api/timesheets - Create new timesheet
router.post('/',
    authenticateToken,
    createTimesheetValidation,
    validateRequest,
    async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const data: CreateTimesheetRequest = req.body;
            const timesheet = await timesheetService.createTimesheet(userId, data);

            res.status(201).json(timesheet);
        } catch (error) {
            console.error('Error creating timesheet:', error);
            if (error instanceof Error) {
                if (error.message.includes('duplicate key')) {
                    res.status(409).json({ error: 'Timesheet for this week already exists' });
                } else if (error.message.includes('manager')) {
                    res.status(400).json({ error: error.message });
                } else {
                    res.status(500).json({ error: 'Failed to create timesheet' });
                }
            } else {
                res.status(500).json({ error: 'Failed to create timesheet' });
            }
        }
    }
);

// PUT /api/timesheets/:id - Update timesheet
router.put('/:id',
    authenticateToken,
    updateTimesheetValidation,
    validateRequest,
    async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const data: UpdateTimesheetRequest = req.body;
            const timesheet = await timesheetService.updateTimesheet(req.params.id, userId, data);

            res.json(timesheet);
        } catch (error) {
            console.error('Error updating timesheet:', error);
            if (error instanceof Error) {
                if (error.message.includes('not found') || error.message.includes('access denied')) {
                    res.status(404).json({ error: error.message });
                } else if (error.message.includes('Cannot edit')) {
                    res.status(400).json({ error: error.message });
                } else {
                    res.status(500).json({ error: 'Failed to update timesheet' });
                }
            } else {
                res.status(500).json({ error: 'Failed to update timesheet' });
            }
        }
    }
);

// DELETE /api/timesheets/:id - Delete timesheet (draft only)
router.delete('/:id',
    authenticateToken,
    [param('id').isUUID().withMessage('Timesheet ID must be a valid UUID')],
    validateRequest,
    async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            await timesheetService.deleteTimesheet(req.params.id, userId);
            res.status(204).send();
        } catch (error) {
            console.error('Error deleting timesheet:', error);
            if (error instanceof Error && error.message.includes('not found')) {
                res.status(404).json({ error: 'Timesheet not found or cannot be deleted' });
            } else {
                res.status(500).json({ error: 'Failed to delete timesheet' });
            }
        }
    }
);

// POST /api/timesheets/:id/submit - Submit timesheet for approval
router.post('/:id/submit',
    authenticateToken,
    [param('id').isUUID().withMessage('Timesheet ID must be a valid UUID')],
    validateRequest,
    async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const timesheet = await timesheetService.submitTimesheet(req.params.id, userId);
            res.json(timesheet);
        } catch (error) {
            console.error('Error submitting timesheet:', error);
            if (error instanceof Error && error.message.includes('not found')) {
                res.status(404).json({ error: 'Timesheet not found or cannot be submitted' });
            } else {
                res.status(500).json({ error: 'Failed to submit timesheet' });
            }
        }
    }
);

// Manager routes
// GET /api/timesheets/team - Get team timesheets for managers
router.get('/team',
    authenticateToken,
    [
        query('status').optional().isIn(['draft', 'submitted', 'approved', 'rejected']).withMessage('Invalid status'),
        query('weekStartDate').optional().isISO8601().withMessage('Week start date must be valid'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
    ],
    validateRequest,
    async (req: AuthRequest, res: Response) => {
        try {
            const managerId = req.user?.id;
            if (!managerId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            // Check if user has manager role
            if (req.user?.role !== 'manager' && req.user?.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied. Manager or admin role required.' });
            }

            const filters: TimesheetFilters = {
                managerId,
                status: req.query.status as string,
                weekStartDate: req.query.weekStartDate as string,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
                offset: req.query.offset ? parseInt(req.query.offset as string) : 0
            };

            const result = await timesheetService.getTimesheets(filters);
            res.json(result);
        } catch (error) {
            console.error('Error fetching team timesheets:', error);
            res.status(500).json({ error: 'Failed to fetch team timesheets' });
        }
    }
);

// GET /api/timesheets/manager/pending - Get pending timesheets for approval
router.get('/manager/pending',
    authenticateToken,
    async (req: AuthRequest, res: Response) => {
        try {
            const managerId = req.user?.id;
            if (!managerId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const filters: TimesheetFilters = {
                managerId,
                status: 'submitted'
            };

            const result = await timesheetService.getTimesheets(filters);
            res.json(result);
        } catch (error) {
            console.error('Error fetching pending timesheets:', error);
            res.status(500).json({ error: 'Failed to fetch pending timesheets' });
        }
    }
);

// POST /api/timesheets/:id/approve - Approve timesheet
router.post('/:id/approve',
    authenticateToken,
    approvalValidation,
    validateRequest,
    async (req: AuthRequest, res: Response) => {
        try {
            const managerId = req.user?.id;
            if (!managerId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const { comments } = req.body;
            const timesheet = await timesheetService.approveTimesheet(req.params.id, managerId, comments);

            res.json(timesheet);
        } catch (error) {
            console.error('Error approving timesheet:', error);
            if (error instanceof Error && error.message.includes('not found')) {
                res.status(404).json({ error: 'Timesheet not found or cannot be approved' });
            } else {
                res.status(500).json({ error: 'Failed to approve timesheet' });
            }
        }
    }
);

// POST /api/timesheets/:id/reject - Reject timesheet
router.post('/:id/reject',
    authenticateToken,
    [
        param('id').isUUID().withMessage('Timesheet ID must be a valid UUID'),
        body('reason').notEmpty().withMessage('Rejection reason is required')
    ],
    validateRequest,
    async (req: AuthRequest, res: Response) => {
        try {
            const managerId = req.user?.id;
            if (!managerId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const { reason } = req.body;
            const timesheet = await timesheetService.rejectTimesheet(req.params.id, managerId, reason);

            res.json(timesheet);
        } catch (error) {
            console.error('Error rejecting timesheet:', error);
            if (error instanceof Error && error.message.includes('not found')) {
                res.status(404).json({ error: 'Timesheet not found or cannot be rejected' });
            } else {
                res.status(500).json({ error: 'Failed to reject timesheet' });
            }
        }
    }
);

export default router;