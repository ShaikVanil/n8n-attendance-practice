import api from './api';

export interface DataRetentionPolicy {
  id?: string;
  data_type: string;
  retention_period_days: number;
  description?: string;
  legal_basis?: string;
  auto_delete: boolean;
  is_active: boolean;
  created_by?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface RetentionExecution {
  id: string;
  policy_id: string;
  execution_date: Date;
  records_processed: number;
  records_deleted: number;
  execution_status: 'running' | 'completed' | 'failed' | 'cancelled';
  error_message?: string;
  execution_duration_seconds?: number;
}

export interface RetentionStatistics {
  totalPolicies: number;
  activePolicies: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalRecordsDeleted: number;
  lastExecutionDate?: Date;
}

class DataRetentionService {
  async getPolicies(filters?: any) {
    const response = await api.get('/data-retention/policies', { params: filters });
    return response.data;
  }

  async createPolicy(policy: Omit<DataRetentionPolicy, 'id'>) {
    const response = await api.post('/data-retention/policies', policy);
    return response.data;
  }

  async updatePolicy(id: string, updates: Partial<DataRetentionPolicy>) {
    const response = await api.put(`/data-retention/policies/${id}`, updates);
    return response.data;
  }

  async deletePolicy(id: string) {
    const response = await api.delete(`/data-retention/policies/${id}`);
    return response.data;
  }

  async executePolicy(id: string) {
    const response = await api.post(`/data-retention/policies/${id}/execute`);
    return response.data;
  }

  async executeAllPolicies() {
    const response = await api.post('/data-retention/execute-all');
    return response.data;
  }

  async getExecutions(policyId?: string, page?: number, limit?: number) {
    const params: any = {};
    if (policyId) params.policy_id = policyId;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    
    const response = await api.get('/data-retention/executions', { params });
    return response.data;
  }

  async getStatistics() {
    const response = await api.get('/data-retention/statistics');
    return response.data;
  }

  async initializeDefaults() {
    const response = await api.post('/data-retention/initialize-defaults');
    return response.data;
  }
}

export const dataRetentionService = new DataRetentionService();