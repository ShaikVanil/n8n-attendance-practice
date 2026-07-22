import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { delegationService } from '../services/delegationService';
import { User } from '../types/device';
import {
  CreateDelegationRequest,
  UpdateDelegationRequest,
  DelegationFilters
} from '../types/leave';

interface AuthRequest extends Request {
  user?: User;
}

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get delegations (managers only)
router.get('/', requireRole(['manager', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const {
      delegatorId,
      delegateId,
      isActive,
      startDate,
      endDate,
      page = 1,
      limit = 10
    } = req.query;

    const filters: DelegationFilters = {};
    if (delegatorId) filters.delegatorId = delegatorId as string;
    if (delegateId) filters.delegateId = delegateId as string;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (startDate) filters.startDate = startDate as string;
    if (endDate) filters.endDate = endDate as string;

    const result = await delegationService.getDelegations(
      filters,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('Error fetching delegations:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch delegations' });
  }
});

// Get delegation by ID
router.get('/:id', requireRole(['manager', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const delegation = await delegationService.getDelegationById(id);
    
    if (!delegation) {
      return res.status(404).json({ error: 'Delegation not found' });
    }
    
    res.json({
      success: true,
      data: delegation
    });
  } catch (error: any) {
    console.error('Error fetching delegation:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch delegation' });
  }
});

// Create delegation (managers only)
router.post('/', requireRole(['manager', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const delegationData: CreateDelegationRequest = req.body;
    const delegation = await delegationService.createDelegation(req.user.id, delegationData);
    
    res.status(201).json({
      success: true,
      data: delegation
    });
  } catch (error: any) {
    console.error('Error creating delegation:', error);
    res.status(400).json({ error: error.message || 'Failed to create delegation' });
  }
});

// Update delegation
router.put('/:id', requireRole(['manager', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;
    const updateData: UpdateDelegationRequest = req.body;
    const delegation = await delegationService.updateDelegation(id, req.user.id, updateData);
    
    res.json({
      success: true,
      data: delegation
    });
  } catch (error: any) {
    console.error('Error updating delegation:', error);
    res.status(400).json({ error: error.message || 'Failed to update delegation' });
  }
});

// Deactivate delegation
router.delete('/:id', requireRole(['manager', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;
    const delegation = await delegationService.deactivateDelegation(id, req.user.id);
    
    res.json({
      success: true,
      data: delegation
    });
  } catch (error: any) {
    console.error('Error deactivating delegation:', error);
    res.status(400).json({ error: error.message || 'Failed to deactivate delegation' });
  }
});

// Get my delegations (as delegator)
router.get('/my/delegated', requireRole(['manager', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { page = 1, limit = 10 } = req.query;
    const result = await delegationService.getDelegations(
      { delegatorId: req.user.id },
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('Error fetching my delegations:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch delegations' });
  }
});

// Get delegations where I'm the delegate
router.get('/my/assigned', requireRole(['manager', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const delegations = await delegationService.getDelegationsAsDelegate(req.user.id);
    
    res.json({
      success: true,
      data: delegations
    });
  } catch (error: any) {
    console.error('Error fetching assigned delegations:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch assigned delegations' });
  }
});

// Get delegation history
router.get('/:id/history', requireRole(['manager', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const history = await delegationService.getDelegationHistory(id);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    console.error('Error fetching delegation history:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch delegation history' });
  }
});

export default router;