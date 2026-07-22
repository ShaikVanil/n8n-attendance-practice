import api from './api';

export interface PolicyTemplate {
  id: string;
  name: string;
  description?: string;
  employeeType: 'full-time' | 'part-time' | 'contractor' | 'intern';
  isActive: boolean;
  isDefault: boolean;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  rules: PolicyRules;
}

export interface PolicyRules {
  workingHours: {
    startTime: string;
    endTime: string;
    daysOfWeek: number[];
    flexibleHours?: boolean;
    coreHoursStart?: string;
    coreHoursEnd?: string;
  };
  gracePeriod: {
    checkInGrace: number;
    checkOutGrace: number;
    breakGrace: number;
  };
  overtime: {
    enabled: boolean;
    dailyThreshold?: number;
    weeklyThreshold?: number;
    requiresApproval?: boolean;
  };
  breaks: {
    required: boolean;
    minDuration?: number;
    maxDuration?: number;
    maxBreaksPerDay?: number;
  };
}

export interface PolicyAssignment {
  id: string;
  policyTemplateId: string;
  userId: string;
  assignedBy: string;
  assignedAt: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  policyTemplate?: PolicyTemplate;
}

export interface CreatePolicyTemplateRequest {
  name: string;
  description?: string;
  employeeType: 'full-time' | 'part-time' | 'contractor' | 'intern';
  isDefault?: boolean;
  rules: PolicyRules;
}

export interface UpdatePolicyTemplateRequest {
  name?: string;
  description?: string;
  employeeType?: 'full-time' | 'part-time' | 'contractor' | 'intern';
  isActive?: boolean;
  isDefault?: boolean;
  rules?: PolicyRules;
}

export interface PolicyAssignmentRequest {
  userId: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface PolicyTemplateFilters {
  employeeType?: string;
  isActive?: boolean;
  isDefault?: boolean;
  search?: string;
}

export interface PolicyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PolicyPreviewResult {
  affectedUsers: number;
  conflictingPolicies: string[];
  estimatedImpact: string;
}

export class PolicyTemplateService {
  // Policy Templates CRUD
  static async getPolicyTemplates(filters?: PolicyTemplateFilters): Promise<PolicyTemplate[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    const response = await api.get(`/policy-templates?${params.toString()}`);
    return response.data;
  }

  static async getPolicyTemplateById(id: string): Promise<PolicyTemplate> {
    const response = await api.get(`/policy-templates/${id}`);
    return response.data;
  }

  static async createPolicyTemplate(templateData: CreatePolicyTemplateRequest): Promise<PolicyTemplate> {
    const response = await api.post('/policy-templates', templateData);
    return response.data;
  }

  static async updatePolicyTemplate(id: string, templateData: UpdatePolicyTemplateRequest): Promise<PolicyTemplate> {
    const response = await api.put(`/policy-templates/${id}`, templateData);
    return response.data;
  }

  static async deletePolicyTemplate(id: string): Promise<void> {
    await api.delete(`/policy-templates/${id}`);
  }

  // Policy Assignments
  static async assignPolicyToUser(policyTemplateId: string, assignmentData: PolicyAssignmentRequest): Promise<PolicyAssignment> {
    const response = await api.post(`/policy-templates/${policyTemplateId}/assign`, assignmentData);
    return response.data;
  }

  static async getUserPolicyAssignments(userId: string): Promise<PolicyAssignment[]> {
    const response = await api.get(`/policy-templates/users/${userId}/assignments`);
    return response.data;
  }

  static async getUserActivePolicies(userId: string): Promise<PolicyTemplate[]> {
    const response = await api.get(`/policy-templates/users/${userId}/active`);
    return response.data;
  }

  // Validation and Preview
  static async validatePolicyRules(rules: PolicyRules): Promise<PolicyValidationResult> {
    const response = await api.post('/policy-templates/validate', { rules });
    return response.data;
  }

  static async previewPolicyImpact(policyTemplateId: string): Promise<PolicyPreviewResult> {
    const response = await api.get(`/policy-templates/${policyTemplateId}/preview`);
    return response.data;
  }
}