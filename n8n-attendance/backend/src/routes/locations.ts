import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { authenticateToken, requireRole } from '../middleware/auth';
import { User } from '../types/device';
import { locationValidationService } from '../services/locationValidationService';

interface AuthRequest extends Request {
  user?: User;
}

const router = Router();

// Get all office locations
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        name,
        address,
        wifi_networks as "wifiNetworks",
        timezone,
        working_hours_start as "workingHoursStart",
        working_hours_end as "workingHoursEnd",
        grace_period_minutes as "gracePeriodMinutes",
        max_break_minutes as "maxBreakMinutes",
        overtime_threshold_hours as "overtimeThreshold",
        latitude,
        longitude,
        geofence_radius_meters as "geofenceRadiusMeters",
        geofence_enabled as "geofenceEnabled",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM office_locations 
      WHERE is_active = true
      ORDER BY name
    `);

    const locations = result.rows.map(row => ({
      ...row,
      workingHours: {
        start: row.workingHoursStart,
        end: row.workingHoursEnd
      },
      policies: {
        gracePeriodMinutes: row.gracePeriodMinutes,
        maxBreakMinutes: row.maxBreakMinutes,
        overtimeThreshold: row.overtimeThreshold
      }
    }));

    res.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// MOVE ALL SPECIFIC ROUTES BEFORE /:id

// Post detect route
router.post('/detect', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { wifiNetwork, coordinates } = req.body;
    const userId = req.user!.id;
    
    let detectedLocation = null;
    let confidence = 0;
    let detectionMethod: 'wifi' | 'gps' | 'manual' = 'manual';

    // Try WiFi detection first
    if (wifiNetwork) {
      const wifiResult = await pool.query(`
        SELECT id, name, address, wifi_networks
        FROM office_locations 
        WHERE $1 = ANY(wifi_networks) AND is_active = true
      `, [wifiNetwork]);

      if (wifiResult.rows.length > 0) {
        detectedLocation = wifiResult.rows[0];
        confidence = 0.95;
        detectionMethod = 'wifi';
      }
    }

    // TODO: Implement GPS-based detection if coordinates provided
    // This would require calculating distance to office locations

    // Record detection attempt
    await pool.query(`
      INSERT INTO location_detections (user_id, detected_location_id, confidence, detection_method, wifi_network, coordinates)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, detectedLocation?.id || null, confidence, detectionMethod, wifiNetwork || null, coordinates || null]);

    res.json({
      detectedLocation,
      confidence,
      detectionMethod,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error detecting location:', error);
    res.status(500).json({ error: 'Failed to detect location' });
  }
});

// Get user's current assigned location
router.get('/current', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await pool.query(`
      SELECT 
        ol.id,
        ol.name,
        ol.address,
        ol.wifi_networks as "wifiNetworks",
        ol.timezone,
        ol.working_hours_start as "workingHoursStart",
        ol.working_hours_end as "workingHoursEnd",
        ol.grace_period_minutes as "gracePeriodMinutes",
        ol.max_break_minutes as "maxBreakMinutes",
        ol.overtime_threshold_hours as "overtimeThreshold",
        ol.is_active as "isActive",
        ol.created_at as "createdAt",
        ol.updated_at as "updatedAt"
      FROM users u
      LEFT JOIN office_locations ol ON u.current_location_id = ol.id
      WHERE u.id = $1 AND ol.is_active = true
    `, [userId]);

    if (result.rows.length === 0 || !result.rows[0].id) {
      return res.json(null);
    }

    const location = {
      ...result.rows[0],
      workingHours: {
        start: result.rows[0].workingHoursStart,
        end: result.rows[0].workingHoursEnd
      },
      policies: {
        gracePeriodMinutes: result.rows[0].gracePeriodMinutes,
        maxBreakMinutes: result.rows[0].maxBreakMinutes,
        overtimeThreshold: result.rows[0].overtimeThreshold
      }
    };

    res.json(location);
  } catch (error) {
    console.error('Error fetching current location:', error);
    res.status(500).json({ error: 'Failed to fetch current location' });
  }
});

// Get offices with distances and authorization for location selection
router.get('/with-distances', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { latitude, longitude } = req.query;
    const userId = req.user!.id;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const userCoordinates = {
      latitude: lat,
      longitude: lng,
    };
    // Get offices with distances using the existing service
    const officesWithDistances = await locationValidationService.getOfficesWithDistances(userCoordinates);

    // Check user authorization for each office
    const userResult = await pool.query(
      'SELECT current_location_id, role FROM users WHERE id = $1',
      [userId]
    );

    const userCurrentLocationId = userResult.rows[0]?.current_location_id;
    const userRole = userResult.rows[0]?.role;

    // Add authorization info to each office
    const authorizedOffices = officesWithDistances.map(office => {
      let isAuthorized = false;
      let authorizationReason = '';

      // User is always authorized for their current assigned location
      if (office.id === userCurrentLocationId) {
        isAuthorized = true;
        authorizationReason = 'Current assigned location';
      }
      // Admins and managers can access any location
      else if (['admin', 'manager'].includes(userRole)) {
        isAuthorized = true;
        authorizationReason = 'Administrative access';
      }
      // Regular users need approval for other locations
      else {
        isAuthorized = false;
        authorizationReason = 'Requires location transfer approval';
      }

      return {
        ...office,
        isAuthorized,
        authorizationReason,
        isCurrentLocation: office.id === userCurrentLocationId
      };
    });

    res.json(authorizedOffices);
  } catch (error) {
    console.error('Error fetching offices with distances:', error);
    res.status(500).json({ error: 'Failed to fetch offices with distances' });
  }
});

// Request location transfer
router.post('/transfer-request', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { toLocationId, reason, isTemporary, temporaryEndDate } = req.body;
    const userId = req.user!.id;

    // Get user's current location
    const userResult = await pool.query(
      'SELECT current_location_id FROM users WHERE id = $1',
      [userId]
    );

    const fromLocationId = userResult.rows[0]?.current_location_id;

    // Validate target location exists
    const locationResult = await pool.query(
      'SELECT id FROM office_locations WHERE id = $1 AND is_active = true',
      [toLocationId]
    );

    if (locationResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid target location' });
    }

    // Check for pending transfers
    const pendingResult = await pool.query(
      'SELECT id FROM location_transfers WHERE user_id = $1 AND status = $2',
      [userId, 'pending']
    );

    if (pendingResult.rows.length > 0) {
      return res.status(400).json({ error: 'You already have a pending location transfer request' });
    }

    // Create transfer request
    const transferResult = await pool.query(`
      INSERT INTO location_transfers (
        user_id, from_location_id, to_location_id, transfer_date, reason, 
        status, is_temporary, temporary_end_date
      )
      VALUES ($1, $2, $3, CURRENT_DATE, $4, 'pending', $5, $6)
      RETURNING *
    `, [userId, fromLocationId, toLocationId, reason, isTemporary, temporaryEndDate]);

    res.status(201).json(transferResult.rows[0]);
  } catch (error) {
    console.error('Error creating transfer request:', error);
    res.status(500).json({ error: 'Failed to create transfer request' });
  }
});

// Move these routes BEFORE the /:id route (around line 56)

// Get user's location transfer history
router.get('/transfers', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await pool.query(`
      SELECT 
        lt.*,
        fl.name as from_location_name,
        tl.name as to_location_name,
        CONCAT(u.first_name, ' ', u.last_name) as approved_by_name
      FROM location_transfers lt
      LEFT JOIN office_locations fl ON lt.from_location_id = fl.id
      LEFT JOIN office_locations tl ON lt.to_location_id = tl.id
      LEFT JOIN users u ON lt.approved_by = u.id
      WHERE lt.user_id = $1
      ORDER BY lt.created_at DESC
    `, [userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching transfer history:', error);
    res.status(500).json({ error: 'Failed to fetch transfer history' });
  }
});

// Get pending location transfer requests (for managers)
router.get('/transfers/pending', authenticateToken, requireRole(['manager', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        lt.*,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.email as user_email,
        fl.name as from_location_name,
        tl.name as to_location_name
      FROM location_transfers lt
      JOIN users u ON lt.user_id = u.id
      LEFT JOIN office_locations fl ON lt.from_location_id = fl.id
      JOIN office_locations tl ON lt.to_location_id = tl.id
      WHERE lt.status = 'pending'
      ORDER BY lt.created_at ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending transfers:', error);
    res.status(500).json({ error: 'Failed to fetch pending transfers' });
  }
});

// Approve/reject location transfer (for managers)
router.put('/transfers/:id/review', authenticateToken, requireRole(['manager', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action, comments } = req.body;
    const approverId = req.user!.id;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be approve or reject' });
    }

    // Get transfer details
    const transferResult = await pool.query(
      'SELECT * FROM location_transfers WHERE id = $1 AND status = $2',
      [id, 'pending']
    );

    if (transferResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transfer request not found or already processed' });
    }

    const transfer = transferResult.rows[0];
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update transfer status
    await pool.query(`
      UPDATE location_transfers 
      SET status = $1, approved_by = $2, approved_at = NOW(), comments = $3
      WHERE id = $4
    `, [newStatus, approverId, comments, id]);

    // If approved, update user's location
    if (action === 'approve') {
      await pool.query(
        'UPDATE users SET current_location_id = $1 WHERE id = $2',
        [transfer.to_location_id, transfer.user_id]
      );
    }

    // Get updated transfer with location names
    const updatedResult = await pool.query(`
      SELECT 
        lt.*,
        fl.name as from_location_name,
        tl.name as to_location_name,
        u.name as approved_by_name
      FROM location_transfers lt
      LEFT JOIN office_locations fl ON lt.from_location_id = fl.id
      LEFT JOIN office_locations tl ON lt.to_location_id = tl.id
      LEFT JOIN users u ON lt.approved_by = u.id
      WHERE lt.id = $1
    `, [id]);

    res.json(updatedResult.rows[0]);
  } catch (error) {
    console.error('Error reviewing transfer:', error);
    res.status(500).json({ error: 'Failed to review transfer' });
  }
});

// Manual location override for attendance
router.post('/manual-override', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { locationId, reason } = req.body;
    const userId = req.user!.id;

    // Validate location exists
    const locationResult = await pool.query(
      'SELECT id FROM office_locations WHERE id = $1 AND is_active = true',
      [locationId]
    );

    if (locationResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid location' });
    }

    // Record the manual override
    await pool.query(`
      INSERT INTO location_detections (user_id, detected_location_id, confidence, detection_method, manual_reason)
      VALUES ($1, $2, 1.0, 'manual', $3)
    `, [userId, locationId, reason]);

    res.json({ message: 'Manual location override recorded successfully' });
  } catch (error) {
    console.error('Error recording manual override:', error);
    res.status(500).json({ error: 'Failed to record manual override' });
  }
});

// Get location-specific policies
router.get('/:id/policies', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        grace_period_minutes as "gracePeriodMinutes",
        max_break_minutes as "maxBreakMinutes",
        overtime_threshold_hours as "overtimeThreshold"
      FROM office_locations 
      WHERE id = $1 AND is_active = true
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching location policies:', error);
    res.status(500).json({ error: 'Failed to fetch location policies' });
  }
});

// Admin: Create new office location
router.post('/admin/locations', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      address,
      wifiNetworks,
      timezone,
      workingHours,
      policies,
      isActive = true
    } = req.body;

    const result = await pool.query(`
      INSERT INTO office_locations (
        name, address, wifi_networks, timezone, 
        working_hours_start, working_hours_end,
        grace_period_minutes, max_break_minutes, overtime_threshold_hours,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      name,
      address,
      wifiNetworks,
      timezone,
      workingHours.start,
      workingHours.end,
      policies.gracePeriodMinutes,
      policies.maxBreakMinutes,
      policies.overtimeThreshold,
      isActive
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

// Admin: Update office location
router.put('/admin/locations/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const setClause = [];
    const values = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      setClause.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.address !== undefined) {
      setClause.push(`address = $${paramCount++}`);
      values.push(updates.address);
    }
    if (updates.wifiNetworks !== undefined) {
      setClause.push(`wifi_networks = $${paramCount++}`);
      values.push(updates.wifiNetworks);
    }
    if (updates.timezone !== undefined) {
      setClause.push(`timezone = $${paramCount++}`);
      values.push(updates.timezone);
    }
    if (updates.workingHours?.start !== undefined) {
      setClause.push(`working_hours_start = $${paramCount++}`);
      values.push(updates.workingHours.start);
    }
    if (updates.workingHours?.end !== undefined) {
      setClause.push(`working_hours_end = $${paramCount++}`);
      values.push(updates.workingHours.end);
    }
    if (updates.policies?.gracePeriodMinutes !== undefined) {
      setClause.push(`grace_period_minutes = $${paramCount++}`);
      values.push(updates.policies.gracePeriodMinutes);
    }
    if (updates.policies?.maxBreakMinutes !== undefined) {
      setClause.push(`max_break_minutes = $${paramCount++}`);
      values.push(updates.policies.maxBreakMinutes);
    }
    if (updates.policies?.overtimeThreshold !== undefined) {
      setClause.push(`overtime_threshold_hours = $${paramCount++}`);
      values.push(updates.policies.overtimeThreshold);
    }
    if (updates.isActive !== undefined) {
      setClause.push(`is_active = $${paramCount++}`);
      values.push(updates.isActive);
    }

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    setClause.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE office_locations 
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Admin: Delete office location
router.delete('/admin/locations/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Soft delete by setting is_active to false
    const result = await pool.query(
      'UPDATE office_locations SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

// Add location validation endpoint
router.post('/validate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { latitude, longitude, officeId } = req.body;
    const userId = req.user!.id;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'GPS coordinates are required' });
    }

    const validationResult = await locationValidationService.validateUserLocation(
      { latitude, longitude },
      officeId
    );

    // Log the validation attempt
    await locationValidationService.logLocationDetection(
      userId,
      { latitude, longitude },
      validationResult.office?.id || null,
      validationResult.distance
    );

    res.json(validationResult);
  } catch (error) {
    console.error('Location validation error:', error);
    res.status(500).json({ error: 'Failed to validate location' });
  }
});

export default router;