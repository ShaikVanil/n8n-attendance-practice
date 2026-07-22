import express from 'express';
import { activityService } from '../services/activityService';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Get user activities (admin only)
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { userId, page = 1, limit = 50 } = req.query;
    
    const result = await activityService.getUserActivities(
      userId as string,
      parseInt(page as string),
      parseInt(limit as string)
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Get activity statistics (admin only)
router.get('/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const stats = await activityService.getActivityStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity statistics' });
  }
});

// Clean up old activities (admin only)
router.delete('/cleanup', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { daysToKeep = 90 } = req.body;
    const deletedCount = await activityService.deleteOldActivities(daysToKeep);
    
    res.json({ 
      message: `Cleaned up ${deletedCount} old activities`,
      deletedCount 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clean up activities' });
  }
});

export default router;