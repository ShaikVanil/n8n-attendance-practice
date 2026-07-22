import pool from '../config/database';
import { NotificationService } from './notificationService';

// Types based on the frontend interfaces and database schema
export interface LocationTransfer {
  id: string;
  user_id: string;
  from_location_id: string | null;
  to_location_id: string;
  transfer_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  is_temporary: boolean;
  temporary_end_date?: string;
  comments?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLocationTransferRequest {
  employeeId: string;
  targetLocationId: string;
  reason: string;
  isTemporary: boolean;
  temporaryEndDate?: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  managerId?: string;
  current_location_id?: string;
  location?: {
    name: string;
  };
}

export interface OfficeLocation {
  id: string;
  name: string;
  address: string;
}

export class LocationTransferService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  private async getUserById(userId: string): Promise<User> {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.first_name as "firstName",
        u.last_name as "lastName",
        u.email,
        u.manager_id as "managerId",
        u.current_location_id,
        ol.name as location_name
      FROM users u
      LEFT JOIN office_locations ol ON u.current_location_id = ol.id
      WHERE u.id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const user = result.rows[0];
    return {
      ...user,
      location: user.location_name ? { name: user.location_name } : undefined
    };
  }

  private async getLocationById(locationId: string): Promise<OfficeLocation> {
    const result = await pool.query(`
      SELECT id, name, address
      FROM office_locations
      WHERE id = $1 AND is_active = true
    `, [locationId]);
    
    if (result.rows.length === 0) {
      throw new Error('Location not found');
    }
    
    return result.rows[0];
  }

  private async sendTransferRequestNotification(
    transfer: LocationTransfer,
    employee: User,
    manager: User,
    targetLocation: OfficeLocation
  ): Promise<void> {
    try {
      // Notify employee
      await this.notificationService.sendNotification({
        userId: employee.id,
        type: 'transfer_request_submitted',
        title: 'Transfer Request Submitted',
        message: `Your transfer request to ${targetLocation.name} has been submitted`,
        data: {
          employeeName: `${employee.firstName} ${employee.lastName}`,
          targetLocationName: targetLocation.name,
          requestedDate: transfer.transfer_date,
          reason: transfer.reason,
          transferType: transfer.is_temporary ? 'temporary' : 'permanent'
        },
        channels: ['email', 'realtime'],
        priority: 'medium'
      });

      // Notify manager
      await this.notificationService.sendNotification({
        userId: manager.id,
        type: 'transfer_request_submitted',
        title: 'New Transfer Request',
        message: `${employee.firstName} ${employee.lastName} has requested a transfer`,
        data: {
          managerName: `${manager.firstName} ${manager.lastName}`,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          employeeEmail: employee.email,
          currentLocationName: employee.location?.name,
          targetLocationName: targetLocation.name,
          requestedDate: transfer.transfer_date,
          reason: transfer.reason,
          transferType: transfer.is_temporary ? 'temporary' : 'permanent'
        },
        channels: ['email', 'realtime'],
        priority: 'high'
      });
    } catch (error) {
      console.error('Failed to send transfer request notification:', error);
    }
  }

  private async sendTransferApprovalNotification(
    transfer: LocationTransfer,
    employee: User,
    approver: User,
    targetLocation: OfficeLocation,
    approved: boolean
  ): Promise<void> {
    try {
      const notificationType = approved ? 'transfer_request_approved' : 'transfer_request_rejected';
      const title = approved ? 'Transfer Request Approved' : 'Transfer Request Declined';
      const message = approved 
        ? `Your transfer to ${targetLocation.name} has been approved`
        : `Your transfer to ${targetLocation.name} has been declined`;

      await this.notificationService.sendNotification({
        userId: employee.id,
        type: notificationType,
        title,
        message,
        data: {
          employeeName: `${employee.firstName} ${employee.lastName}`,
          targetLocationName: targetLocation.name,
          effectiveDate: transfer.transfer_date,
          requestedDate: transfer.transfer_date,
          transferType: transfer.is_temporary ? 'temporary' : 'permanent',
          approverName: `${approver.firstName} ${approver.lastName}`,
          comments: transfer.comments
        },
        channels: approved ? ['email', 'sms', 'realtime'] : ['email', 'realtime'],
        priority: 'high'
      });
    } catch (error) {
      console.error('Failed to send transfer approval notification:', error);
    }
  }

  private async sendTransferEffectiveNotification(
    transfer: LocationTransfer,
    employee: User,
    previousLocation: OfficeLocation | null,
    newLocation: OfficeLocation
  ): Promise<void> {
    try {
      await this.notificationService.sendNotification({
        userId: employee.id,
        type: 'transfer_effective',
        title: 'Location Transfer Active',
        message: `You are now assigned to ${newLocation.name}`,
        data: {
          employeeName: `${employee.firstName} ${employee.lastName}`,
          previousLocationName: previousLocation?.name || 'No previous location',
          newLocationName: newLocation.name,
          effectiveDate: transfer.transfer_date,
          transferType: transfer.is_temporary ? 'temporary' : 'permanent'
        },
        channels: ['email', 'realtime'],
        priority: 'medium'
      });
    } catch (error) {
      console.error('Failed to send transfer effective notification:', error);
    }
  }

  async createTransferRequest(transferData: CreateLocationTransferRequest): Promise<LocationTransfer> {
    // Get user's current location
    const employee = await this.getUserById(transferData.employeeId);
    
    // Validate target location exists
    const targetLocation = await this.getLocationById(transferData.targetLocationId);
    
    // Check for pending transfers
    const pendingResult = await pool.query(
      'SELECT id FROM location_transfers WHERE user_id = $1 AND status = $2',
      [transferData.employeeId, 'pending']
    );

    if (pendingResult.rows.length > 0) {
      throw new Error('User already has a pending location transfer request');
    }

    // Create transfer request
    const transferResult = await pool.query(`
      INSERT INTO location_transfers (
        user_id, from_location_id, to_location_id, transfer_date, reason, 
        status, is_temporary, temporary_end_date
      )
      VALUES ($1, $2, $3, CURRENT_DATE, $4, 'pending', $5, $6)
      RETURNING *
    `, [
      transferData.employeeId, 
      employee.current_location_id, 
      transferData.targetLocationId, 
      transferData.reason, 
      transferData.isTemporary, 
      transferData.temporaryEndDate
    ]);

    const transfer = transferResult.rows[0];
    
    // Send notifications
    if (employee.managerId) {
      const manager = await this.getUserById(employee.managerId);
      await this.sendTransferRequestNotification(transfer, employee, manager, targetLocation);
    }
    
    return transfer;
  }

  async approveTransfer(transferId: string, approverId: string, comments?: string): Promise<LocationTransfer> {
    // Get transfer details
    const transferResult = await pool.query(
      'SELECT * FROM location_transfers WHERE id = $1 AND status = $2',
      [transferId, 'pending']
    );

    if (transferResult.rows.length === 0) {
      throw new Error('Transfer request not found or already processed');
    }

    const transfer = transferResult.rows[0];

    // Update transfer status
    await pool.query(`
      UPDATE location_transfers 
      SET status = 'approved', approved_by = $1, approved_at = NOW(), comments = $2
      WHERE id = $3
    `, [approverId, comments, transferId]);

    // Update user's location
    await pool.query(
      'UPDATE users SET current_location_id = $1 WHERE id = $2',
      [transfer.to_location_id, transfer.user_id]
    );

    // Get updated transfer
    const updatedResult = await pool.query(
      'SELECT * FROM location_transfers WHERE id = $1',
      [transferId]
    );
    const updatedTransfer = updatedResult.rows[0];
    
    // Send notifications
    const employee = await this.getUserById(transfer.user_id);
    const approver = await this.getUserById(approverId);
    const targetLocation = await this.getLocationById(transfer.to_location_id);
    
    await this.sendTransferApprovalNotification(updatedTransfer, employee, approver, targetLocation, true);
    
    return updatedTransfer;
  }

  async rejectTransfer(transferId: string, approverId: string, comments: string): Promise<LocationTransfer> {
    // Get transfer details
    const transferResult = await pool.query(
      'SELECT * FROM location_transfers WHERE id = $1 AND status = $2',
      [transferId, 'pending']
    );

    if (transferResult.rows.length === 0) {
      throw new Error('Transfer request not found or already processed');
    }

    const transfer = transferResult.rows[0];

    // Update transfer status
    await pool.query(`
      UPDATE location_transfers 
      SET status = 'rejected', approved_by = $1, approved_at = NOW(), comments = $2
      WHERE id = $3
    `, [approverId, comments, transferId]);

    // Get updated transfer
    const updatedResult = await pool.query(
      'SELECT * FROM location_transfers WHERE id = $1',
      [transferId]
    );
    const updatedTransfer = updatedResult.rows[0];
    
    // Send notifications
    const employee = await this.getUserById(transfer.user_id);
    const approver = await this.getUserById(approverId);
    const targetLocation = await this.getLocationById(transfer.to_location_id);
    
    await this.sendTransferApprovalNotification(updatedTransfer, employee, approver, targetLocation, false);
    
    return updatedTransfer;
  }

  async getTransferById(transferId: string): Promise<LocationTransfer | null> {
    const result = await pool.query(
      'SELECT * FROM location_transfers WHERE id = $1',
      [transferId]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async getUserTransfers(userId: string): Promise<LocationTransfer[]> {
    const result = await pool.query(
      'SELECT * FROM location_transfers WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    return result.rows;
  }

  async getPendingTransfers(): Promise<LocationTransfer[]> {
    const result = await pool.query(
      'SELECT * FROM location_transfers WHERE status = $1 ORDER BY created_at ASC',
      ['pending']
    );
    
    return result.rows;
  }
}