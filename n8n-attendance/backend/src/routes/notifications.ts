import express from 'express';
import { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { notificationService } from '../services/notificationService';
import { User } from '../types/device';

// Define AuthRequest interface to match the one in auth middleware
interface AuthRequest extends Request {
  user?: User;
}

const router = express.Router();

// Get user notification preferences
router.get('/preferences', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const preferences = await notificationService.getUserPreferences(userId);
    res.json(preferences);
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user notification preferences
router.put('/preferences', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const preferences = await notificationService.updateUserPreferences(userId, req.body);
    res.json(preferences);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notification history
router.get('/history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const history = await notificationService.getNotificationHistory(userId, limit, offset);
    res.json(history);
  } catch (error) {
    console.error('Error getting notification history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test notification endpoint (for development)
router.post('/test', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    await notificationService.sendNotification({
      userId,
      type: 'auto_checkin_success',
      title: 'Auto Check-in Successful',
      message: 'Your automatic check-in has been processed successfully.',
      data: {
        timestamp: new Date().toLocaleString(),
        deviceName: 'Test Device',
        officeName: 'Test Office'
      },
      channels: ['email', 'sms', 'realtime'],
      priority: 'medium'
    });

    res.json({ message: 'Test notification sent' });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;