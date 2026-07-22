import api from './api';

export interface GracePeriodConfig {
  id: string;
  officeId: string;
  checkInGrace: number; // minutes
  checkOutGrace: number; // minutes
  breakGrace: number; // minutes
  isActive: boolean;
}

export interface GracePeriodException {
  id: string;
  userId: string;
  officeId?: string;
  type: 'temporary' | 'permanent';
  graceType: 'check_in' | 'check_out' | 'break' | 'all';
  gracePeriod: number; // minutes
  validFrom: string; // ISO date
  validTo?: string; // ISO date
  reason: string;
  createdBy: string;
  isActive: boolean;
  status: 'pending' | 'approved' | 'rejected'; // Add approval status
  reviewedBy?: string; // Add reviewer info
  reviewedAt?: string; // Add review timestamp
  reviewerComments?: string; // Add reviewer comments
  createdAt: string;
  updatedAt: string;
}

export interface CreateGracePeriodExceptionRequest {
  userId: string;
  officeId?: string;
  type: 'temporary' | 'permanent';
  graceType: 'check_in' | 'check_out' | 'break' | 'all';
  gracePeriod: number;
  validFrom: string;
  validTo?: string;
  reason: string;
}

export interface UpdateGracePeriodConfigRequest {
  checkInGrace?: number;
  checkOutGrace?: number;
  breakGrace?: number;
  isActive?: boolean;
}

export interface UpdateGracePeriodExceptionRequest {
  type?: 'temporary' | 'permanent';
  graceType?: 'check_in' | 'check_out' | 'break' | 'all';
  gracePeriod?: number;
  validFrom?: string;
  validTo?: string;
  reason?: string;
  isActive?: boolean;
  status?: 'pending' | 'approved' | 'rejected'; // Add status update
  reviewerComments?: string; // Add reviewer comments
}

export interface GracePeriodExceptionFilters {
  userId?: string;
  officeId?: string;
  isActive?: boolean;
  status?: 'pending' | 'approved' | 'rejected'; // Add status filter
}

export class GracePeriodService {
  // Grace Period Configurations
  static async getGracePeriodConfigs(): Promise<GracePeriodConfig[]> {
    const response = await api.get('/system/grace-period-configs');
    return response.data;
  }

  static async getGracePeriodConfigByOffice(officeId: string): Promise<GracePeriodConfig> {
    const response = await api.get(`/system/grace-period-configs/${officeId}`);
    return response.data;
  }

  static async updateGracePeriodConfig(
    officeId: string, 
    config: UpdateGracePeriodConfigRequest
  ): Promise<GracePeriodConfig> {
    const response = await api.put(`/system/grace-period-configs/${officeId}`, config);
    return response.data;
  }

  // Grace Period Exceptions
  static async getGracePeriodExceptions(
    filters?: GracePeriodExceptionFilters
  ): Promise<GracePeriodException[]> {
    const response = await api.get('/system/grace-period-exceptions', { params: filters });
    return response.data;
  }

  static async createGracePeriodException(
    exceptionData: CreateGracePeriodExceptionRequest
  ): Promise<GracePeriodException> {
    const response = await api.post('/system/grace-period-exceptions', exceptionData);
    return response.data;
  }

  static async updateGracePeriodException(
    id: string, 
    exceptionData: UpdateGracePeriodExceptionRequest
  ): Promise<GracePeriodException> {
    const response = await api.put(`/system/grace-period-exceptions/${id}`, exceptionData);
    return response.data;
  }

  static async deleteGracePeriodException(id: string): Promise<void> {
    await api.delete(`/system/grace-period-exceptions/${id}`);
  }

  // Utility Methods
  static async getEffectiveGracePeriod(
    userId: string, 
    officeId: string, 
    graceType: 'check_in' | 'check_out' | 'break',
    date?: string
  ): Promise<number> {
    const params = { userId, officeId, graceType, date };
    const response = await api.get('/system/grace-period-effective', { params });
    return response.data.gracePeriod;
  }

  // Add new method for approval workflow
  static async reviewGracePeriodException(
    id: string,
    reviewData: {
      status: 'approved' | 'rejected';
      reviewerComments?: string;
    }
  ): Promise<GracePeriodException> {
    const response = await api.put(`/system/grace-period-exceptions/${id}/review`, reviewData);
    return response.data;
  }
}