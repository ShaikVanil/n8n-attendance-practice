import { NotificationService } from '../notificationService';
import { testDb, testUtils } from '../../__tests__/setup';

// Mock external services
jest.mock('nodemailer');
jest.mock('node-cron');

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = new NotificationService();
    jest.clearAllMocks();
  });

  describe('sendAttendanceAlert', () => {
    it('should send email notification for late arrival', async () => {
      // Arrange
      const user = await testUtils.createTestUser({
        email: 'test@example.com',
        name: 'Test User'
      });
      const alertData = {
        type: 'late_arrival',
        user_id: user.id,
        message: 'Employee arrived 30 minutes late',
        severity: 'medium'
      };

      // Act
      const result = await notificationService.sendAttendanceAlert(alertData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.notification_id).toBeDefined();
      
      // Verify notification was stored in database
      const notifications = await testDb.query(
        'SELECT * FROM notifications WHERE user_id = $1 AND type = $2',
        [user.id, 'late_arrival']
      );
      expect(notifications.rows.length).toBe(1);
      expect(notifications.rows[0].message).toBe(alertData.message);
    });

    it('should handle email sending failure gracefully', async () => {
      // Arrange
      const user = await testUtils.createTestUser();
      const alertData = {
        type: 'absence',
        user_id: user.id,
        message: 'Employee did not check in',
        severity: 'high'
      };

      // Mock email failure
      const mockSendMail = jest.fn().mockRejectedValue(new Error('SMTP Error'));
      notificationService.emailTransporter = { sendMail: mockSendMail };

      // Act
      const result = await notificationService.sendAttendanceAlert(alertData);

      // Assert
      expect(result.success).toBe(true); // Should still succeed
      expect(result.email_sent).toBe(false);
      expect(result.error).toContain('Email sending failed');
    });

    it('should respect notification preferences', async () => {
      // Arrange
      const user = await testUtils.createTestUser();
      await testDb.query(
        'INSERT INTO user_notification_preferences (user_id, email_enabled, sms_enabled) VALUES ($1, $2, $3)',
        [user.id, false, true]
      );
      
      const alertData = {
        type: 'overtime_alert',
        user_id: user.id,
        message: 'Overtime threshold reached'
      };

      // Act
      const result = await notificationService.sendAttendanceAlert(alertData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.email_sent).toBe(false);
      expect(result.sms_sent).toBe(true);
    });
  });

  describe('scheduleRecurringNotifications', () => {
    it('should schedule daily attendance reminders', async () => {
      // Arrange
      const scheduleData = {
        type: 'daily_reminder',
        cron_expression: '0 8 * * 1-5', // 8 AM weekdays
        message: 'Remember to check in',
        target_users: 'all_active'
      };

      // Act
      const result = await notificationService.scheduleRecurringNotifications(scheduleData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.schedule_id).toBeDefined();
      
      // Verify schedule was stored
      const schedules = await testDb.query(
        'SELECT * FROM notification_schedules WHERE type = $1',
        ['daily_reminder']
      );
      expect(schedules.rows.length).toBe(1);
    });

    it('should validate cron expression', async () => {
      // Arrange
      const invalidSchedule = {
        type: 'invalid_schedule',
        cron_expression: 'invalid cron',
        message: 'Test message'
      };

      // Act
      const result = await notificationService.scheduleRecurringNotifications(invalidSchedule);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid cron expression');
    });
  });

  describe('getNotificationHistory', () => {
    it('should return paginated notification history', async () => {
      // Arrange
      const user = await testUtils.createTestUser();
      
      // Create multiple notifications
      for (let i = 0; i < 15; i++) {
        await testDb.query(
          'INSERT INTO notifications (user_id, type, message, created_at) VALUES ($1, $2, $3, $4)',
          [user.id, 'test', `Message ${i}`, new Date()]
        );
      }

      // Act
      const result = await notificationService.getNotificationHistory(user.id, {
        page: 1,
        limit: 10
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.notifications.length).toBe(10);
      expect(result.total_count).toBe(15);
      expect(result.has_more).toBe(true);
    });

    it('should filter notifications by type', async () => {
      // Arrange
      const user = await testUtils.createTestUser();
      await testDb.query(
        'INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3), ($1, $4, $5)',
        [user.id, 'late_arrival', 'Late message', 'overtime', 'Overtime message']
      );

      // Act
      const result = await notificationService.getNotificationHistory(user.id, {
        type: 'late_arrival'
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.notifications.length).toBe(1);
      expect(result.notifications[0].type).toBe('late_arrival');
    });
  });
});