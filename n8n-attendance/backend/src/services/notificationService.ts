import { EventEmitter } from 'events';
import pool from '../config/database';
import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import { Server as SocketIOServer } from 'socket.io';
import { 
  NotificationRequest, 
  NotificationPreferences, 
  NotificationTemplate, 
  NotificationHistory,
  EmailConfig,
  SMSConfig 
} from '../types/notification';

export class NotificationService extends EventEmitter {
  private emailConfig: EmailConfig | null = null;
  private smsConfig: SMSConfig | null = null;
  private twilioClient: any = null;
  private io: SocketIOServer | null = null;
  private isInitialized: boolean = false;

  constructor() {
    super();
  }

  /**
   * Initialize the notification service with Socket.IO server
   */
  async initialize(io?: SocketIOServer): Promise<void> {
    if (this.isInitialized) {
      console.log('Notification service already initialized');
      return;
    }

    if (io) {
      this.io = io;
      this.setupSocketHandlers();
    }

    await this.loadConfiguration();
    this.initializeProviders();
    this.isInitialized = true;
    console.log('Notification service initialized successfully');
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupSocketHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);
      
      // Join user to their personal room for targeted notifications
      socket.on('join-user-room', (userId: string) => {
        socket.join(`user-${userId}`);
        console.log(`User ${userId} joined their notification room`);
      });

      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Initialize email and SMS providers
   */
  private initializeProviders(): void {
    // Initialize SendGrid
    if (this.emailConfig?.apiKey) {
      sgMail.setApiKey(this.emailConfig.apiKey);
      console.log('SendGrid initialized successfully');
    } else {
      console.warn('SendGrid API key not configured');
    }

    // Initialize Twilio
    if (this.smsConfig?.accountSid && this.smsConfig?.authToken) {
      this.twilioClient = twilio(this.smsConfig.accountSid, this.smsConfig.authToken);
      console.log('Twilio initialized successfully');
    } else {
      console.warn('Twilio credentials not configured');
    }
  }

  /**
   * Load notification configuration from database
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const result = await pool.query('SELECT * FROM notification_config LIMIT 1');
      
      if (result.rows.length > 0) {
        const config = result.rows[0];
        
        this.emailConfig = {
          provider: config.email_provider || 'sendgrid',
          apiKey: config.email_api_key,
          fromEmail: config.email_from_address || 'noreply@attendance.company.com',
          fromName: config.email_from_name || 'Attendance System'
        };

        this.smsConfig = {
          provider: config.sms_provider || 'twilio',
          accountSid: config.sms_account_sid,
          authToken: config.sms_auth_token,
          fromNumber: config.sms_from_number || ''
        };
      }
    } catch (error) {
      console.error('Error loading notification configuration:', error);
    }
  }

  /**
   * Reload notification configuration from database
   */
  async reloadConfiguration(): Promise<void> {
    await this.loadConfiguration();
    this.initializeProviders();
    console.log('Notification configuration reloaded');
  }

  /**
   * Send notification based on request
   */
  async sendNotification(request: NotificationRequest): Promise<void> {
    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(request.userId);
      if (!preferences) {
        console.log(`No notification preferences found for user ${request.userId}`);
        return;
      }

      // Check if notification type is enabled
      if (!this.isNotificationTypeEnabled(request.type, preferences)) {
        console.log(`Notification type ${request.type} disabled for user ${request.userId}`);
        return;
      }

      // Get user details
      const userResult = await pool.query(
        'SELECT first_name, last_name, email, phone FROM users WHERE id = $1',
        [request.userId]
      );

      if (userResult.rows.length === 0) {
        console.error(`User not found: ${request.userId}`);
        return;
      }

      const user = userResult.rows[0];
      const channels = request.channels || this.getEnabledChannels(preferences);

      // Send notifications on enabled channels
      for (const channel of channels) {
        if (this.isChannelEnabled(channel, preferences)) {
          await this.sendChannelNotification(channel, request, user, preferences);
        }
      }

    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  /**
   * Send notification on specific channel
   */
  private async sendChannelNotification(
    channel: 'email' | 'sms' | 'realtime',
    request: NotificationRequest,
    user: any,
    preferences: NotificationPreferences
  ): Promise<void> {
    try {
      // Get template
      const template = await this.getTemplate(request.type, channel);
      if (!template) {
        console.log(`No template found for ${request.type} on ${channel}`);
        return;
      }

      // Render content
      const renderedContent = this.renderTemplate(template.content, {
        firstName: user.first_name,
        lastName: user.last_name,
        ...request.data
      });

      const renderedSubject = template.subject ? 
        this.renderTemplate(template.subject, {
          firstName: user.first_name,
          lastName: user.last_name,
          ...request.data
        }) : undefined;

      // Create history record
      const historyId = await this.createHistoryRecord({
        userId: request.userId,
        type: channel,
        templateId: template.id,
        subject: renderedSubject,
        content: renderedContent,
        status: 'pending',
        metadata: request.data
      });

      // Send based on channel
      switch (channel) {
        case 'email':
          await this.sendEmail(user.email, renderedSubject || '', renderedContent, historyId);
          break;
        case 'sms':
          await this.sendSMS(user.phone, renderedContent, historyId);
          break;
        case 'realtime':
          await this.sendRealTimeNotification(request.userId, {
            title: renderedSubject || 'Notification',
            message: renderedContent,
            type: request.type,
            timestamp: new Date()
          }, historyId);
          break;
      }

    } catch (error) {
      console.error(`Error sending ${channel} notification:`, error);
    }
  }

  /**
   * Send email using SendGrid
   */
  private async sendEmail(to: string, subject: string, content: string, historyId: string): Promise<void> {
    try {
      if (!this.emailConfig?.apiKey) {
        throw new Error('Email service not configured');
      }

      const msg = {
        to,
        from: this.emailConfig.fromEmail, // Changed from object to string
        subject,
        html: content,
        text: content.replace(/<[^>]*>/g, '') // Strip HTML for text version
      };

      await sgMail.send(msg);
      await this.updateHistoryStatus(historyId, 'sent');
      console.log(`Email sent successfully to ${to}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      await this.updateHistoryStatus(historyId, 'failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Send SMS using Twilio
   */
  private async sendSMS(to: string, content: string, historyId: string): Promise<void> {
    try {
      if (!this.twilioClient || !this.smsConfig?.fromNumber) {
        throw new Error('SMS service not configured');
      }

      await this.twilioClient.messages.create({
        body: content,
        from: this.smsConfig.fromNumber,
        to: to
      });

      await this.updateHistoryStatus(historyId, 'sent');
      console.log(`SMS sent successfully to ${to}`);
    } catch (error) {
      console.error('Failed to send SMS:', error);
      await this.updateHistoryStatus(historyId, 'failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Send real-time notification using Socket.IO
   */
  private async sendRealTimeNotification(
    userId: string, 
    notification: any, 
    historyId: string
  ): Promise<void> {
    try {
      if (!this.io) {
        throw new Error('Socket.IO not initialized');
      }

      const notificationData = {
        id: historyId,
        type: notification.type,
        title: notification.title || 'Notification',
        message: notification.message,
        timestamp: new Date().toISOString(),
        data: notification.data || {}
      };

      // Send to user's personal room
      this.io.to(`user-${userId}`).emit('notification', notificationData);
      
      await this.updateHistoryStatus(historyId, 'sent');
      console.log(`Real-time notification sent to user ${userId}`);
    } catch (error) {
      console.error('Failed to send real-time notification:', error);
      await this.updateHistoryStatus(historyId, 'failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
 async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM notification_preferences WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        // Create default preferences
        return await this.createDefaultPreferences(userId);
      }

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        emailEnabled: row.email_enabled,
        smsEnabled: row.sms_enabled,
        realTimeEnabled: row.realtime_enabled,
        checkInConfirmation: row.checkin_confirmation,
        checkOutConfirmation: row.checkout_confirmation,
        autoCheckInFailure: row.auto_checkin_failure,
        policyViolations: row.policy_violations,
        deviceApproval: row.device_approval,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return null;
    }
  }

  /**
   * Create default notification preferences for user
   */
  private async createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
    const result = await pool.query(
      `INSERT INTO notification_preferences (user_id) VALUES ($1) 
       RETURNING *`,
      [userId]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      emailEnabled: row.email_enabled,
      smsEnabled: row.sms_enabled,
      realTimeEnabled: row.realtime_enabled,
      checkInConfirmation: row.checkin_confirmation,
      checkOutConfirmation: row.checkout_confirmation,
      autoCheckInFailure: row.auto_checkin_failure,
      policyViolations: row.policy_violations,
      deviceApproval: row.device_approval,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Get notification template
   */
  private async getTemplate(type: string, channel: string): Promise<NotificationTemplate | null> {
    try {
      const templateName = `${type}_${channel}`;
      const result = await pool.query(
        'SELECT * FROM notification_templates WHERE name = $1 AND type = $2 AND is_active = true',
        [templateName, channel]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        type: row.type,
        subject: row.subject,
        content: row.content,
        variables: row.variables,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error('Error getting template:', error);
      return null;
    }
  }

  /**
   * Render template with variables
   */
  private renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, String(value || ''));
    }
    
    return rendered;
  }

  /**
   * Create notification history record
   */
  private async createHistoryRecord(data: Partial<NotificationHistory>): Promise<string> {
    const result = await pool.query(
      `INSERT INTO notification_history 
       (user_id, type, template_id, subject, content, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        data.userId,
        data.type,
        data.templateId,
        data.subject,
        data.content,
        data.status,
        JSON.stringify(data.metadata || {})
      ]
    );

    return result.rows[0].id;
  }

  /**
   * Update notification history status
   */
  private async updateHistoryStatus(
    historyId: string, 
    status: string, 
    errorMessage?: string
  ): Promise<void> {
    const updateFields = ['status = $2'];
    const values = [historyId, status];
    
    if (status === 'sent') {
      updateFields.push('sent_at = CURRENT_TIMESTAMP');
    } else if (status === 'delivered') {
      updateFields.push('delivered_at = CURRENT_TIMESTAMP');
    }
    
    if (errorMessage) {
      updateFields.push(`error_message = $${values.length + 1}`);
      values.push(errorMessage);
    }

    await pool.query(
      `UPDATE notification_history SET ${updateFields.join(', ')} WHERE id = $1`,
      values
    );
  }

  /**
   * Check if notification type is enabled for user
   */
  private isNotificationTypeEnabled(type: string, preferences: NotificationPreferences): boolean {
    switch (type) {
      case 'auto_checkin_success':
      case 'manual_checkin':
        return preferences.checkInConfirmation;
      case 'auto_checkin_failed':
      case 'auto_checkin_failed_with_fallback':
        return preferences.autoCheckInFailure;
      case 'pending_override_request':
        return true; // Admin notifications should always be enabled
      case 'checkout':
        return preferences.checkOutConfirmation;
      case 'device_approved':
        return preferences.deviceApproval;
      case 'policy_violation':
        return preferences.policyViolations;
      case 'pending_override_request':
        return true; // Admin notifications should always be enabled
      default:
        return true;
    }
  }

  /**
   * Get enabled notification channels for user
   */
  private getEnabledChannels(preferences: NotificationPreferences): ('email' | 'sms' | 'realtime')[] {
    const channels: ('email' | 'sms' | 'realtime')[] = [];
    
    if (preferences.emailEnabled) channels.push('email');
    if (preferences.smsEnabled) channels.push('sms');
    if (preferences.realTimeEnabled) channels.push('realtime');
    
    return channels;
  }

  /**
   * Check if specific channel is enabled
   */
  private isChannelEnabled(channel: string, preferences: NotificationPreferences): boolean {
    switch (channel) {
      case 'email':
        return preferences.emailEnabled;
      case 'sms':
        return preferences.smsEnabled;
      case 'realtime':
        return preferences.realTimeEnabled;
      default:
        return false;
    }
  }

  /**
   * Get notification history for user
   */
  async getNotificationHistory(
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<NotificationHistory[]> {
    try {
      const result = await pool.query(
        `SELECT nh.*, nt.name as template_name 
         FROM notification_history nh
         LEFT JOIN notification_templates nt ON nh.template_id = nt.id
         WHERE nh.user_id = $1 
         ORDER BY nh.created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        type: row.type,
        templateId: row.template_id,
        subject: row.subject,
        content: row.content,
        status: row.status,
        sentAt: row.sent_at,
        deliveredAt: row.delivered_at,
        errorMessage: row.error_message,
        metadata: row.metadata,
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error('Error getting notification history:', error);
      return [];
    }
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(
    userId: string, 
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences | null> {
    try {
      const updateFields = [];
      const values = [userId];
      let paramIndex = 2;

      for (const [key, value] of Object.entries(preferences)) {
        if (key !== 'id' && key !== 'userId' && key !== 'createdAt' && key !== 'updatedAt') {
          const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          updateFields.push(`${dbKey} = $${paramIndex}`);
          values.push(String(value));
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        return await this.getUserPreferences(userId);
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      const result = await pool.query(
        `UPDATE notification_preferences 
         SET ${updateFields.join(', ')} 
         WHERE user_id = $1 
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        emailEnabled: row.email_enabled,
        smsEnabled: row.sms_enabled,
        realTimeEnabled: row.realtime_enabled,
        checkInConfirmation: row.checkin_confirmation,
        checkOutConfirmation: row.checkout_confirmation,
        autoCheckInFailure: row.auto_checkin_failure,
        policyViolations: row.policy_violations,
        deviceApproval: row.device_approval,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error('Error updating user preferences:', error);
      return null;
    }
  }

  /**
   * Send system alert notification
   */
  async sendSystemAlert(alert: {
    title: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
  }): Promise<void> {
    try {
      // Send real-time notification to all connected admin users
      if (this.io) {
        this.io.emit('system-alert', {
          title: alert.title,
          message: alert.message,
          severity: alert.severity,
          timestamp: alert.timestamp,
          type: 'system-alert'
        });
      }

      // Log the alert
      console.log(`🚨 System Alert [${alert.severity.toUpperCase()}]: ${alert.title}`);
      console.log(`   Message: ${alert.message}`);
      console.log(`   Timestamp: ${alert.timestamp.toISOString()}`);

      // For critical alerts, you might want to send emails to admins
      if (alert.severity === 'critical') {
        // Get admin users and send email notifications
        const adminQuery = 'SELECT email FROM users WHERE role = $1 AND email IS NOT NULL';
        const adminResult = await pool.query(adminQuery, ['admin']);
        
        for (const admin of adminResult.rows) {
          if (this.emailConfig) {
            await this.sendEmail(
              admin.email,
              `Critical System Alert: ${alert.title}`,
              `A critical system alert has been triggered:\n\n${alert.message}\n\nTimestamp: ${alert.timestamp.toISOString()}`,
              ''
            );
          }
        }
      }
    } catch (error) {
      console.error('Error sending system alert:', error);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();