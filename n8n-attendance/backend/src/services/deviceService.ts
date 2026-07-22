import pool from '../config/database';
import { Device, DeviceRegistrationRequest } from '../types/device';
import { v4 as uuidv4 } from 'uuid';
import { notificationService } from './notificationService';

export class DeviceService {
  async registerDevice(userId: string, deviceData: DeviceRegistrationRequest): Promise<Device> {
    const client = await pool.connect();
    
    try {
      // Check if MAC address already exists
      const existingDevice = await client.query(
        'SELECT id FROM devices WHERE mac_address = $1',
        [deviceData.macAddress]
      );

      if (existingDevice.rows.length > 0) {
        throw new Error('Device with this MAC address already registered');
      }

      // Insert new device
      const result = await client.query(
        `INSERT INTO devices (id, user_id, device_name, device_type, mac_address, description, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          uuidv4(),
          userId,
          deviceData.deviceName,
          deviceData.deviceType,
          deviceData.macAddress,
          deviceData.description || null,
          'pending'
        ]
      );

      const device = this.mapRowToDevice(result.rows[0]);
      
      // Notify admins of new device registration request
      await this.notifyAdminsOfNewRegistration(device);
      
      return device;
    } finally {
      client.release();
    }
  }

  async getUserDevices(userId: string): Promise<Device[]> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM devices WHERE user_id = $1 ORDER BY registered_at DESC',
        [userId]
      );

      return result.rows.map(row => this.mapRowToDevice(row));
    } finally {
      client.release();
    }
  }

  async getAllDevices(): Promise<Device[]> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM devices ORDER BY registered_at DESC'
      );

      return result.rows.map(row => this.mapRowToDevice(row));
    } finally {
      client.release();
    }
  }

  async updateDeviceStatus(
    deviceId: string,
    status: 'pending' | 'approved' | 'rejected',
    adminUserId: string,
    rejectionReason?: string
  ): Promise<Device> {
    const client = await pool.connect();
    
    try {
      // Get device details before update for notifications
      const deviceResult = await client.query(
        'SELECT d.*, u.first_name, u.last_name, u.email FROM devices d JOIN users u ON d.user_id = u.id WHERE d.id = $1',
        [deviceId]
      );

      if (deviceResult.rows.length === 0) {
        throw new Error('Device not found');
      }

      const deviceData = deviceResult.rows[0];
      
      // Update device status
      const result = await client.query(
        'UPDATE devices SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, deviceId]
      );

      const updatedDevice = this.mapRowToDevice(result.rows[0]);
      
      // Send notification to device owner
      if (status === 'approved') {
        await this.notifyDeviceApproval(deviceData, updatedDevice);
      } else if (status === 'rejected') {
        await this.notifyDeviceRejection(deviceData, updatedDevice, rejectionReason);
      }
      
      // Log the admin action for audit trail
      await this.logDeviceAction(deviceId, adminUserId, status, rejectionReason);

      return updatedDevice;
    } finally {
      client.release();
    }
  }

  async deleteDevice(deviceId: string, userId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'DELETE FROM devices WHERE id = $1 AND user_id = $2',
        [deviceId, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Device not found or unauthorized');
      }
    } finally {
      client.release();
    }
  }

  private mapRowToDevice(row: any): Device {
    return {
      id: row.id,
      userId: row.user_id,
      deviceName: row.device_name,
      deviceType: row.device_type,
      macAddress: row.mac_address,
      description: row.description,
      status: row.status,
      registeredAt: row.registered_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Notify admins of new device registration requests
   */
  private async notifyAdminsOfNewRegistration(device: Device): Promise<void> {
    try {
      // Get user details
      const userResult = await pool.query(
        'SELECT first_name, last_name, email FROM users WHERE id = $1',
        [device.userId]
      );

      if (userResult.rows.length === 0) return;

      const user = userResult.rows[0];

      // Get all admin users
      const adminsResult = await pool.query(
        "SELECT id FROM users WHERE role IN ('admin', 'manager') AND is_active = true"
      );

      // Send notification to each admin
      for (const admin of adminsResult.rows) {
        await notificationService.sendNotification({
          userId: admin.id,
          type: 'device_registration_request',
          title: 'New Device Registration Request',
          message: `${user.first_name} ${user.last_name} has requested to register a new device: ${device.deviceName}`,
          data: {
            employeeName: `${user.first_name} ${user.last_name}`,
            employeeEmail: user.email,
            deviceName: device.deviceName,
            deviceType: device.deviceType,
            macAddress: device.macAddress,
            registrationTime: new Date().toLocaleString()
          },
          channels: ['email', 'realtime'],
          priority: 'medium'
        });
      }
    } catch (error) {
      console.error('Error notifying admins of device registration:', error);
    }
  }

  /**
   * Notify user of device approval
   */
  private async notifyDeviceApproval(deviceData: any, device: Device): Promise<void> {
    try {
      await notificationService.sendNotification({
        userId: device.userId,
        type: 'device_approved',
        title: 'Device Registration Approved',
        message: `Your device "${device.deviceName}" has been approved and is now active for attendance tracking.`,
        data: {
          firstName: deviceData.first_name,
          deviceName: device.deviceName,
          deviceType: device.deviceType,
          macAddress: device.macAddress,
          approvalTime: new Date().toLocaleString()
        },
        channels: ['email', 'realtime'],
        priority: 'medium'
      });
    } catch (error) {
      console.error('Error sending device approval notification:', error);
    }
  }

  /**
   * Notify user of device rejection
   */
  private async notifyDeviceRejection(deviceData: any, device: Device, reason?: string): Promise<void> {
    try {
      await notificationService.sendNotification({
        userId: device.userId,
        type: 'device_rejected',
        title: 'Device Registration Rejected',
        message: `Your device registration for "${device.deviceName}" has been rejected. ${reason || 'Please contact your administrator for more information.'}`,
        data: {
          firstName: deviceData.first_name,
          deviceName: device.deviceName,
          deviceType: device.deviceType,
          macAddress: device.macAddress,
          rejectionReason: reason || 'No reason provided',
          rejectionTime: new Date().toLocaleString()
        },
        channels: ['email', 'realtime'],
        priority: 'medium'
      });
    } catch (error) {
      console.error('Error sending device rejection notification:', error);
    }
  }

  /**
   * Log device approval/rejection actions for audit trail
   */
  private async logDeviceAction(
    deviceId: string,
    adminUserId: string,
    action: string,
    reason?: string
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO device_audit_logs (device_id, admin_user_id, action, reason, timestamp)
         VALUES ($1, $2, $3, $4, $5)`,
        [deviceId, adminUserId, action, reason || null, new Date()]
      );
    } catch (error) {
      console.error('Error logging device action:', error);
    }
  }
}