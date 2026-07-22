import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { systemConfigService } from '../services/systemConfigService';
import { User } from '../types/device';

interface AuthRequest extends Request {
  user?: User;
}

const router = Router();

// Get system configuration (Admin only)
router.get('/config', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const config = await systemConfigService.getSystemConfig();
    res.json(config);
  } catch (error: any) {
    console.error('Error getting system config:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve system configuration' });
  }
});

// Update system configuration (Admin only)
router.put('/config', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const rawUpdates = req.body;
    
    // Transform dot-notation keys to camelCase format
    const updates: any = {};
    
    // Map dot-notation keys to camelCase
    const keyMapping: { [key: string]: string } = {
      'attendance_automation.working_hours_start': 'workingHoursStart',
      'attendance_automation.working_hours_end': 'workingHoursEnd',
      'attendance_automation.grace_period_minutes': 'gracePeriodMinutes',
      'attendance_automation.allow_weekend_checkin': 'allowWeekendCheckIn',
      'attendance_automation.max_checkins_per_day': 'maxCheckInsPerDay',
      'break_policies.max_break_duration_minutes': 'maxBreakDurationMinutes',
      'break_policies.max_breaks_per_day': 'maxBreaksPerDay',
      'break_policies.mandatory_break_duration': 'mandatoryBreakDuration',
      'overtime.overtime_threshold_hours': 'overtimeThresholdHours',
      'overtime.overtime_multiplier': 'overtimeMultiplier',
      'overtime.max_overtime_hours': 'maxOvertimeHours',
      'notifications.email_enabled': 'emailNotificationsEnabled',
      'notifications.sms_enabled': 'smsNotificationsEnabled',
      'notifications.realtime_enabled': 'realTimeNotificationsEnabled',
      'notifications.retry_attempts': 'notificationRetryAttempts',
      'notifications.retry_delay_minutes': 'notificationRetryDelayMinutes'
    };
    
    // Transform the request body
    for (const [key, value] of Object.entries(rawUpdates)) {
      const mappedKey = keyMapping[key] || key; // Use mapped key or original if no mapping exists
      
      // Convert string values to appropriate types
      if (mappedKey.includes('Minutes') || mappedKey.includes('Hours') || mappedKey.includes('Attempts') || mappedKey.includes('PerDay')) {
        updates[mappedKey] = typeof value === 'string' ? parseInt(value) : value;
      } else if (mappedKey.includes('Multiplier')) {
        updates[mappedKey] = typeof value === 'string' ? parseFloat(value) : value;
      } else if (mappedKey.includes('Enabled') || mappedKey.includes('CheckIn')) {
        updates[mappedKey] = typeof value === 'string' ? value === 'true' : value;
      } else {
        updates[mappedKey] = value;
      }
    }
    
    // Validate required fields and formats
    if (updates.workingHoursStart && !/^\d{2}:\d{2}$/.test(updates.workingHoursStart)) {
      return res.status(400).json({ error: 'Invalid working hours start format. Use HH:MM' });
    }
    
    if (updates.workingHoursEnd && !/^\d{2}:\d{2}$/.test(updates.workingHoursEnd)) {
      return res.status(400).json({ error: 'Invalid working hours end format. Use HH:MM' });
    }
    
    if (updates.gracePeriodMinutes && (updates.gracePeriodMinutes < 0 || updates.gracePeriodMinutes > 120)) {
      return res.status(400).json({ error: 'Grace period must be between 0 and 120 minutes' });
    }
    
    if (updates.maxBreakDurationMinutes && (updates.maxBreakDurationMinutes < 15 || updates.maxBreakDurationMinutes > 240)) {
      return res.status(400).json({ error: 'Max break duration must be between 15 and 240 minutes' });
    }
    
    if (updates.overtimeThresholdHours && (updates.overtimeThresholdHours < 6 || updates.overtimeThresholdHours > 12)) {
      return res.status(400).json({ error: 'Overtime threshold must be between 6 and 12 hours' });
    }
    
    await systemConfigService.updateSystemConfig(updates);
    
    const updatedConfig = await systemConfigService.getSystemConfig();
    res.json({ message: 'System configuration updated successfully', config: updatedConfig });
  } catch (error: any) {
    console.error('Error updating system config:', error);
    res.status(500).json({ error: error.message || 'Failed to update system configuration' });
  }
});

// Get offices (Admin only)
router.get('/offices', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const offices = await systemConfigService.getOffices();
    res.json(offices);
  } catch (error: any) {
    console.error('Error getting offices:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve offices' });
  }
});

// Create office (Admin only)
router.post('/offices', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { 
      name, 
      address, 
      timezone, 
      workingHoursStart, 
      workingHoursEnd, 
      isActive,
      latitude,
      longitude,
      geofence_radius_meters,
      geofence_enabled
    } = req.body;
    
    if (!name || !address || !timezone) {
      return res.status(400).json({ error: 'Name, address, and timezone are required' });
    }
    
    if (workingHoursStart && !/^\d{2}:\d{2}(:\d{2})?$/.test(workingHoursStart)) {
      return res.status(400).json({ error: 'Invalid working hours start format. Use HH:MM or HH:MM:SS' });
    }
    
    if (workingHoursEnd && !/^\d{2}:\d{2}(:\d{2})?$/.test(workingHoursEnd)) {
      return res.status(400).json({ error: 'Invalid working hours end format. Use HH:MM or HH:MM:SS' });
    }
    
    const office = await systemConfigService.upsertOffice({
      name,
      address,
      timezone,
      workingHoursStart,
      workingHoursEnd,
      isActive: isActive ?? true,
      latitude,
      longitude,
      geofence_radius_meters,
      geofence_enabled
    });
    
    res.status(201).json(office);
  } catch (error: any) {
    console.error('Error creating office:', error);
    res.status(500).json({ error: error.message || 'Failed to create office' });
  }
});

// Update office (Admin only)
router.put('/offices/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    let { 
      name, 
      address, 
      timezone, 
      workingHoursStart, 
      workingHoursEnd, 
      isActive,
      latitude,
      longitude,
      geofence_radius_meters,
      geofence_enabled
    } = req.body;
    
    // Decode HTML-encoded timezone
    if (timezone) {
      timezone = decodeURIComponent(timezone.replace(/&amp;/g, '&').replace(/#x2F;/g, '/'));
    }
    
    if (!name || !address || !timezone) {
      return res.status(400).json({ error: 'Name, address, and timezone are required' });
    }
    
    if (workingHoursStart && !/^\d{2}:\d{2}(:\d{2})?$/.test(workingHoursStart)) {
      return res.status(400).json({ error: 'Invalid working hours start format. Use HH:MM or HH:MM:SS' });
    }
    
    if (workingHoursEnd && !/^\d{2}:\d{2}(:\d{2})?$/.test(workingHoursEnd)) {
      return res.status(400).json({ error: 'Invalid working hours end format. Use HH:MM or HH:MM:SS' });
    }
    
    const office = await systemConfigService.upsertOffice({
      id,
      name,
      address,
      timezone,
      workingHoursStart,
      workingHoursEnd,
      isActive: isActive ?? true,
      latitude,
      longitude,
      geofence_radius_meters,
      geofence_enabled
    });
    
    res.json(office);
  } catch (error: any) {
    console.error('Error updating office:', error);
    if (error.message === 'Office not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to update office' });
  }
});

// Delete office (Admin only)
router.delete('/offices/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await systemConfigService.deleteOffice(id);
    res.json({ message: 'Office deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting office:', error);
    if (error.message === 'Office not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Cannot delete office')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to delete office' });
  }
});

// Get Wi-Fi networks (Admin only)
router.get('/wifi-networks', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const networks = await systemConfigService.getWifiNetworks();
    res.json(networks);
  } catch (error: any) {
    console.error('Error getting Wi-Fi networks:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve Wi-Fi networks' });
  }
});

// Get Wi-Fi networks for location detection (All authenticated users)
router.get('/wifi-networks/detection', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const networks = await systemConfigService.getWifiNetworks();
    // Return only essential information needed for location detection
    const detectionNetworks = networks.map((network: any) => ({
      id: network.id,
      ssid: network.ssid,
      officeId: network.officeId,  // Use consistent field name
      officeName: network.officeName  // Use consistent field name
    }));
    res.json(detectionNetworks);
  } catch (error: any) {
    console.error('Error getting Wi-Fi networks for detection:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve Wi-Fi networks for detection' });
  }
});

// Create Wi-Fi network (Admin only)
router.post('/wifi-networks', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { ssid, bssid, officeId, description, isActive } = req.body;
    
    if (!ssid || !officeId) {
      return res.status(400).json({ error: 'SSID and office ID are required' });
    }
    
    // Validate BSSID format if provided
    if (bssid && !/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(bssid)) {
      return res.status(400).json({ error: 'Invalid BSSID format. Use XX:XX:XX:XX:XX:XX' });
    }
    
    const network = await systemConfigService.upsertWifiNetwork({
      ssid,
      bssid,
      officeId,
      description,
      isActive: isActive ?? true
    });
    
    res.status(201).json(network);
  } catch (error: any) {
    console.error('Error creating Wi-Fi network:', error);
    res.status(500).json({ error: error.message || 'Failed to create Wi-Fi network' });
  }
});

// Update Wi-Fi network (Admin only)
router.put('/wifi-networks/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { ssid, bssid, officeId, description, isActive } = req.body;
    
    if (!ssid || !officeId) {
      return res.status(400).json({ error: 'SSID and office ID are required' });
    }
    
    // Validate BSSID format if provided
    if (bssid && !/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(bssid)) {
      return res.status(400).json({ error: 'Invalid BSSID format. Use XX:XX:XX:XX:XX:XX' });
    }
    
    const network = await systemConfigService.upsertWifiNetwork({
      id,
      ssid,
      bssid,
      officeId,
      description,
      isActive: isActive ?? true
    });
    
    res.json(network);
  } catch (error: any) {
    console.error('Error updating Wi-Fi network:', error);
    if (error.message === 'Wi-Fi network not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to update Wi-Fi network' });
  }
});

// Delete Wi-Fi network (Admin only)
router.delete('/wifi-networks/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await systemConfigService.deleteWifiNetwork(id);
    res.json({ message: 'Wi-Fi network deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting Wi-Fi network:', error);
    if (error.message === 'Wi-Fi network not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to delete Wi-Fi network' });
  }
});

// Grace Period Configuration Routes
router.get('/grace-periods', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const configs = await systemConfigService.getGracePeriodConfigs();
    res.json(configs);
  } catch (error) {
    console.error('Error fetching grace period configs:', error);
    res.status(500).json({ error: 'Failed to fetch grace period configurations' });
  }
});

router.put('/grace-periods/:officeId', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { officeId } = req.params;
    const updates = req.body;
    
    // Validate input
    if (updates.checkInGrace !== undefined && (updates.checkInGrace < 0 || updates.checkInGrace > 120)) {
      return res.status(400).json({ error: 'Check-in grace period must be between 0 and 120 minutes' });
    }
    if (updates.checkOutGrace !== undefined && (updates.checkOutGrace < 0 || updates.checkOutGrace > 120)) {
      return res.status(400).json({ error: 'Check-out grace period must be between 0 and 120 minutes' });
    }
    if (updates.breakGrace !== undefined && (updates.breakGrace < 0 || updates.breakGrace > 60)) {
      return res.status(400).json({ error: 'Break grace period must be between 0 and 60 minutes' });
    }
    
    const config = await systemConfigService.updateGracePeriodConfig(officeId, updates);
    res.json(config);
  } catch (error) {
    console.error('Error updating grace period config:', error);
    res.status(500).json({ error: 'Failed to update grace period configuration' });
  }
});

// Grace Period Exception Routes
router.get('/grace-period-exceptions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, officeId, isActive } = req.query;
    const filters: any = {};
    
    if (userId) filters.userId = userId as string;
    if (officeId) filters.officeId = officeId as string;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    
    const exceptions = await systemConfigService.getGracePeriodExceptions(filters);
    res.json(exceptions);
  } catch (error) {
    console.error('Error fetching grace period exceptions:', error);
    res.status(500).json({ error: 'Failed to fetch grace period exceptions' });
  }
});

router.post('/grace-period-exceptions', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const exceptionData = {
      ...req.body,
      createdBy: req.user!.id
    };
    
    // Validate required fields
    const required = ['userId', 'type', 'graceType', 'gracePeriod', 'validFrom'];
    for (const field of required) {
      if (!exceptionData[field]) {
        return res.status(400).json({ error: `${field} is required` });
      }
    }
    
    // Validate grace period range
    if (exceptionData.gracePeriod < 0 || exceptionData.gracePeriod > 240) {
      return res.status(400).json({ error: 'Grace period must be between 0 and 240 minutes' });
    }
    
    // Validate temporary exceptions have end date
    if (exceptionData.type === 'temporary' && !exceptionData.validTo) {
      return res.status(400).json({ error: 'Temporary exceptions must have a valid end date' });
    }
    
    const exception = await systemConfigService.createGracePeriodException(exceptionData);
    res.status(201).json(exception);
  } catch (error) {
    console.error('Error creating grace period exception:', error);
    res.status(500).json({ error: 'Failed to create grace period exception' });
  }
});

// Add review endpoint for grace period exceptions
router.put('/grace-period-exceptions/:id/review', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reviewerComments } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be approved or rejected' });
    }
    
    const reviewData = {
      status,
      reviewerComments,
      reviewedBy: req.user!.id,
      reviewedAt: new Date().toISOString(),
      isActive: status === 'approved'
    };
    
    const exception = await systemConfigService.updateGracePeriodException(id, reviewData);
    res.json(exception);
  } catch (error) {
    console.error('Error reviewing grace period exception:', error);
    res.status(500).json({ error: 'Failed to review grace period exception' });
  }
});

router.put('/grace-period-exceptions/:id', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Validate grace period range if provided
    if (updates.gracePeriod !== undefined && (updates.gracePeriod < 0 || updates.gracePeriod > 240)) {
      return res.status(400).json({ error: 'Grace period must be between 0 and 240 minutes' });
    }
    
    const exception = await systemConfigService.updateGracePeriodException(id, updates);
    res.json(exception);
  } catch (error) {
    console.error('Error updating grace period exception:', error);
    res.status(500).json({ error: 'Failed to update grace period exception' });
  }
});

router.delete('/grace-period-exceptions/:id', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await systemConfigService.deleteGracePeriodException(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting grace period exception:', error);
    res.status(500).json({ error: 'Failed to delete grace period exception' });
  }
});

// Get effective grace period for a user
router.get('/grace-periods/effective/:userId/:officeId/:graceType', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, officeId, graceType } = req.params;
    const { date } = req.query;
    
    if (!['check_in', 'check_out', 'break'].includes(graceType)) {
      return res.status(400).json({ error: 'Invalid grace type' });
    }
    
    const effectiveDate = date ? new Date(date as string) : new Date();
    const gracePeriod = await systemConfigService.getEffectiveGracePeriod(
      userId, 
      officeId, 
      graceType as 'check_in' | 'check_out' | 'break', 
      effectiveDate
    );
    
    res.json({ gracePeriod });
  } catch (error) {
    console.error('Error getting effective grace period:', error);
    res.status(500).json({ error: 'Failed to get effective grace period' });
  }
});

// Get break policies (Admin only)
router.get('/break-policies', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const policies = await systemConfigService.getBreakPolicies();
    res.json(policies);
  } catch (error: any) {
    console.error('Error getting break policies:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve break policies' });
  }
});

// Create/Update break policy (Admin only)
router.post('/break-policies', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { officeId, breakType, maxDurationMinutes, maxBreaksPerDay, isMandatory, isActive } = req.body;
    
    if (!breakType || !['lunch', 'short', 'personal'].includes(breakType)) {
      return res.status(400).json({ error: 'Valid break type is required (lunch, short, personal)' });
    }
    
    if (!maxDurationMinutes || maxDurationMinutes < 5 || maxDurationMinutes > 240) {
      return res.status(400).json({ error: 'Max duration must be between 5 and 240 minutes' });
    }
    
    if (!maxBreaksPerDay || maxBreaksPerDay < 1 || maxBreaksPerDay > 10) {
      return res.status(400).json({ error: 'Max breaks per day must be between 1 and 10' });
    }
    
    const policy = await systemConfigService.upsertBreakPolicy({
      officeId: officeId || undefined,
      breakType,
      maxDurationMinutes,
      maxBreaksPerDay,
      isMandatory: isMandatory || false,
      isActive: isActive !== false
    });
    
    res.json({ message: 'Break policy saved successfully', policy });
  } catch (error: any) {
    console.error('Error saving break policy:', error);
    res.status(500).json({ error: error.message || 'Failed to save break policy' });
  }
});

// Update break policy (Admin only)
router.put('/break-policies/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { maxDurationMinutes, maxBreaksPerDay, isMandatory, isActive } = req.body;
    
    if (maxDurationMinutes && (maxDurationMinutes < 5 || maxDurationMinutes > 240)) {
      return res.status(400).json({ error: 'Max duration must be between 5 and 240 minutes' });
    }
    
    if (maxBreaksPerDay && (maxBreaksPerDay < 1 || maxBreaksPerDay > 10)) {
      return res.status(400).json({ error: 'Max breaks per day must be between 1 and 10' });
    }
    
    const policy = await systemConfigService.upsertBreakPolicy({
      id,
      maxDurationMinutes,
      maxBreaksPerDay,
      isMandatory,
      isActive
    } as any);
    
    res.json({ message: 'Break policy updated successfully', policy });
  } catch (error: any) {
    console.error('Error updating break policy:', error);
    res.status(500).json({ error: error.message || 'Failed to update break policy' });
  }
});

// Delete break policy (Admin only)
router.delete('/break-policies/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await systemConfigService.deleteBreakPolicy(id);
    res.json({ message: 'Break policy deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting break policy:', error);
    res.status(500).json({ error: error.message || 'Failed to delete break policy' });
  }
});

export default router;
