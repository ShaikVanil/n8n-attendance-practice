import api from './api';
import {
  ApprovalDelegation,
  CreateDelegationRequest,
  UpdateDelegationRequest,
  DelegationFilters,
  PaginatedDelegationResponse
} from '../types/leave';

export class DelegationService {
  // Get user's delegations
  static async getMyDelegations(): Promise<{ data: ApprovalDelegation[] }> {
    const response = await api.get('/delegations/my');
    return response.data;
  }

  // Get all delegations (admin/manager)
  static async getDelegations(
    filters: DelegationFilters = {},
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedDelegationResponse<ApprovalDelegation>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      )
    });
    
    const response = await api.get(`/delegations?${params.toString()}`);
    return response.data;
  }

  // Create delegation
  static async createDelegation(data: CreateDelegationRequest): Promise<ApprovalDelegation> {
    const response = await api.post('/delegations', data);
    return response.data.delegation;
  }

  // Update delegation
  static async updateDelegation(
    id: string, 
    data: UpdateDelegationRequest
  ): Promise<ApprovalDelegation> {
    const response = await api.put(`/delegations/${id}`, data);
    return response.data.delegation;
  }

  // Deactivate delegation
  static async deactivateDelegation(id: string): Promise<ApprovalDelegation> {
    const response = await api.put(`/delegations/${id}/deactivate`);
    return response.data.delegation;
  }

  // Get delegations where user is delegate
  static async getDelegationsAsDelegate(): Promise<{ data: ApprovalDelegation[] }> {
    const response = await api.get('/delegations/as-delegate');
    return response.data;
  }
}

export const delegationService = DelegationService;