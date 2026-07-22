import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { policyTemplateService } from '../services/policyTemplateService';
import { User } from '../types/device';
import { CreatePolicyTemplateRequest, UpdatePolicyTemplateRequest, PolicyTemplateFilters } from '../services/policyTemplateService';

interface AuthRequest extends Request {
  user?: User;
}

const router = Router();

// Get all policy templates with optional filters (Admin/Manager)
router.get('/', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const filters: PolicyTemplateFilters = {
      employeeType: req.query.employeeType as string,
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
      isDefault: req.query.isDefault ? req.query.isDefault === 'true' : undefined,
      createdBy: req.query.createdBy as string
    };
    
    const templates = await policyTemplateService.getPolicyTemplates(filters);
    res.json(templates);
  } catch (error: any) {
    console.error('Error getting policy templates:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to retrieve policy templates' });
  }
});

// Get policy template by ID (Admin/Manager)
router.get('/:id', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const template = await policyTemplateService.getPolicyTemplateById(id);
    
    if (!template) {
      return res.status(404).json({ error: 'Policy template not found' });
    }
    
    res.json(template);
  } catch (error: any) {
    console.error('Error getting policy template:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to retrieve policy template' });
  }
});

// Create new policy template (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const templateData: CreatePolicyTemplateRequest = req.body;
    const createdBy = req.user?.id;
    
    if (!createdBy) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    // Validate required fields
    if (!templateData.name || !templateData.employeeType || !templateData.rules) {
      return res.status(400).json({ error: 'Name, employee type, and rules are required' });
    }
    
    // Validate employee type
    const validEmployeeTypes = ['full_time', 'part_time', 'contractor', 'intern', 'custom'];
    if (!validEmployeeTypes.includes(templateData.employeeType)) {
      return res.status(400).json({ error: 'Invalid employee type' });
    }
    
    // Validate policy rules
    const validation = await policyTemplateService.validatePolicyRules(templateData.rules);
    if (!validation.isValid) {
      return res.status(400).json({ error: 'Invalid policy rules', details: validation.errors });
    }
    
    const template = await policyTemplateService.createPolicyTemplate(templateData, createdBy);
    res.status(201).json(template);
  } catch (error: any) {
    console.error('Error creating policy template:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create policy template' });
  }
});

// Update policy template (Admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates: UpdatePolicyTemplateRequest = req.body;
    
    // Validate employee type if provided
    if (updates.employeeType) {
      const validEmployeeTypes = ['full_time', 'part_time', 'contractor', 'intern', 'custom'];
      if (!validEmployeeTypes.includes(updates.employeeType)) {
        return res.status(400).json({ error: 'Invalid employee type' });
      }
    }
    
    // Validate policy rules if provided
    if (updates.rules) {
      const validation = await policyTemplateService.validatePolicyRules(updates.rules);
      if (!validation.isValid) {
        return res.status(400).json({ error: 'Invalid policy rules', details: validation.errors });
      }
    }
    
    const template = await policyTemplateService.updatePolicyTemplate(id, updates);
    res.json(template);
  } catch (error: any) {
    console.error('Error updating policy template:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: 'Policy template not found' });
    } else {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update policy template' });
    }
  }
});

// Delete policy template (Admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await policyTemplateService.deletePolicyTemplate(id);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting policy template:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: 'Policy template not found' });
    } else {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete policy template' });
    }
  }
});

// Assign policy template to user (Admin/Manager)
router.post('/:id/assign', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { id: policyTemplateId } = req.params;
    const { userId, officeId, effectiveFrom } = req.body;
    const assignedBy = req.user?.id;
    
    if (!assignedBy) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const effectiveDate = effectiveFrom ? new Date(effectiveFrom) : new Date();
    
    const assignment = await policyTemplateService.assignPolicyToUser(
      userId,
      policyTemplateId,
      assignedBy,
      officeId,
      effectiveDate
    );
    
    res.status(201).json(assignment);
  } catch (error: any) {
    console.error('Error assigning policy template:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to assign policy template' });
  }
});

// Get user policy assignments (Admin/Manager/User for own data)
router.get('/assignments/user/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUser = req.user;
    
    // Users can only view their own assignments unless they're admin/manager
    if (requestingUser?.id !== userId && !['admin', 'manager'].includes(requestingUser?.role || '')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const assignments = await policyTemplateService.getUserPolicyAssignments(userId);
    res.json(assignments);
  } catch (error: any) {
    console.error('Error getting user policy assignments:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to retrieve policy assignments' });
  }
});

// Get active policy for user (Admin/Manager/User for own data)
router.get('/active/user/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUser = req.user;
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    
    // Users can only view their own active policy unless they're admin/manager
    if (requestingUser?.id !== userId && !['admin', 'manager'].includes(requestingUser?.role || '')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const activePolicy = await policyTemplateService.getActivePolicyForUser(userId, date);
    
    if (!activePolicy) {
      return res.status(404).json({ error: 'No active policy found for user' });
    }
    
    res.json(activePolicy);
  } catch (error: any) {
    console.error('Error getting active policy for user:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to retrieve active policy' });
  }
});

// Validate policy rules (Admin only)
router.post('/validate', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { rules } = req.body;
    
    if (!rules) {
      return res.status(400).json({ error: 'Policy rules are required' });
    }
    
    const validation = await policyTemplateService.validatePolicyRules(rules);
    res.json(validation);
  } catch (error: any) {
    console.error('Error validating policy rules:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to validate policy rules' });
  }
});

// Preview policy impact (Admin only)
router.post('/:id/preview', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id: policyTemplateId } = req.params;
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'User IDs array is required' });
    }
    
    const preview = await policyTemplateService.previewPolicyImpactDetailed(policyTemplateId, userIds);
    res.json(preview);
  } catch (error: any) {
    console.error('Error previewing policy impact:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to preview policy impact' });
  }
});

// Policy Template Versioning Routes

// Create a new version of a policy template (Admin only)
router.post('/:id/versions', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { changesSummary } = req.body;
    const createdBy = req.user?.id;

    if (!createdBy) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!changesSummary) {
      return res.status(400).json({ error: 'Changes summary is required' });
    }

    const version = await policyTemplateService.createPolicyTemplateVersion(
      id,
      changesSummary,
      createdBy
    );

    res.status(201).json(version);
  } catch (error: any) {
    console.error('Error creating policy template version:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create policy template version' });
  }
});

// Get version history for a policy template (Admin/Manager)
router.get('/:id/versions', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const versions = await policyTemplateService.getPolicyTemplateVersionHistory(id);
    res.json(versions);
  } catch (error: any) {
    console.error('Error getting policy template version history:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to retrieve version history' });
  }
});

// Get a specific version of a policy template (Admin/Manager)
router.get('/versions/:versionId', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { versionId } = req.params;
    const version = await policyTemplateService.getPolicyTemplateVersion(versionId);
    
    if (!version) {
      return res.status(404).json({ error: 'Policy template version not found' });
    }
    
    res.json(version);
  } catch (error: any) {
    console.error('Error getting policy template version:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to retrieve policy template version' });
  }
});

// Compare two versions of a policy template (Admin/Manager)
router.post('/versions/compare', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { versionId1, versionId2 } = req.body;

    if (!versionId1 || !versionId2) {
      return res.status(400).json({ error: 'Both version IDs are required for comparison' });
    }

    const comparison = await policyTemplateService.comparePolicyTemplateVersions(
      versionId1,
      versionId2
    );

    res.json(comparison);
  } catch (error: any) {
    console.error('Error comparing policy template versions:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to compare policy template versions' });
  }
});

// Rollback policy template to a specific version (Admin only)
router.post('/:id/rollback', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { versionId } = req.body;
    const rolledBackBy = req.user?.id;

    if (!rolledBackBy) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!versionId) {
      return res.status(400).json({ error: 'Version ID is required for rollback' });
    }

    const rolledBackTemplate = await policyTemplateService.rollbackPolicyTemplateToVersion(
      id,
      versionId,
      rolledBackBy
    );

    res.json({
      message: 'Policy template successfully rolled back',
      template: rolledBackTemplate
    });
  } catch (error: any) {
    console.error('Error rolling back policy template:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to rollback policy template' });
  }
});

// Cleanup old versions (Admin only)
router.delete('/:id/versions/cleanup', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const keepLatestCount = parseInt(req.query.keepLatest as string) || 10;

    if (keepLatestCount < 1) {
      return res.status(400).json({ error: 'Keep latest count must be at least 1' });
    }

    const deletedCount = await policyTemplateService.cleanupOldVersions(id, keepLatestCount);

    res.json({
      message: `Successfully cleaned up ${deletedCount} old versions`,
      deletedCount,
      keptLatest: keepLatestCount
    });
  } catch (error: any) {
    console.error('Error cleaning up old versions:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to cleanup old versions' });
  }
});

export default router;