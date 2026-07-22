import express, { Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';
import { dataRetentionService, DataRetentionPolicy, RetentionFilters } from '../services/dataRetentionService';

const router = express.Router();

// Get all retention policies
router.get('/policies', authenticateToken, requireRole(['admin', 'hr']), async (req: AuthRequest, res: Response) => {
  try {
    const filters: RetentionFilters = {
      data_type: req.query.data_type as string,
      is_active: req.query.is_active ? req.query.is_active === 'true' : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    };

    const result = await dataRetentionService.getRetentionPolicies(filters);
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching retention policies:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new retention policy
router.post('/policies', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const policyData: Omit<DataRetentionPolicy, 'id'> = {
      ...req.body,
      created_by: req.user!.id
    };

    const policyId = await dataRetentionService.createRetentionPolicy(policyData, req);
    res.status(201).json({ id: policyId, message: 'Retention policy created successfully' });
  } catch (error: any) {
    console.error('Error creating retention policy:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update retention policy
router.put('/policies/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await dataRetentionService.updateRetentionPolicy(id, req.body);
    res.json({ message: 'Retention policy updated successfully' });
  } catch (error: any) {
    console.error('Error updating retention policy:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete retention policy
router.delete('/policies/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await dataRetentionService.deleteRetentionPolicy(id);
    res.json({ message: 'Retention policy deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting retention policy:', error);
    res.status(500).json({ error: error.message });
  }
});

// Execute specific retention policy
router.post('/policies/:id/execute', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const executionId = await dataRetentionService.executeRetentionPolicy(id, req.user!.id);
    res.json({ 
      message: 'Retention policy executed successfully',
      executionId
    });
  } catch (error: any) {
    console.error('Error executing retention policy:', error);
    res.status(500).json({ error: error.message });
  }
});

// Execute all active retention policies
router.post('/execute-all', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const result = await dataRetentionService.executeAllRetentionPolicies(req.user!.id);
    res.json({
      message: 'Retention policies execution completed',
      ...result
    });
  } catch (error: any) {
    console.error('Error executing all retention policies:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get execution history
router.get('/executions', authenticateToken, requireRole(['admin', 'hr']), async (req: AuthRequest, res: Response) => {
  try {
    const policyId = req.query.policy_id as string;
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const result = await dataRetentionService.getExecutionHistory(policyId, page, limit);
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching execution history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get retention statistics
router.get('/statistics', authenticateToken, requireRole(['admin', 'hr']), async (req: AuthRequest, res: Response) => {
  try {
    const stats = await dataRetentionService.getRetentionStatistics();
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching retention statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Initialize default policies
router.post('/initialize-defaults', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    await dataRetentionService.initializeDefaultPolicies(req.user!.id);
    res.json({ message: 'Default retention policies initialized successfully' });
  } catch (error: any) {
    console.error('Error initializing default policies:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;