import express from 'express';
import { userService } from '../services/userService';
import { authenticateToken, requireRole } from '../middleware/auth';
import { Request, Response } from 'express';
import { User } from '../types/user';

interface AuthRequest extends Request {
  user?: User;
}

const router = express.Router();

router.get('/', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    
    const result = await userService.getAllUsers(page, limit, search);
    res.json(result);
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, firstName, lastName, role, isActive } = req.body;
    
    // Validation
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ error: 'Email, password, firstName, lastName, and role are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    if (!['employee', 'manager', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const user = await userService.createUser({
      email,
      password,
      firstName,
      lastName,
      role,
      isActive
    }, req.user?.id || 'system');
    
    res.status(201).json({
      message: 'User created successfully',
      user
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    if (error.message === 'User already exists with this email') {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { email, firstName, lastName, role, isActive, currentLocationId } = req.body;
    
    // Validation logic
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }
    
    if (role && !['employee', 'manager', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const user = await userService.updateUser(req.params.id, {
      email,
      firstName,
      lastName,
      role,
      isActive,
      currentLocationId  // Add this field
    }, req.user?.id || 'system');
    
    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Email already exists') {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    await userService.deleteUser(req.params.id, req.user?.id || 'system');
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/reset-password', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    await userService.resetPassword(req.params.id, newPassword, req.user?.id || 'system');
    res.json({ message: 'Password reset successfully' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/bulk-update', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { userIds, role, isActive } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'User IDs array is required' });
    }
    
    if (role && !['employee', 'manager', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    await userService.bulkUpdateUsers({ userIds, role, isActive }, req.user?.id || 'system');
    res.json({ message: 'Users updated successfully' });
  } catch (error: any) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add these routes before the export default router line

// Assign manager to user (admin only)
router.put('/:id/manager', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { manager_id } = req.body;
    
    await userService.assignManager(id, manager_id);
    res.json({ message: 'Manager assigned successfully' });
  } catch (error) {
    console.error('Error assigning manager:', error);
    res.status(500).json({ error: 'Failed to assign manager' });
  }
});

// Get direct reports for a manager
router.get('/:id/direct-reports', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const directReports = await userService.getDirectReports(id);
    res.json(directReports);
  } catch (error) {
    console.error('Error fetching direct reports:', error);
    res.status(500).json({ error: 'Failed to fetch direct reports' });
  }
});

// Get manager hierarchy for a user
router.get('/:id/manager-hierarchy', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const hierarchy = await userService.getManagerHierarchy(id);
    res.json(hierarchy);
  } catch (error) {
    console.error('Error fetching manager hierarchy:', error);
    res.status(500).json({ error: 'Failed to fetch manager hierarchy' });
  }
});

export default router;