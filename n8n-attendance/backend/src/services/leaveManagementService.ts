import { 
  LeaveType, 
  LeaveRequest, 
  LeaveRequestDocument, 
  LeaveBalance,
  LeaveBalanceWithType, // Add this import
  LeaveRequestHistory,
  CreateLeaveRequestRequest,
  UpdateLeaveRequestRequest,
  ReviewLeaveRequestRequest,
  LeaveRequestFilters,
  LeaveBalanceFilters,
  PaginatedLeaveResponse,
  LeaveStatistics,
  UserLeaveOverview
} from '../types/leave';
import { notificationService } from './notificationService';
import { activityService } from './activityService';
import pool from '../config/database';
import crypto from 'crypto';

class LeaveManagementService {
  // Removed all private arrays - using database only

  // Helper methods for database mapping
  private mapRowToLeaveRequest(row: any): LeaveRequest {
    return {
      id: row.id,
      userId: row.user_id,
      leaveTypeId: row.leave_type_id,
      startDate: new Date(row.start_date),
      endDate: new Date(row.end_date),
      totalDays: row.total_days,
      reason: row.reason,
      status: row.status,
      submittedAt: new Date(row.submitted_at),
      emergencyLeave: row.emergency_leave,
      halfDay: row.half_day,
      halfDayPeriod: row.half_day_period,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
      reviewedBy: row.reviewed_by,
      reviewerComments: row.reviewer_comments,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToLeaveBalance(row: any): LeaveBalance {
    return {
      id: row.id,
      userId: row.user_id,
      leaveTypeId: row.leave_type_id,
      year: row.year,
      allocatedDays: row.allocated_days,
      usedDays: row.used_days,
      pendingDays: row.pending_days,
      remainingDays: row.remaining_days,
      carriedForwardDays: row.carried_forward_days,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToLeaveBalanceWithType(row: any): LeaveBalanceWithType {
    return {
      id: row.id,
      userId: row.user_id,
      leaveTypeId: row.leave_type_id,
      year: row.year,
      allocatedDays: row.allocated_days,
      usedDays: row.used_days,
      pendingDays: row.pending_days,
      remainingDays: row.remaining_days,
      carriedForwardDays: row.carried_forward_days,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      leaveType: row.leave_type_id ? {
        id: row.leave_type_id,
        name: row.leave_type_name,
        description: row.leave_type_description,
        maxDaysPerYear: row.leave_type_max_days_per_year,
        requiresApproval: row.leave_type_requires_approval,
        requiresDocumentation: row.leave_type_requires_documentation,
        advanceNoticeDays: row.leave_type_advance_notice_days,
        isActive: row.leave_type_is_active,
        createdAt: new Date(row.leave_type_created_at),
        updatedAt: new Date(row.leave_type_updated_at)
      } : undefined
    };
  }

  private mapRowToLeaveHistory(row: any): LeaveRequestHistory {
    return {
      id: row.id,
      leaveRequestId: row.leave_request_id,
      action: row.action,
      performedBy: row.performed_by,
      previousStatus: row.previous_status,
      newStatus: row.new_status,
      comments: row.comments,
      createdAt: new Date(row.created_at)
    };
  }

  // Leave Types Management (already using database)
  async getAllLeaveTypes(): Promise<LeaveType[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM leave_types WHERE is_active = true ORDER BY name'
      );
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        maxDaysPerYear: row.max_days_per_year,
        requiresApproval: row.requires_approval,
        requiresDocumentation: row.requires_documentation,
        advanceNoticeDays: row.advance_notice_days,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Error fetching leave types from database:', error);
      throw error;
    }
  }

  async getLeaveTypeById(id: string): Promise<LeaveType | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM leave_types WHERE id = $1 AND is_active = true',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        maxDaysPerYear: row.max_days_per_year,
        requiresApproval: row.requires_approval,
        requiresDocumentation: row.requires_documentation,
        advanceNoticeDays: row.advance_notice_days,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error('Error fetching leave type by ID from database:', error);
      throw error;
    }
  }

  // Leave Request Submission - Fixed to use database
  async submitLeaveRequest(
    userId: string, 
    requestData: CreateLeaveRequestRequest
  ): Promise<LeaveRequest> {
    const leaveType = await this.getLeaveTypeById(requestData.leaveTypeId);
    if (!leaveType) {
      throw new Error('Invalid leave type');
    }

    // Validate dates
    const startDate = new Date(requestData.startDate);
    const endDate = new Date(requestData.endDate);
    const today = new Date();
    
    if (startDate < today && !requestData.emergencyLeave) {
      throw new Error('Start date cannot be in the past for non-emergency leave');
    }

    if (endDate < startDate) {
      throw new Error('End date cannot be before start date');
    }

    // Check advance notice requirement
    if (!requestData.emergencyLeave && leaveType.advanceNoticeDays > 0) {
      const daysDifference = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDifference < leaveType.advanceNoticeDays) {
        throw new Error(`This leave type requires ${leaveType.advanceNoticeDays} days advance notice`);
      }
    }

    // Calculate total days (excluding weekends)
    const totalDays = this.calculateLeaveDays(
      startDate, 
      endDate, 
      requestData.halfDay || false
    );

    // Check leave balance
    const year = startDate.getFullYear();
    const balance = await this.getLeaveBalance(userId, requestData.leaveTypeId, year);
    
    if (balance && (balance.remainingDays < totalDays)) {
      throw new Error('Insufficient leave balance');
    }

    // Check for overlapping requests
    const overlapping = await this.checkOverlappingRequests(userId, startDate, endDate);
    if (overlapping.length > 0) {
      throw new Error('You have overlapping leave requests for these dates');
    }

    // Create leave request in database
    const leaveRequestId = this.generateId();
    const status = leaveType.requiresApproval ? 'pending' : 'approved';
    
    try {
      const result = await pool.query(`
        INSERT INTO leave_requests (
          id, user_id, leave_type_id, start_date, end_date, total_days,
          reason, status, submitted_at, emergency_leave, half_day, half_day_period,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `, [
        leaveRequestId, userId, requestData.leaveTypeId, startDate, endDate,
        totalDays, requestData.reason, status, new Date(),
        requestData.emergencyLeave || false, requestData.halfDay || false,
        requestData.halfDayPeriod, new Date(), new Date()
      ]);
      
      const leaveRequest = this.mapRowToLeaveRequest(result.rows[0]);

      // Update leave balance
      await this.updateLeaveBalance(userId, requestData.leaveTypeId, year, totalDays, 'pending');

      // Log activity
      await activityService.logActivity(
        userId,
        'leave_request_submitted',
        `Submitted ${leaveType.name} request for ${totalDays} days`,
        userId
      );

      // Send notifications
      if (leaveType.requiresApproval) {
        await this.sendLeaveRequestNotifications(leaveRequest, 'submitted');
      }

      return leaveRequest;
    } catch (error) {
      console.error('Error creating leave request:', error);
      throw error;
    }
  }

  private mapRowToLeaveRequestWithDetails(row: any): any {
    const baseRequest = this.mapRowToLeaveRequest(row);
    
    return {
      ...baseRequest,
      user: {
        id: row.user_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        department: row.department,
        role: row.role
      },
      leaveType: row.leave_type_name ? {
        id: row.leave_type_id,
        name: row.leave_type_name,
        description: row.leave_type_description
      } : undefined,
      reviewer: row.reviewer_first_name ? {
        id: row.reviewed_by,
        firstName: row.reviewer_first_name,
        lastName: row.reviewer_last_name
      } : undefined
    };
  }
  // Leave Request Management - Fixed to use database
  // Leave Request Management - Fixed to include user details
  async getLeaveRequests(
    filters: LeaveRequestFilters = {},
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedLeaveResponse<LeaveRequest>> {
    try {
      let query = `
        SELECT 
          lr.*,
          u.first_name,
          u.last_name,
          u.email,
          u.department,
          u.role,
          lt.name as leave_type_name,
          lt.description as leave_type_description,
          reviewer.first_name as reviewer_first_name,
          reviewer.last_name as reviewer_last_name
        FROM leave_requests lr
        LEFT JOIN users u ON lr.user_id = u.id
        LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
        LEFT JOIN users reviewer ON lr.reviewed_by = reviewer.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      // Apply filters
      if (filters.userId) {
        query += ` AND lr.user_id = $${paramIndex}`;
        params.push(filters.userId);
        paramIndex++;
      }
      if (filters.leaveTypeId) {
        query += ` AND lr.leave_type_id = $${paramIndex}`;
        params.push(filters.leaveTypeId);
        paramIndex++;
      }
      if (filters.status) {
        query += ` AND lr.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }
      if (filters.startDate) {
        query += ` AND lr.start_date >= $${paramIndex}`;
        params.push(filters.startDate);
        paramIndex++;
      }
      if (filters.endDate) {
        query += ` AND lr.end_date <= $${paramIndex}`;
        params.push(filters.endDate);
        paramIndex++;
      }
      if (filters.emergencyLeave !== undefined) {
        query += ` AND lr.emergency_leave = $${paramIndex}`;
        params.push(filters.emergencyLeave);
        paramIndex++;
      }

      // Count total records
      const countQuery = `
        SELECT COUNT(*)
        FROM leave_requests lr
        LEFT JOIN users u ON lr.user_id = u.id
        WHERE 1=1
        ${filters.userId ? ` AND lr.user_id = '${filters.userId}'` : ''}
        ${filters.leaveTypeId ? ` AND lr.leave_type_id = '${filters.leaveTypeId}'` : ''}
        ${filters.status ? ` AND lr.status = '${filters.status}'` : ''}
        ${filters.startDate ? ` AND lr.start_date >= '${filters.startDate}'` : ''}
        ${filters.endDate ? ` AND lr.end_date <= '${filters.endDate}'` : ''}
        ${filters.emergencyLeave !== undefined ? ` AND lr.emergency_leave = ${filters.emergencyLeave}` : ''}
      `;
      const countResult = await pool.query(countQuery);
      const total = parseInt(countResult.rows[0].count);

      // Add sorting and pagination
      query += ' ORDER BY lr.submitted_at DESC';
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, (page - 1) * limit);

      const result = await pool.query(query, params);
      const data = result.rows.map(row => this.mapRowToLeaveRequestWithDetails(row));

      const totalPages = Math.ceil(total / limit);

      return {
        data,
        total,
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      };
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      throw error;
    }
  }

  async getLeaveRequestById(id: string): Promise<LeaveRequest | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM leave_requests WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToLeaveRequest(result.rows[0]);
    } catch (error) {
      console.error('Error fetching leave request by ID:', error);
      throw error;
    }
  }

  async updateLeaveRequest(
    id: string, 
    userId: string, 
    updateData: UpdateLeaveRequestRequest
  ): Promise<LeaveRequest> {
    const request = await this.getLeaveRequestById(id);
    if (!request) {
      throw new Error('Leave request not found');
    }

    if (request.userId !== userId) {
      throw new Error('Unauthorized to update this leave request');
    }

    if (request.status !== 'pending') {
      throw new Error('Can only update pending leave requests');
    }

    // Prepare update fields
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updateData.startDate) {
      updateFields.push(`start_date = $${paramIndex}`);
      params.push(new Date(updateData.startDate));
      paramIndex++;
    }
    if (updateData.endDate) {
      updateFields.push(`end_date = $${paramIndex}`);
      params.push(new Date(updateData.endDate));
      paramIndex++;
    }
    if (updateData.reason !== undefined) {
      updateFields.push(`reason = $${paramIndex}`);
      params.push(updateData.reason);
      paramIndex++;
    }
    if (updateData.halfDay !== undefined) {
      updateFields.push(`half_day = $${paramIndex}`);
      params.push(updateData.halfDay);
      paramIndex++;
    }
    if (updateData.halfDayPeriod !== undefined) {
      updateFields.push(`half_day_period = $${paramIndex}`);
      params.push(updateData.halfDayPeriod);
      paramIndex++;
    }

    // Recalculate total days if dates changed
    const startDate = updateData.startDate ? new Date(updateData.startDate) : request.startDate;
    const endDate = updateData.endDate ? new Date(updateData.endDate) : request.endDate;
    const halfDay = updateData.halfDay !== undefined ? updateData.halfDay : request.halfDay;
    const totalDays = this.calculateLeaveDays(startDate, endDate, halfDay);
    
    updateFields.push(`total_days = $${paramIndex}`);
    params.push(totalDays);
    paramIndex++;
    
    updateFields.push(`updated_at = $${paramIndex}`);
    params.push(new Date());
    paramIndex++;

    params.push(id);

    try {
      const result = await pool.query(`
        UPDATE leave_requests 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `, params);

      const updatedRequest = this.mapRowToLeaveRequest(result.rows[0]);

      // Log activity
      await activityService.logActivity(
        userId,
        'leave_request_updated',
        `Updated leave request for ${totalDays} days`,
        userId
      );

      return updatedRequest;
    } catch (error) {
      console.error('Error updating leave request:', error);
      throw error;
    }
  }

  async cancelLeaveRequest(id: string, userId: string): Promise<LeaveRequest> {
    const request = await this.getLeaveRequestById(id);
    if (!request) {
      throw new Error('Leave request not found');
    }

    if (request.userId !== userId) {
      throw new Error('Unauthorized to cancel this leave request');
    }

    if (request.status === 'cancelled') {
      throw new Error('Leave request is already cancelled');
    }

    const oldStatus = request.status;
    
    try {
      const result = await pool.query(`
        UPDATE leave_requests 
        SET status = 'cancelled', updated_at = $1
        WHERE id = $2
        RETURNING *
      `, [new Date(), id]);

      const cancelledRequest = this.mapRowToLeaveRequest(result.rows[0]);

      // Update leave balance
      const year = request.startDate.getFullYear();
      if (oldStatus === 'pending') {
        await this.updateLeaveBalance(userId, request.leaveTypeId, year, -request.totalDays, 'pending');
      } else if (oldStatus === 'approved') {
        await this.updateLeaveBalance(userId, request.leaveTypeId, year, -request.totalDays, 'used');
      }

      // Log activity
      await activityService.logActivity(
        userId,
        'leave_request_cancelled',
        `Cancelled leave request for ${request.totalDays} days`,
        userId
      );

      return cancelledRequest;
    } catch (error) {
      console.error('Error cancelling leave request:', error);
      throw error;
    }
  }

  // Leave Request Review - Fixed to use database
  async reviewLeaveRequest(
    id: string, 
    reviewerId: string, 
    reviewData: ReviewLeaveRequestRequest
  ): Promise<LeaveRequest> {
    const request = await this.getLeaveRequestById(id);
    if (!request) {
      throw new Error('Leave request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Can only review pending leave requests');
    }

    try {
      const result = await pool.query(`
        UPDATE leave_requests 
        SET status = $1, reviewed_at = $2, reviewed_by = $3, reviewer_comments = $4, updated_at = $5
        WHERE id = $6
        RETURNING *
      `, [reviewData.status, new Date(), reviewerId, reviewData.comments, new Date(), id]);

      const reviewedRequest = this.mapRowToLeaveRequest(result.rows[0]);

      // Update leave balance
      const year = request.startDate.getFullYear();
      if (reviewData.status === 'approved') {
        // Move from pending to used
        await this.updateLeaveBalance(request.userId, request.leaveTypeId, year, -request.totalDays, 'pending');
        await this.updateLeaveBalance(request.userId, request.leaveTypeId, year, request.totalDays, 'used');
      } else if (reviewData.status === 'rejected') {
        // Remove from pending
        await this.updateLeaveBalance(request.userId, request.leaveTypeId, year, -request.totalDays, 'pending');
      }

      // Log activity
      await activityService.logActivity(
        reviewerId,
        'leave_request_reviewed',
        `${reviewData.status === 'approved' ? 'Approved' : 'Rejected'} leave request`,
        reviewerId
      );

      // Send notifications
      await this.sendLeaveRequestNotifications(reviewedRequest, reviewData.status);

      return reviewedRequest;
    } catch (error) {
      console.error('Error reviewing leave request:', error);
      throw error;
    }
  }

  // Leave Balance Management - Fixed to use database
  async getLeaveBalance(
    userId: string, 
    leaveTypeId: string, 
    year: number
  ): Promise<LeaveBalance | null> {
    try {
      const result = await pool.query(`
        SELECT * FROM leave_balances 
        WHERE user_id = $1 AND leave_type_id = $2 AND year = $3
      `, [userId, leaveTypeId, year]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToLeaveBalance(result.rows[0]);
    } catch (error) {
      console.error('Error fetching leave balance:', error);
      throw error;
    }
  }

  async getUserLeaveBalances(
    userId: string, 
    year?: number
  ): Promise<LeaveBalanceWithType[]> {
    const currentYear = year || new Date().getFullYear();
    
    try {
      const result = await pool.query(`
        SELECT 
          lb.*,
          lt.id as leave_type_id,
          lt.name as leave_type_name,
          lt.description as leave_type_description,
          lt.max_days_per_year as leave_type_max_days_per_year,
          lt.requires_approval as leave_type_requires_approval,
          lt.requires_documentation as leave_type_requires_documentation,
          lt.advance_notice_days as leave_type_advance_notice_days,
          lt.is_active as leave_type_is_active,
          lt.created_at as leave_type_created_at,
          lt.updated_at as leave_type_updated_at
        FROM leave_balances lb
        LEFT JOIN leave_types lt ON lb.leave_type_id = lt.id
        WHERE lb.user_id = $1 AND lb.year = $2
        ORDER BY lb.leave_type_id
      `, [userId, currentYear]);
      
      return result.rows.map(row => this.mapRowToLeaveBalanceWithType(row));
    } catch (error) {
      console.error('Error fetching user leave balances:', error);
      throw error;
    }
  }

  async initializeLeaveBalances(userId: string, year: number): Promise<void> {
    const leaveTypes = await this.getAllLeaveTypes();
    
    for (const leaveType of leaveTypes) {
      const existingBalance = await this.getLeaveBalance(userId, leaveType.id, year);
      
      if (!existingBalance && leaveType.maxDaysPerYear) {
        try {
          // Remove the generateId() method entirely and update the INSERT query to:
          await pool.query(`
            INSERT INTO leave_balances (
              user_id, leave_type_id, year, allocated_days, used_days,
              pending_days, carried_forward_days, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            userId, leaveType.id, year, leaveType.maxDaysPerYear,
            0, 0, 0, new Date(), new Date()
          ]);
        } catch (error) {
          console.error('Error initializing leave balance:', error);
          throw error;
        }
      }
    }
  }

  private async updateLeaveBalance(
    userId: string, 
    leaveTypeId: string, 
    year: number, 
    days: number, 
    type: 'pending' | 'used'
  ): Promise<void> {
    let balance = await this.getLeaveBalance(userId, leaveTypeId, year);
    
    if (!balance) {
      // Initialize balance if it doesn't exist
      await this.initializeLeaveBalances(userId, year);
      balance = await this.getLeaveBalance(userId, leaveTypeId, year);
    }
    
    if (balance) {
      try {
        let updateField = '';
        if (type === 'pending') {
          updateField = 'pending_days';
        } else if (type === 'used') {
          updateField = 'used_days';
        }

        // Add validation to prevent negative values
        const currentValue = type === 'pending' ? balance.pendingDays : balance.usedDays;
        const newValue = currentValue + days;
        
        if (newValue < 0) {
          console.warn(`Attempted to set ${updateField} to negative value (${newValue}) for user ${userId}`);
          // Set to 0 instead of allowing negative values
          await pool.query(`
            UPDATE leave_balances 
            SET ${updateField} = 0,
                updated_at = $1
            WHERE id = $2
          `, [new Date(), balance.id]);
        } else {
          await pool.query(`
            UPDATE leave_balances 
            SET ${updateField} = ${updateField} + $1,
                updated_at = $2
            WHERE id = $3
          `, [days, new Date(), balance.id]);
        }
      } catch (error) {
        console.error('Error updating leave balance:', error);
        throw error;
      }
    }
  }

  // Utility Methods
  private calculateLeaveDays(startDate: Date, endDate: Date, halfDay: boolean = false): number {
    let totalDays = 0;
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      // Only count weekdays (Monday = 1, Sunday = 0)
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        totalDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return halfDay ? totalDays / 2 : totalDays;
  }

  private async checkOverlappingRequests(
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<LeaveRequest[]> {
    try {
      const result = await pool.query(`
        SELECT * FROM leave_requests 
        WHERE user_id = $1 
        AND status NOT IN ('rejected', 'cancelled')
        AND (
          (start_date <= $2 AND end_date >= $2) OR
          (start_date <= $3 AND end_date >= $3) OR
          (start_date >= $2 AND end_date <= $3)
        )
      `, [userId, startDate, endDate]);
      
      return result.rows.map(row => this.mapRowToLeaveRequest(row));
    } catch (error) {
      console.error('Error checking overlapping requests:', error);
      throw error;
    }
  }

  private async sendLeaveRequestNotifications(
    request: LeaveRequest, 
    action: 'submitted' | 'approved' | 'rejected'
  ): Promise<void> {
    const leaveType = await this.getLeaveTypeById(request.leaveTypeId);
    
    if (action === 'submitted') {
      // Get user's manager for notification
      const userResult = await pool.query(
        'SELECT manager_id FROM users WHERE id = $1',
        [request.userId]
      );
      
      if (userResult.rows.length > 0 && userResult.rows[0].manager_id) {
        const managerId = userResult.rows[0].manager_id;
        
        // Notify manager about new leave request
        await notificationService.sendNotification({
          userId: managerId,
          type: 'leave_request_submitted',
          title: 'New Leave Request',
          message: `A new ${leaveType?.name} request has been submitted`,
          metadata: {
            leaveRequestId: request.id,
            startDate: request.startDate.toISOString(),
            endDate: request.endDate.toISOString(),
            totalDays: request.totalDays,
            employeeId: request.userId
          }
        });
      }
    } else {
      // Notify employee about review decision
      await notificationService.sendNotification({
        userId: request.userId,
        type: `leave_request_${action}`,
        title: `Leave Request ${action === 'approved' ? 'Approved' : 'Rejected'}`,
        message: `Your ${leaveType?.name} request has been ${action}`,
        metadata: {
          leaveRequestId: request.id,
          reviewerComments: request.reviewerComments
        }
      });
    }
  }

  private generateId(): string {
    // Use crypto.randomUUID() for proper UUID v4 generation
    return crypto.randomUUID();
  }

  // Statistics and Reporting - Fixed to use database
  async getLeaveStatistics(
    userId?: string, 
    year?: number
  ): Promise<LeaveStatistics> {
    const currentYear = year || new Date().getFullYear();
    
    try {
      let query = `
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_requests,
          COALESCE(SUM(total_days), 0) as total_days_requested,
          COALESCE(SUM(CASE WHEN status = 'approved' THEN total_days ELSE 0 END), 0) as total_days_approved,
          COALESCE(AVG(total_days), 0) as average_request_days
        FROM leave_requests 
        WHERE EXTRACT(YEAR FROM start_date) = $1
      `;
      
      const params: any[] = [currentYear];
      
      if (userId) {
        query += ' AND user_id = $2';
        params.push(userId); // Keep as string for UUID
      }
      
      // Removed GROUP BY leave_type_id as we are now getting overall statistics
      
      const result = await pool.query(query, params);
      
      // The query now returns a single aggregated row, so we can directly use result.rows[0]
      const row = result.rows[0];
      
      return {
        totalRequests: parseInt(row.total_requests),
        pendingRequests: parseInt(row.pending_requests),
        approvedRequests: parseInt(row.approved_requests),
        rejectedRequests: parseInt(row.rejected_requests),
        totalDaysRequested: parseInt(row.total_days_requested),
        totalDaysApproved: parseInt(row.total_days_approved),
        averageRequestDays: parseFloat(row.average_request_days),
        mostRequestedLeaveType: '' // Cannot determine from this aggregated query
      };
    } catch (error) {
      console.error('Error fetching leave statistics:', error);
      throw error;
    }
  }

  async getUserLeaveOverview(userId: string): Promise<UserLeaveOverview> {
    const currentYear = new Date().getFullYear();
    const balances = await this.getUserLeaveBalances(userId, currentYear);
    
    try {
      const result = await pool.query(`
        SELECT * FROM leave_requests 
        WHERE user_id = $1 
        ORDER BY submitted_at DESC 
        LIMIT 5
      `, [userId]);
      
      const recentRequests = result.rows.map(row => this.mapRowToLeaveRequest(row));
      const statistics = await this.getLeaveStatistics(userId, currentYear);
      
      return {
        user: {
          id: userId,
          firstName: '', // Would be populated from user service
          lastName: '',
          email: ''
        },
        balances,
        recentRequests,
        statistics: {
          totalRequestsThisYear: statistics.totalRequests,
          totalDaysUsedThisYear: statistics.totalDaysApproved,
          pendingRequests: statistics.pendingRequests
        }
      };
    } catch (error) {
      console.error('Error fetching user leave overview:', error);
      throw error;
    }
  }

  /**
   * Check if user has approved leave on a specific date - Fixed to use database
   */
  async hasApprovedLeaveOnDate(userId: string, date: Date): Promise<{
    hasLeave: boolean;
    leaveRequest?: LeaveRequest;
    leaveType?: LeaveType;
  }> {
    const dateString = date.toISOString().split('T')[0];
    const checkDate = new Date(dateString);
    
    try {
      const result = await pool.query(`
        SELECT * FROM leave_requests 
        WHERE user_id = $1 
        AND status = 'approved' 
        AND start_date <= $2 
        AND end_date >= $2
        LIMIT 1
      `, [userId, checkDate]);
      
      if (result.rows.length > 0) {
        const approvedLeave = this.mapRowToLeaveRequest(result.rows[0]);
        const leaveType = await this.getLeaveTypeById(approvedLeave.leaveTypeId);
        
        return {
          hasLeave: true,
          leaveRequest: approvedLeave,
          leaveType: leaveType || undefined
        };
      }

      return { hasLeave: false };
    } catch (error) {
      console.error('Error checking approved leave on date:', error);
      throw error;
    }
  }

  /**
   * Get leave request history for audit trail - Fixed to use database
   */
  async getLeaveRequestHistory(
    leaveRequestId: string
  ): Promise<LeaveRequestHistory[]> {
    try {
      const result = await pool.query(`
        SELECT * FROM leave_request_history 
        WHERE leave_request_id = $1 
        ORDER BY created_at DESC
      `, [leaveRequestId]);
      
      return result.rows.map(row => this.mapRowToLeaveHistory(row));
    } catch (error) {
      console.error('Error fetching leave request history:', error);
      throw error;
    }
  }

  /**
   * Get all leave request history for a user - Fixed to use database
   */
  async getUserLeaveHistory(userId: string, filters: any = {}): Promise<LeaveRequestHistory[]> {
    try {
      let query = `
        SELECT lrh.*, lr.user_id
        FROM leave_request_history lrh
        JOIN leave_requests lr ON lrh.leave_request_id = lr.id
        WHERE lr.user_id = $1
      `;
      const params = [userId];
      let paramIndex = 2;
      
      if (filters.startDate) {
        query += ` AND lrh.created_at >= $${paramIndex}`;
        // Convert to ISO string if it's a Date object, otherwise use as-is
        params.push(filters.startDate instanceof Date ? filters.startDate.toISOString() : filters.startDate);
        paramIndex++;
      }
      if (filters.endDate) {
        query += ` AND lrh.created_at <= $${paramIndex}`;
        // Convert to ISO string if it's a Date object, otherwise use as-is
        params.push(filters.endDate instanceof Date ? filters.endDate.toISOString() : filters.endDate);
        paramIndex++;
      }
      if (filters.action) {
        query += ` AND lrh.action = $${paramIndex}`;
        params.push(filters.action);
        paramIndex++;
      }
      
      query += ' ORDER BY lrh.created_at DESC';
      
      const result = await pool.query(query, params);
      return result.rows.map(row => this.mapRowToLeaveHistory(row));
    } catch (error) {
      console.error('Error fetching user leave history:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive audit trail for managers/admins - Fixed to use database
   */
  async getAuditTrail(
    filters: {
      userId?: string;
      performedBy?: string;
      action?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedLeaveResponse<LeaveRequestHistory & { leaveRequest?: LeaveRequest }>> {
    try {
      let query = `
        SELECT lrh.*, lr.* as leave_request
        FROM leave_request_history lrh
        LEFT JOIN leave_requests lr ON lrh.leave_request_id = lr.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;
      
      if (filters.userId) {
        query += ` AND lr.user_id = $${paramIndex}`;
        params.push(filters.userId);
        paramIndex++;
      }
      if (filters.performedBy) {
        query += ` AND lrh.performed_by = $${paramIndex}`;
        params.push(filters.performedBy);
        paramIndex++;
      }
      if (filters.action) {
        query += ` AND lrh.action = $${paramIndex}`;
        params.push(filters.action);
        paramIndex++;
      }
      if (filters.startDate) {
        query += ` AND lrh.created_at >= $${paramIndex}`;
        params.push(filters.startDate);
        paramIndex++;
      }
      if (filters.endDate) {
        query += ` AND lrh.created_at <= $${paramIndex}`;
        params.push(filters.endDate);
        paramIndex++;
      }
      
      // Count total records
      const countQuery = query.replace('SELECT lrh.*, lr.* as leave_request', 'SELECT COUNT(*)');
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);
      
      // Add sorting and pagination
      query += ' ORDER BY lrh.created_at DESC';
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, (page - 1) * limit);
      
      const result = await pool.query(query, params);
      
      const data = result.rows.map(row => ({
        ...this.mapRowToLeaveHistory(row),
        leaveRequest: row.leave_request ? this.mapRowToLeaveRequest(row) : undefined
      }));
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        data,
        total,
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      };
    } catch (error) {
      console.error('Error fetching audit trail:', error);
      throw error;
    }
  }
}

export const leaveManagementService = new LeaveManagementService();