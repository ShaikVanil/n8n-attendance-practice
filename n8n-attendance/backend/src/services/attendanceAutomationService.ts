import pool from '../config/database';
import { wifiDetectionService } from './wifiDetectionService';
import { DeviceConnectionEvent } from './wifiDetectionService';
import { notificationService } from './notificationService';
import { manualOverrideService } from './manualOverrideService';
import { leaveManagementService } from './leaveManagementService';

interface AutoCheckInConfig {
  workingHoursStart: string; // HH:MM format
  workingHoursEnd: string;   // HH:MM format
  gracePeriodMinutes: number;
  allowWeekendCheckIn: boolean;
  maxCheckInsPerDay: number;
}

interface CheckInValidationResult {
  isValid: boolean;
  reason?: string;
  shouldNotify: boolean;
}

export class AttendanceAutomationService {
  private config: AutoCheckInConfig;
  private isInitialized: boolean = false;

  constructor() {
    this.config = {
      workingHoursStart: '08:00',
      workingHoursEnd: '18:00',
      gracePeriodMinutes: 30,
      allowWeekendCheckIn: false,
      maxCheckInsPerDay: 1
    };
  }

  /**
   * Initialize the service and set up event listeners
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Attendance automation service already initialized');
      return;
    }

    // Load configuration from database
    await this.loadConfiguration();

    // Set up event listeners for Wi-Fi detection
    wifiDetectionService.on('device-connected', this.handleDeviceConnection.bind(this));
    wifiDetectionService.on('device-disconnected', this.handleDeviceDisconnection.bind(this));

    this.isInitialized = true;
    console.log('Attendance automation service initialized successfully');
  }

  /**
   * Handle device connection events
   */
  /**
   * Handle device connection events with fallback logic
   */
  private async handleDeviceConnection(event: DeviceConnectionEvent): Promise<void> {
    try {
      console.log(`Processing device connection for user ${event.userId}, device ${event.deviceId}`);
  
      // Validate if automatic check-in should be triggered
      const validation = await this.validateAutoCheckIn(event);
      
      if (!validation.isValid) {
        console.log(`Auto check-in validation failed: ${validation.reason}`);
  
        // Trigger fallback logic for validation failures
        await this.handleAutoCheckInFailure(event, validation.reason!, 'validation_failed');
  
        if (validation.shouldNotify) {
          await this.sendValidationNotification(event, validation.reason!);
        }
        return;
      }
  
      // Perform automatic check-in
      const attendance = await this.performAutoCheckIn(event);
  
      if (attendance) {
        console.log(`Automatic check-in successful for user ${event.userId}`);
        // Emit event for notification service
        this.emitCheckInNotification(event, attendance);
      } else {
        // Handle case where performAutoCheckIn returns null/undefined
        await this.handleAutoCheckInFailure(event, 'Check-in operation failed', 'operation_failed');
      }
  
    } catch (error) {
      console.error('Error handling device connection:', error);
  
      // Enhanced error handling with fallback logic
      await this.handleAutoCheckInFailure(event, (error as Error).message, 'system_error');
  
      // Log error to database for monitoring
      await this.logAutomationError(event, error as Error);
    }
  }

  /**
   * Handle automatic check-in failures with fallback mechanisms
   */
  private async handleAutoCheckInFailure(
    event: DeviceConnectionEvent, 
    failureReason: string, 
    failureType: 'validation_failed' | 'operation_failed' | 'system_error'
  ): Promise<void> {
    try {
      // Log the failure for admin monitoring
      await pool.query(
        `INSERT INTO automation_logs (user_id, device_id, action_type, details, timestamp)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          event.userId,
          event.deviceId,
          'auto_checkin_failed',
          JSON.stringify({ 
            reason: failureReason, 
            failureType,
            networkId: event.networkId,
            fallbackTriggered: true
          }),
          new Date()
        ]
      );
  
      // Send fallback notification to user with manual override option
      await this.sendFallbackNotification(event, failureReason, failureType);
  
      // For critical failures during working hours, create a pending manual override request
      if (failureType === 'system_error' && await this.isWithinWorkingHours()) {
        await this.createPendingOverrideRequest(event, failureReason);
      }
      
    } catch (fallbackError) {
      console.error('Error in fallback handling:', fallbackError);
      // Last resort: log to console and continue
    }
  }

  /**
   * Send fallback notification with manual override instructions
   */
  private async sendFallbackNotification(
    event: DeviceConnectionEvent, 
    failureReason: string, 
    failureType: string
  ): Promise<void> {
    try {
      const deviceName = event.deviceName || 'Unknown Device';
      const officeName = event.officeName || 'Office';
  
      await notificationService.sendNotification({
        userId: event.userId,
        type: 'auto_checkin_failed_with_fallback',
        title: 'Auto Check-in Failed - Manual Action Required',
        message: `Auto check-in failed at ${deviceName}. Please use manual check-in or contact your administrator.`,
        data: {
          timestamp: new Date().toLocaleString(),
          deviceName,
          officeName,
          failureReason,
          failureType,
          fallbackInstructions: 'Please use manual check-in or contact your administrator if the issue persists.',
          manualOverrideUrl: `${process.env.FRONTEND_URL}/manual-checkin`
        },
        channels: ['email', 'sms', 'realtime'],
        priority: 'high'
      });
    } catch (error) {
      console.error('Error sending fallback notification:', error);
    }
  }

  /**
   * Create a pending manual override request for system errors
   */
  private async createPendingOverrideRequest(
    event: DeviceConnectionEvent, 
    failureReason: string
  ): Promise<void> {
    try {
      // Check if user already has a pending request today
      const today = new Date().toISOString().split('T')[0];
      const existingRequest = await pool.query(
        'SELECT id FROM pending_override_requests WHERE user_id = $1 AND date = $2 AND status = $3',
        [event.userId, today, 'pending']
      );
  
      if (existingRequest.rows.length === 0) {
        await pool.query(
          `INSERT INTO pending_override_requests 
           (user_id, device_id, failure_reason, network_id, date, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            event.userId,
            event.deviceId,
            failureReason,
            event.networkId,
            today,
            'pending',
            new Date()
          ]
        );
  
        // Notify admins about the pending request
        await this.notifyAdminsOfPendingRequest(event, failureReason);
      }
    } catch (error) {
      console.error('Error creating pending override request:', error);
    }
  }

  /**
   * Check if current time is within working hours
   */
  private async isWithinWorkingHours(): Promise<boolean> {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const dayOfWeek = now.getDay();
  
    // Skip weekends if not allowed
    if (!this.config.allowWeekendCheckIn && (dayOfWeek === 0 || dayOfWeek === 6)) {
      return false;
    }
    
    return currentTime >= this.config.workingHoursStart && currentTime <= this.config.workingHoursEnd;
  }

  /**
   * Notify admins of pending override requests
   */
  private async notifyAdminsOfPendingRequest(
    event: DeviceConnectionEvent, 
    failureReason: string
  ): Promise<void> {
    try {
      // Get user details
      const userResult = await pool.query(
        'SELECT first_name, last_name, email FROM users WHERE id = $1',
        [event.userId]
      );
  
      if (userResult.rows.length === 0) return;
  
      const user = userResult.rows[0];
  
      // Get all admin users
      const adminsResult = await pool.query(
        "SELECT id FROM users WHERE role = 'admin' AND is_active = true"
      );
  
      // Send notification to each admin
      for (const admin of adminsResult.rows) {
        await notificationService.sendNotification({
          userId: admin.id,
          type: 'pending_override_request',
          title: 'Pending Override Request',
          message: `${user.first_name} ${user.last_name} requires manual override approval for check-in.`,
          data: {
            employeeName: `${user.first_name} ${user.last_name}`,
            employeeEmail: user.email,
            failureReason,
            deviceName: event.deviceName || 'Unknown Device',
            officeName: event.officeName || 'Office',
            timestamp: new Date().toLocaleString()
          },
          channels: ['email', 'realtime'],
          priority: 'high'
        });
      }
    } catch (error) {
      console.error('Error notifying admins of pending request:', error);
    }
  }

  /**
   * Handle device disconnection events (for future auto check-out)
   */
  private async handleDeviceDisconnection(event: DeviceConnectionEvent): Promise<void> {
    try {
      console.log(`Processing device disconnection for user ${event.userId}, device ${event.deviceId}`);
      // Future implementation for automatic check-out logic
      // This would be part of US-002.5 (Automatic Check-out Logic)
    } catch (error) {
      console.error('Error handling device disconnection:', error);
    }
  }

  /**
   * Validate if automatic check-in should be triggered
   */
  private async validateAutoCheckIn(event: DeviceConnectionEvent): Promise<CheckInValidationResult> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const todayDate = new Date(today);

    // Check if user has approved leave today
    const leaveCheck = await leaveManagementService.hasApprovedLeaveOnDate(event.userId, todayDate);
    if (leaveCheck.hasLeave) {
      return {
        isValid: false,
        reason: `Cannot auto check-in during approved ${leaveCheck.leaveType?.name} leave period`,
        shouldNotify: false
      };
    }

    // Check if it's weekend and weekend check-in is not allowed
    if (!this.config.allowWeekendCheckIn && (dayOfWeek === 0 || dayOfWeek === 6)) {
      return {
        isValid: false,
        reason: 'Weekend check-in not allowed',
        shouldNotify: false
      };
    }

    // Check working hours with grace period
    const startTime = this.subtractMinutes(this.config.workingHoursStart, this.config.gracePeriodMinutes);
    const endTime = this.addMinutes(this.config.workingHoursEnd, this.config.gracePeriodMinutes);
    
    if (currentTime < startTime || currentTime > endTime) {
      return {
        isValid: false,
        reason: `Check-in outside working hours (${this.config.workingHoursStart} - ${this.config.workingHoursEnd})`,
        shouldNotify: true
      };
    }

    // Check if user already checked in today
    const existingCheckIn = await pool.query(
      'SELECT id FROM attendance WHERE user_id = $1 AND date = $2 AND status = $3',
      [event.userId, today, 'active']
    );

    if (existingCheckIn.rows.length > 0) {
      return {
        isValid: false,
        reason: 'Already checked in today',
        shouldNotify: false
      };
    }

    // Check daily check-in limit
    const todayCheckIns = await pool.query(
      'SELECT COUNT(*) as count FROM attendance WHERE user_id = $1 AND date = $2',
      [event.userId, today]
    );

    if (parseInt(todayCheckIns.rows[0].count) >= this.config.maxCheckInsPerDay) {
      return {
        isValid: false,
        reason: 'Maximum check-ins per day exceeded',
        shouldNotify: true
      };
    }

    // Verify device is still approved
    const device = await pool.query(
      'SELECT status FROM devices WHERE id = $1 AND user_id = $2',
      [event.deviceId, event.userId]
    );

    if (device.rows.length === 0 || device.rows[0].status !== 'approved') {
      return {
        isValid: false,
        reason: 'Device not approved for automatic check-in',
        shouldNotify: true
      };
    }

    return {
      isValid: true,
      shouldNotify: false
    };
  }

  /**
   * Perform automatic check-in
   */
  private async performAutoCheckIn(event: DeviceConnectionEvent): Promise<any> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    try {
      // Get office location from Wi-Fi network
      const networkInfo = await pool.query(
        'SELECT w.ssid, o.name as office_name, o.address FROM wifi_networks w JOIN offices o ON w.office_id = o.id WHERE w.id = $1',
        [event.networkId]
      );

      const location = networkInfo.rows.length > 0 
        ? `${networkInfo.rows[0].office_name} (${networkInfo.rows[0].ssid})`
        : 'Office Wi-Fi';

      // Create attendance record
      const result = await pool.query(
        `INSERT INTO attendance (user_id, device_id, check_in_time, check_in_type, check_in_location, date, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          event.userId,
          event.deviceId,
          now,
          'automatic',
          location,
          today,
          'active',
          `Auto check-in via Wi-Fi detection (${event.macAddress})`
        ]
      );

      // Log the automatic check-in event
      await pool.query(
        `INSERT INTO automation_logs (user_id, device_id, action_type, details, timestamp)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          event.userId,
          event.deviceId,
          'auto_checkin',
          JSON.stringify({
            networkId: event.networkId,
            macAddress: event.macAddress,
            signalStrength: event.signalStrength,
            attendanceId: result.rows[0].id
          }),
          now
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error performing automatic check-in:', error);
      throw error;
    }
  }

  /**
   * Load configuration from database
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const result = await pool.query(
        'SELECT key, value FROM system_config WHERE category = $1',
        ['attendance_automation']
      );

      result.rows.forEach(row => {
        switch (row.key) {
          case 'working_hours_start':
            this.config.workingHoursStart = row.value;
            break;
          case 'working_hours_end':
            this.config.workingHoursEnd = row.value;
            break;
          case 'grace_period_minutes':
            this.config.gracePeriodMinutes = parseInt(row.value);
            break;
          case 'allow_weekend_checkin':
            this.config.allowWeekendCheckIn = row.value === 'true';
            break;
          case 'max_checkins_per_day':
            this.config.maxCheckInsPerDay = parseInt(row.value);
            break;
        }
      });

      console.log('Attendance automation configuration loaded:', this.config);
    } catch (error) {
      console.warn('Could not load configuration from database, using defaults:', error);
    }
  }

  /**
   * Emit check-in notification event
   */
  private async emitCheckInNotification(event: DeviceConnectionEvent, attendance: any): Promise<void> {
    // Use deviceName and officeName from the event object (already populated by wifiDetectionService)
    const deviceName = event.deviceName || 'Unknown Device';
    const officeName = event.officeName || 'Office';
    
      notificationService.sendNotification({
        userId: event.userId,
        type: 'auto_checkin_success',
        title: 'Auto Check-in Successful',
        message: `Auto check-in successful at ${deviceName}`,
        data: {
          timestamp: new Date().toLocaleString(),
          deviceName,
          officeName,
          checkInTime: attendance.check_in_time,
          attendanceId: attendance.id
        },
        channels: ['email', 'sms', 'realtime'],
        priority: 'medium'
      }).catch((error: Error) => {
        console.error('Error sending check-in notification:', error);
      });
  }

  /**
   * Send validation failure notification
   */
  private async sendValidationNotification(event: DeviceConnectionEvent, reason: string): Promise<void> {
    // Log validation failure for potential notification
    await pool.query(
      `INSERT INTO automation_logs (user_id, device_id, action_type, details, timestamp)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        event.userId,
        event.deviceId,
        'auto_checkin_failed',
        JSON.stringify({ reason, networkId: event.networkId }),
        new Date()
      ]
    );

    // Send notification about the failure
    const { notificationService } = require('./notificationService');
    
    notificationService.sendNotification({
      userId: event.userId,
      type: 'auto_checkin_failed',
      title: 'Auto Check-in Failed',
      message: `Auto check-in failed at ${event.deviceName || 'Unknown Device'}: ${reason}`,
      data: {
        reason,
        timestamp: new Date().toLocaleString(),
        deviceName: event.deviceName || 'Unknown Device',
        officeName: event.officeName || 'Office'
      },
      channels: ['email', 'sms', 'realtime'],
      priority: 'high'
    }).catch((error: Error) => {
      console.error('Error sending validation failure notification:', error);
    });
  }

  /**
   * Log automation errors
   */
  private async logAutomationError(event: DeviceConnectionEvent, error: Error): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO automation_logs (user_id, device_id, action_type, details, timestamp)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          event.userId,
          event.deviceId,
          'auto_checkin_error',
          JSON.stringify({ 
            error: error.message, 
            stack: error.stack,
            networkId: event.networkId 
          }),
          new Date()
        ]
      );
    } catch (logError) {
      console.error('Failed to log automation error:', logError);
    }
  }

  /**
   * Utility function to add minutes to time string
   */
  private addMinutes(timeStr: string, minutes: number): string {
    const [hours, mins] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }

  /**
   * Utility function to subtract minutes from time string
   */
  private subtractMinutes(timeStr: string, minutes: number): string {
    const [hours, mins] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + mins - minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${Math.max(0, newHours).toString().padStart(2, '0')}:${Math.max(0, newMins).toString().padStart(2, '0')}`;
  }

  /**
   * Update configuration
   */
  async updateConfiguration(newConfig: Partial<AutoCheckInConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Save to database
    for (const [key, value] of Object.entries(newConfig)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      await pool.query(
        `INSERT INTO system_config (category, key, value) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (category, key) 
         DO UPDATE SET value = $3, updated_at = NOW()`,
        ['attendance_automation', dbKey, value.toString()]
      );
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration(): AutoCheckInConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const attendanceAutomationService = new AttendanceAutomationService();