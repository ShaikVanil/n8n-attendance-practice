import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { scheduledReportService } from '../services/scheduledReportService';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * Get all scheduled reports
 * GET /api/scheduled-reports
 */
router.get('/', requireRole(['manager', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.role === 'admin' ? undefined : req.user?.id;
    const reports = await scheduledReportService.getScheduledReports(userId);
    
    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error fetching scheduled reports:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled reports' });
  }
});

/**
 * Create a new scheduled report
 * POST /api/scheduled-reports
 */
router.post('/', requireRole(['manager', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const reportData = {
      ...req.body,
      created_by: req.user?.id
    };
    
    const report = await scheduledReportService.createScheduledReport(reportData);
    
    res.status(201).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error creating scheduled report:', error);
    res.status(500).json({ error: 'Failed to create scheduled report' });
  }
});

/**
 * Update a scheduled report
 * PUT /api/scheduled-reports/:id
 */
router.put('/:id', requireRole(['manager', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const report = await scheduledReportService.updateScheduledReport(id, updates);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error updating scheduled report:', error);
    res.status(500).json({ error: 'Failed to update scheduled report' });
  }
});

/**
 * Delete a scheduled report
 * DELETE /api/scheduled-reports/:id
 */
router.delete('/:id', requireRole(['manager', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await scheduledReportService.deleteScheduledReport(id);
    
    res.json({
      success: true,
      message: 'Scheduled report deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting scheduled report:', error);
    res.status(500).json({ error: 'Failed to delete scheduled report' });
  }
});

/**
 * Execute a scheduled report manually
 * POST /api/scheduled-reports/:id/execute
 */
router.post('/:id/execute', requireRole(['manager', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Execute the report asynchronously
    scheduledReportService.executeScheduledReport(id).catch(error => {
      console.error('Error in manual report execution:', error);
    });
    
    res.json({
      success: true,
      message: 'Report execution started'
    });
  } catch (error) {
    console.error('Error starting report execution:', error);
    res.status(500).json({ error: 'Failed to start report execution' });
  }
});

/**
 * Get execution logs for a scheduled report
 * GET /api/scheduled-reports/:id/logs
 */
router.get('/:id/logs', requireRole(['manager', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const logs = await scheduledReportService.getExecutionLogs(id, limit);
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching execution logs:', error);
    res.status(500).json({ error: 'Failed to fetch execution logs' });
  }
});

export default router;