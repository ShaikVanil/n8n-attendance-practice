import { Router, Request, Response } from 'express';
import { DeviceService } from '../services/deviceService';
import { authenticateToken, requireRole } from '../middleware/auth';
import { DeviceRegistrationRequest } from '../types/device';

interface AuthRequest extends Request {
  user?: any;
}

const router = Router();
const deviceService = new DeviceService();

// Register a new device
router.post('/register', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const deviceData: DeviceRegistrationRequest = req.body;
    
    // Validate required fields
    if (!deviceData.deviceName || !deviceData.deviceType || !deviceData.macAddress) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Validate MAC address format
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(deviceData.macAddress)) {
      res.status(400).json({ error: 'Invalid MAC address format' });
      return;
    }

    // Validate device type
    if (!['mobile', 'tablet', 'laptop'].includes(deviceData.deviceType)) {
      res.status(400).json({ error: 'Invalid device type' });
      return;
    }

    const device = await deviceService.registerDevice(req.user.id, deviceData);
    res.status(201).json(device);
  } catch (error: any) {
    if (error.message.includes('already registered')) {
      res.status(409).json({ error: error.message });
    } else {
      console.error('Device registration error:', error);
      res.status(500).json({ error: 'Failed to register device' });
    }
  }
});

// Get user's devices
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const devices = await deviceService.getUserDevices(req.user.id);
    res.json(devices);
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Get all devices (admin only)
router.get('/all', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const devices = await deviceService.getAllDevices();
    res.json(devices);
  } catch (error) {
    console.error('Get all devices error:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Update device status (approve/reject)
router.patch('/:id/status', authenticateToken, requireRole(['admin', 'manager', 'employee']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, reason } = req.body;
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const device = await deviceService.updateDeviceStatus(
      req.params.id, 
      status, 
      req.user.id,
      reason // Pass rejection reason
    );
    
    res.json(device);
  } catch (error: any) {
    console.error('Device status update error:', error);
    res.status(500).json({ error: 'Failed to update device status' });
  }
});

// Delete device
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await deviceService.deleteDevice(id, req.user.id);
    res.status(204).send();
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Delete device error:', error);
      res.status(500).json({ error: 'Failed to delete device' });
    }
  }
});

export default router;