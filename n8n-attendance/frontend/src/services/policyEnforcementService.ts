import api from './api';

export interface PolicyViolation {
  id: string;
  userId: string;
  attendanceId?: string;
  breakId?: string;
  violationType: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'dismissed' | 'resolved';
  detectedAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  dismissedAt?: string;
  dismissedBy?: string;
  dismissalReason?: string;
  createdAt: string;
  updatedAt: string;
  user_name?: string;
  user_email?: string;
  employee_id?: string;
}

export interface EscalationAction {
  id: string;
  userId: string;
  violationId: string;
  escalationRuleId: string;
  escalationLevel: number;
  actionType: 'warning' | 'notification' | 'manager_alert' | 'hr_alert' | 'disciplinary';
  actionDetails: Record<string, any>;
  triggeredAt: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  executedAt?: string;
  executedBy?: string;
  errorMessage?: string;
  user_name?: string;
  user_email?: string;
  employee_id?: string;
  violation_type?: string;
  violation_description?: string;
}

export interface DisciplinaryAction {
  id: string;
  employeeId: string;
  escalationActionId?: string;
  violationType: string;
  escalationLevel: number;
  actionType: 'verbal_warning' | 'written_warning' | 'final_warning' | 'suspension' | 'termination';
  description: string;
  initiatedBy: string;
  initiatedAt: string;
  status: 'pending' | 'active' | 'completed' | 'appealed' | 'overturned';
  effectiveDate?: string;
  expiryDate?: string;
  appealDeadline?: string;
  employee_name?: string;
  employee_email?: string;
  initiated_by_name?: string;
}

export interface GracePeriodApplication {
  id: string;
  userId: string;
  attendanceId?: string;
  breakId?: string;
  applicationType: 'check_in' | 'check_out' | 'break_start' | 'break_end';
  originalTime: string;
  adjustedTime: string;
  graceMinutes: number;
  graceSource: 'config' | 'exception';
  graceConfigId?: string;
  graceExceptionId?: string;
  reason: string;
  appliedBy: 'system' | 'manual';
  createdAt: string;
  user_name?: string;
  user_email?: string;
}

export interface EscalationRule {
  id: string;
  policyTemplateId: string;
  violationType: string;
  occurrenceThreshold: number;
  timeWindowDays: number;
  escalationLevel: number;
  actionType: 'warning' | 'notification' | 'manager_alert' | 'hr_alert' | 'disciplinary';
  actionConfig: Record<string, any>;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnforcementResult {
  isCompliant: boolean;
  violations: PolicyViolation[];
  warnings: any[];
  gracePeriodsApplied: GracePeriodApplication[];
  escalationsTriggered: EscalationAction[];
}

export interface EscalationStatistics {
  totalEscalations: number;
  escalationsByLevel: Record<number, number>;
  escalationsByType: Record<string, number>;
  disciplinaryActions: number;
  pendingEscalations: number;
}

export interface EnforcementStatistics {
  totalViolations: number;
  violationsByType: Record<string, number>;
  violationsBySeverity: Record<string, number>;
  escalationsTriggered: number;
  gracePeriodsApplied: number;
  complianceRate: number;
}

export interface ViolationFilters {
  userId?: string;
  violationType?: string;
  severity?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface EscalationFilters {
  userId?: string;
  escalationLevel?: number;
  actionType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface DisciplinaryFilters {
  employeeId?: string;
  actionType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class PolicyEnforcementService {
  // Enforce policy for specific attendance record
  static async enforceAttendancePolicy(attendanceId: string, userId: string): Promise<EnforcementResult> {
    const response = await api.post(`/policy-enforcement/enforce/${attendanceId}`, { userId });
    return response.data;
  }

  // Get violations for a user
  static async getViolationsForUser(userId: string, startDate?: string, endDate?: string): Promise<PolicyViolation[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await api.get(`/policy-enforcement/violations/user/${userId}?${params}`);
    return response.data;
  }

  // Get all violations with filters
  static async getViolations(filters?: ViolationFilters): Promise<PaginatedResponse<PolicyViolation>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await api.get(`/policy-enforcement/violations?${params}`);
    return {
      data: response.data.violations,
      pagination: response.data.pagination
    };
  }

  // Acknowledge a violation
  static async acknowledgeViolation(violationId: string, notes?: string): Promise<void> {
    await api.post(`/policy-enforcement/violations/${violationId}/acknowledge`, { notes });
  }

  // Dismiss a violation
  static async dismissViolation(violationId: string, reason: string): Promise<void> {
    await api.post(`/policy-enforcement/violations/${violationId}/dismiss`, { reason });
  }

  // Create escalation rule
  static async createEscalationRule(ruleData: Omit<EscalationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<EscalationRule> {
    const response = await api.post('/policy-enforcement/escalation-rules', ruleData);
    return response.data;
  }

  // Get escalation actions with filters
  static async getEscalations(filters?: EscalationFilters): Promise<PaginatedResponse<EscalationAction>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await api.get(`/policy-enforcement/escalations?${params}`);
    return {
      data: response.data.escalations,
      pagination: response.data.pagination
    };
  }

  // Get disciplinary actions
  static async getDisciplinaryActions(filters?: DisciplinaryFilters): Promise<DisciplinaryAction[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await api.get(`/policy-enforcement/disciplinary-actions?${params}`);
    return response.data;
  }

  // Get grace period applications for a user
  static async getGracePeriodsForUser(userId: string, startDate?: string, endDate?: string): Promise<GracePeriodApplication[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await api.get(`/policy-enforcement/grace-periods/user/${userId}?${params}`);
    return response.data;
  }

  // Get escalation statistics
  static async getEscalationStatistics(startDate: string, endDate: string): Promise<EscalationStatistics> {
    const params = new URLSearchParams({
      startDate,
      endDate
    });
    
    const response = await api.get(`/policy-enforcement/statistics/escalations?${params}`);
    return response.data;
  }

  // Get enforcement statistics
  static async getEnforcementStatistics(startDate: string, endDate: string): Promise<EnforcementStatistics> {
    const params = new URLSearchParams({
      startDate,
      endDate
    });
    
    const response = await api.get(`/policy-enforcement/statistics/enforcement?${params}`);
    return response.data;
  }
}