import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateToken } from '../middleware/auth';
import { wifiDetectionService } from '../services/wifiDetectionService';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Get Wi-Fi networks (Admin only)
router.get('/networks', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await pool.query(
      'SELECT * FROM wifi_networks ORDER BY created_at DESC'
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching Wi-Fi networks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add Wi-Fi network (Admin only)
router.post('/networks', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { ssid, bssid, office_id, description } = req.body;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Validate required fields
    if (!ssid) {
      return res.status(400).json({ error: 'SSID is required' });
    }

    const result = await pool.query(
      `INSERT INTO wifi_networks (id, ssid, bssid, office_id, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [uuidv4(), ssid, bssid || null, office_id || null, description || null]
    );

    res.status(201).json({
      message: 'Wi-Fi network added successfully',
      network: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding Wi-Fi network:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Wi-Fi network (Admin only)
router.put('/networks/:id', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { ssid, bssid, office_id, description, is_active } = req.body;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await pool.query(
      `UPDATE wifi_networks 
       SET ssid = COALESCE($1, ssid),
           bssid = COALESCE($2, bssid),
           office_id = COALESCE($3, office_id),
           description = COALESCE($4, description),
           is_active = COALESCE($5, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [ssid, bssid, office_id, description, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wi-Fi network not found' });
    }

    res.json({
      message: 'Wi-Fi network updated successfully',
      network: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating Wi-Fi network:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete Wi-Fi network (Admin only)
router.delete('/networks/:id', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await pool.query(
      'DELETE FROM wifi_networks WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wi-Fi network not found' });
    }

    res.json({ message: 'Wi-Fi network deleted successfully' });
  } catch (error) {
    console.error('Error deleting Wi-Fi network:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get device connection history
router.get('/connections/:deviceId', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { deviceId } = req.params;
    const { limit = 50 } = req.query;
    
    // Check if user owns the device or is admin
    const device = await pool.query(
      'SELECT user_id FROM devices WHERE id = $1',
      [deviceId]
    );
    
    if (device.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    if (device.rows[0].user_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const history = await wifiDetectionService.getDeviceConnectionHistory(
      deviceId, 
      parseInt(limit as string)
    );

    res.json(history);
  } catch (error) {
    console.error('Error fetching connection history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get currently connected devices (Admin only)
router.get('/connected-devices', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const connectedDevices = wifiDetectionService.getConnectedDevices();
    res.json(connectedDevices);
  } catch (error) {
    console.error('Error fetching connected devices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start/Stop Wi-Fi monitoring (Admin only)
router.post('/monitoring/:action', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { action } = req.params;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (action === 'start') {
      await wifiDetectionService.startMonitoring();
      res.json({ message: 'Wi-Fi monitoring started' });
    } else if (action === 'stop') {
      wifiDetectionService.stopMonitoring();
      res.json({ message: 'Wi-Fi monitoring stopped' });
    } else {
      res.status(400).json({ error: 'Invalid action. Use "start" or "stop"' });
    }
  } catch (error) {
    console.error('Error controlling Wi-Fi monitoring:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add this route to handle WiFi detection
router.post('/detect', async (req, res) => {
  try {
    const { userLocation } = req.body;
    
    // Get all office WiFi networks
    const networksResult = await pool.query(
      'SELECT * FROM wifi_networks WHERE is_active = true'
    );
    
    // Simple WiFi detection response
    res.json({
      success: true,
      data: {
        isConnected: true,
        availableNetworks: [],
        detectionMethod: 'fallback',
        timestamp: new Date().toISOString(),
        currentNetwork: null,
        matchedOffice: null
      }
    });
  } catch (error) {
    console.error('Error in WiFi detection:', error);
    res.status(500).json({ error: 'WiFi detection failed' });
  }
});

export default router;