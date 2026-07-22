import { 
  ApprovalDelegation, 
  CreateDelegationRequest,
  UpdateDelegationRequest,
  DelegationFilters,
  PaginatedDelegationResponse,
  DelegationHistory
} from '../types/leave';
import { notificationService } from './notificationService';
import { activityService } from './activityService';

class DelegationService {
  private delegations: ApprovalDelegation[] = [];
  private delegationHistory: DelegationHistory[] = [];

  // Get all delegations with filters
  async getDelegations(
    filters: DelegationFilters = {},
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedDelegationResponse<ApprovalDelegation>> {
    let filteredDelegations = [...this.delegations];

    // Apply filters
    if (filters.delegatorId) {
      filteredDelegations = filteredDelegations.filter(d => d.delegatorId === filters.delegatorId);
    }
    if (filters.delegateId) {
      filteredDelegations = filteredDelegations.filter(d => d.delegateId === filters.delegateId);
    }
    if (filters.delegationType) {
      filteredDelegations = filteredDelegations.filter(d => d.delegationType === filters.delegationType);
    }
    if (filters.isActive !== undefined) {
      filteredDelegations = filteredDelegations.filter(d => d.isActive === filters.isActive);
    }
    if (filters.startDate) {
      filteredDelegations = filteredDelegations.filter(d => 
        d.startDate >= new Date(filters.startDate!)
      );
    }
    if (filters.endDate) {
      filteredDelegations = filteredDelegations.filter(d => 
        d.endDate && new Date(d.endDate) <= new Date(filters.endDate!)
      );
    }

    const total = filteredDelegations.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const data = filteredDelegations.slice(startIndex, endIndex);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  // Get delegation by ID
  async getDelegationById(id: string): Promise<ApprovalDelegation | null> {
    return this.delegations.find(d => d.id === id) || null;
  }

  // Create new delegation
  async createDelegation(
    delegatorId: string,
    delegationData: CreateDelegationRequest
  ): Promise<ApprovalDelegation> {
    // Validate dates
    const startDate = new Date(delegationData.startDate);
    if (delegationData.endDate) {
      const endDate = new Date(delegationData.endDate);
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }
    }

    // Check for overlapping delegations
    const overlapping = await this.checkOverlappingDelegations(
      delegatorId,
      startDate,
      delegationData.endDate ? new Date(delegationData.endDate) : new Date('2099-12-31')
    );

    if (overlapping.length > 0) {
      throw new Error('Delegation period overlaps with existing delegation');
    }

    const delegation: ApprovalDelegation = {
      id: this.generateId(),
      delegatorId,
      delegateId: delegationData.delegateId,
      delegationType: delegationData.delegationType,
      startDate: new Date(delegationData.startDate),
      endDate: delegationData.endDate ? new Date(delegationData.endDate) : undefined,
      isActive: true,
      reason: delegationData.reason,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.delegations.push(delegation);

    // Log creation
    await this.logDelegationHistory(delegation.id, delegatorId, 'created');

    // Send notifications
    await this.sendDelegationNotifications(delegation, 'created');

    return delegation;
  }

  // Update delegation
  async updateDelegation(
    id: string,
    userId: string,
    updateData: UpdateDelegationRequest
  ): Promise<ApprovalDelegation> {
    const delegation = await this.getDelegationById(id);
    if (!delegation) {
      throw new Error('Delegation not found');
    }

    // Only delegator can update
    if (delegation.delegatorId !== userId) {
      throw new Error('Only the delegator can update this delegation');
    }

    const oldData = { ...delegation };

    // Update fields
    if (updateData.delegateId) {
      delegation.delegateId = updateData.delegateId;
    }
    if (updateData.startDate) {
      delegation.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      delegation.endDate = new Date(updateData.endDate);
    }
    if (updateData.reason) {
      delegation.reason = updateData.reason;
    }
    if (updateData.isActive !== undefined) {
      delegation.isActive = updateData.isActive;
    }

    delegation.updatedAt = new Date();

    // Log history
    await this.logDelegationHistory(delegation.id, userId, 'updated', {
      oldData,
      newData: delegation
    });

    return delegation;
  }

  // Deactivate delegation
  async deactivateDelegation(id: string, userId: string): Promise<ApprovalDelegation> {
    const delegation = await this.getDelegationById(id);
    if (!delegation) {
      throw new Error('Delegation not found');
    }

    // Only delegator can deactivate
    if (delegation.delegatorId !== userId) {
      throw new Error('Only the delegator can deactivate this delegation');
    }

    delegation.isActive = false;
    delegation.updatedAt = new Date();

    // Log history
    await this.logDelegationHistory(delegation.id, userId, 'deactivated');

    // Send notifications
    await this.sendDelegationNotifications(delegation, 'deactivated');

    return delegation;
  }

  // Get active delegate for a user
  async getActiveDelegate(userId: string): Promise<string | null> {
    const now = new Date();
    const activeDelegation = this.delegations.find(d => 
      d.delegatorId === userId &&
      d.isActive &&
      new Date(d.startDate) <= now &&
            (!d.endDate || new Date(d.endDate) >= now)
    );

    return activeDelegation ? activeDelegation.delegateId : null;
  }

  // Get delegations where user is delegate
  async getDelegationsAsDelegate(userId: string): Promise<ApprovalDelegation[]> {
    const now = new Date();
    return this.delegations.filter(d => 
      d.delegateId === userId &&
      d.isActive &&
      new Date(d.startDate) <= now &&
      (!d.endDate || new Date(d.endDate) >= now)
    );
  }

  // Get active delegations
  async getActiveDelegations(userId: string): Promise<ApprovalDelegation[]> {
    const now = new Date();
    return this.delegations.filter(d => 
      d.delegatorId === userId && 
      d.isActive && 
      d.startDate <= now && 
      (!d.endDate || d.endDate >= now)
    );
  }

  // Get delegation history
  async getDelegationHistory(delegationId: string): Promise<DelegationHistory[]> {
    return this.delegationHistory.filter(h => h.delegationId === delegationId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Private helper methods
  private async checkOverlappingDelegations(
    delegatorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ApprovalDelegation[]> {
    return this.delegations.filter(d => 
      d.delegatorId === delegatorId &&
      d.isActive &&
      (
        (new Date(d.startDate) <= startDate && (!d.endDate || new Date(d.endDate)) >= startDate) ||
        (new Date(d.startDate) <= endDate && (!d.endDate || new Date(d.endDate)) >= endDate) ||
        (new Date(d.startDate) >= startDate && (!d.endDate || new Date(d.endDate)) <= endDate)
      )
    );
  }

  private async logDelegationHistory(
    delegationId: string,
    performedBy: string,
    action: 'created' | 'activated' | 'deactivated' | 'extended' | 'terminated' | 'updated',
    details?: any
  ): Promise<void> {
    const historyEntry: DelegationHistory = {
      id: this.generateId(),
      delegationId,
      action,
      performedBy,
      reason: details?.reason,
      createdAt: new Date()
    };

    this.delegationHistory.push(historyEntry);

    // Log activity
    await activityService.logActivity(
      performedBy,
      `delegation_${action}`,
      JSON.stringify({
        delegationId,
        ...details
      }),
      performedBy
    );
  }

  private async sendDelegationNotifications(
    delegation: ApprovalDelegation,
    action: 'created' | 'deactivated'
  ): Promise<void> {
    try {
      // Notify delegate
      await notificationService.sendNotification({
        userId: delegation.delegateId,
        type: action === 'created' ? 'delegation_assigned' : 'delegation_removed',
        title: action === 'created' ? 'Approval Authority Delegated' : 'Approval Authority Removed',
        message: action === 'created' 
          ? `You have been assigned approval authority from ${delegation.delegatorId}` 
          : `Your approval authority from ${delegation.delegatorId} has been removed`,
        data: {
          delegationId: delegation.id,
          delegatorId: delegation.delegatorId,
          delegationType: delegation.delegationType
        }
      });

      // Notify delegator
      await notificationService.sendNotification({
        userId: delegation.delegatorId,
        type: action === 'created' ? 'delegation_created' : 'delegation_deactivated',
        title: action === 'created' ? 'Delegation Created' : 'Delegation Deactivated',
        message: action === 'created'
          ? `Approval authority delegated to ${delegation.delegateId}`
          : `Delegation to ${delegation.delegateId} has been deactivated`,
        data: {
          delegationId: delegation.id,
          delegateId: delegation.delegateId,
          delegationType: delegation.delegationType
        }
      });
    } catch (error) {
      console.error('Failed to send delegation notifications:', error);
    }
  }

  private generateId(): string {
    return 'del_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
}

export const delegationService = new DelegationService();