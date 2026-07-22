import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface PolicyTemplate {
    id: string;
    name: string;
    description?: string;
    employeeType: 'full_time' | 'part_time' | 'contractor' | 'intern' | 'custom';
    rules: PolicyRules;
    isActive: boolean;
    isDefault: boolean;
    version: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface PolicyRules {
    workingHours?: {
        startTime?: string;
        endTime?: string;
        totalHoursPerDay?: number;
        daysPerWeek?: number;
        flexible?: boolean;
        minHoursPerDay?: number;
        maxHoursPerDay?: number;
    };
    gracePeriods?: {
        checkInGraceMinutes?: number;
        checkOutGraceMinutes?: number;
        breakGraceMinutes?: number;
    };
    overtime?: {
        thresholdHours?: number;
        maxDailyHours?: number;
        requiresApproval?: boolean;
        multiplier?: number;
    };
    breaks?: {
        flexible?: boolean;
        lunchBreak?: {
            durationMinutes: number;
            isMandatory: boolean;
            maxPerDay: number;
        };
        shortBreak?: {
            durationMinutes: number;
            isMandatory: boolean;
            maxPerDay: number;
        };
        personalBreak?: {
            durationMinutes: number;
            isMandatory: boolean;
            maxPerDay: number;
        };
    };
    locationSpecific?: {
        [officeId: string]: Partial<PolicyRules>;
    };
}

export interface PolicyRule {
    id: string;
    policyTemplateId: string;
    ruleType: 'grace_period' | 'overtime' | 'break_time' | 'working_hours' | 'location_specific';
    ruleName: string;
    conditions: Record<string, any>;
    actions: Record<string, any>;
    priority: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface PolicyAssignment {
    id: string;
    userId: string;
    policyTemplateId: string;
    officeId?: string;
    assignedBy: string;
    assignedAt: Date;
    effectiveFrom: Date;
    effectiveTo?: Date;
    isActive: boolean;
}

export interface PolicyViolation {
    id: string;
    userId: string;
    policyTemplateId: string;
    policyRuleId: string;
    attendanceId?: string;
    violationType: string;
    violationDetails: Record<string, any>;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'pending' | 'acknowledged' | 'resolved' | 'dismissed';
    resolvedBy?: string;
    resolvedAt?: Date;
    resolutionNotes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface PolicyTemplateVersion {
    id: string;
    policyTemplateId: string;
    version: string;
    changesSummary?: string;
    rulesSnapshot: PolicyRules;
    createdBy: string;
    createdAt: Date;
}

export interface CreatePolicyTemplateRequest {
    name: string;
    description?: string;
    employeeType: 'full_time' | 'part_time' | 'contractor' | 'intern' | 'custom';
    rules: PolicyRules;
    isDefault?: boolean;
}

export interface UpdatePolicyTemplateRequest {
    name?: string;
    description?: string;
    employeeType?: 'full_time' | 'part_time' | 'contractor' | 'intern' | 'custom';
    rules?: PolicyRules;
    isActive?: boolean;
    isDefault?: boolean;
    version?: string;
}

export interface PolicyTemplateFilters {
    employeeType?: string;
    isActive?: boolean;
    isDefault?: boolean;
    createdBy?: string;
}

class PolicyTemplateService {
    // Policy Template CRUD Operations
    async getPolicyTemplates(filters?: PolicyTemplateFilters): Promise<PolicyTemplate[]> {
        try {
            let query = `
                SELECT 
                    id, name, description, employee_type, rules, is_active, is_default,
                    version, created_by, created_at, updated_at
                FROM policy_templates
                WHERE 1=1
            `;
            const params: any[] = [];
            let paramIndex = 1;

            if (filters?.employeeType) {
                query += ` AND employee_type = $${paramIndex}`;
                params.push(filters.employeeType);
                paramIndex++;
            }

            if (filters?.isActive !== undefined) {
                query += ` AND is_active = $${paramIndex}`;
                params.push(filters.isActive);
                paramIndex++;
            }

            if (filters?.isDefault !== undefined) {
                query += ` AND is_default = $${paramIndex}`;
                params.push(filters.isDefault);
                paramIndex++;
            }

            if (filters?.createdBy) {
                query += ` AND created_by = $${paramIndex}`;
                params.push(filters.createdBy);
                paramIndex++;
            }

            query += ` ORDER BY created_at DESC`;

            const result = await pool.query(query, params);
            return result.rows.map(row => ({
                id: row.id,
                name: row.name,
                description: row.description,
                employeeType: row.employee_type,
                rules: row.rules,
                isActive: row.is_active,
                isDefault: row.is_default,
                version: row.version,
                createdBy: row.created_by,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }));
        } catch (error) {
            console.error('Error fetching policy templates:', error);
            throw new Error('Failed to fetch policy templates');
        }
    }

    async getPolicyTemplateById(id: string): Promise<PolicyTemplate | null> {
        try {
            const result = await pool.query(
                `SELECT 
                    id, name, description, employee_type, rules, is_active, is_default,
                    version, created_by, created_at, updated_at
                FROM policy_templates 
                WHERE id = $1`,
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
                employeeType: row.employee_type,
                rules: row.rules,
                isActive: row.is_active,
                isDefault: row.is_default,
                version: row.version,
                createdBy: row.created_by,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        } catch (error) {
            console.error('Error fetching policy template by ID:', error);
            throw new Error('Failed to fetch policy template');
        }
    }

    async createPolicyTemplate(template: CreatePolicyTemplateRequest, createdBy: string): Promise<PolicyTemplate> {
        try {
            // Check if name already exists
            const existingTemplate = await pool.query(
                'SELECT id FROM policy_templates WHERE name = $1',
                [template.name]
            );

            if (existingTemplate.rows.length > 0) {
                throw new Error('Policy template with this name already exists');
            }

            const id = uuidv4();
            const version = '1.0';
            const isDefault = template.isDefault || false;

            const result = await pool.query(
                `INSERT INTO policy_templates 
                    (id, name, description, employee_type, rules, is_default, version, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, name, description, employee_type, rules, is_active, is_default,
                         version, created_by, created_at, updated_at`,
                [id, template.name, template.description, template.employeeType, 
                 JSON.stringify(template.rules), isDefault, version, createdBy]
            );

            const row = result.rows[0];
            return {
                id: row.id,
                name: row.name,
                description: row.description,
                employeeType: row.employee_type,
                rules: row.rules,
                isActive: row.is_active,
                isDefault: row.is_default,
                version: row.version,
                createdBy: row.created_by,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        } catch (error) {
            console.error('Error creating policy template:', error);
            throw new Error(error instanceof Error ? error.message : 'Failed to create policy template');
        }
    }

    async updatePolicyTemplate(id: string, updates: UpdatePolicyTemplateRequest): Promise<PolicyTemplate> {
        try {
            const existingTemplate = await this.getPolicyTemplateById(id);
            if (!existingTemplate) {
                throw new Error('Policy template not found');
            }

            // Check if name already exists (if name is being updated)
            if (updates.name && updates.name !== existingTemplate.name) {
                const existingName = await pool.query(
                    'SELECT id FROM policy_templates WHERE name = $1 AND id != $2',
                    [updates.name, id]
                );

                if (existingName.rows.length > 0) {
                    throw new Error('Policy template with this name already exists');
                }
            }

            const updateFields: string[] = [];
            const params: any[] = [];
            let paramIndex = 1;

            if (updates.name !== undefined) {
                updateFields.push(`name = $${paramIndex}`);
                params.push(updates.name);
                paramIndex++;
            }

            if (updates.description !== undefined) {
                updateFields.push(`description = $${paramIndex}`);
                params.push(updates.description);
                paramIndex++;
            }

            if (updates.rules !== undefined) {
                updateFields.push(`rules = $${paramIndex}`);
                params.push(JSON.stringify(updates.rules));
                paramIndex++;
            }

            if (updates.isActive !== undefined) {
                updateFields.push(`is_active = $${paramIndex}`);
                params.push(updates.isActive);
                paramIndex++;
            }

            if (updates.isDefault !== undefined) {
                updateFields.push(`is_default = $${paramIndex}`);
                params.push(updates.isDefault);
                paramIndex++;
            }

            if (updates.version !== undefined) {
                updateFields.push(`version = $${paramIndex}`);
                params.push(updates.version);
                paramIndex++;
            }

            updateFields.push(`updated_at = NOW()`);
            params.push(id);

            const query = `
                UPDATE policy_templates 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING id, name, description, employee_type, rules, is_active, is_default,
                         version, created_by, created_at, updated_at
            `;

            const result = await pool.query(query, params);
            const row = result.rows[0];

            return {
                id: row.id,
                name: row.name,
                description: row.description,
                employeeType: row.employee_type,
                rules: row.rules,
                isActive: row.is_active,
                isDefault: row.is_default,
                version: row.version,
                createdBy: row.created_by,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        } catch (error) {
            console.error('Error updating policy template:', error);
            throw new Error(error instanceof Error ? error.message : 'Failed to update policy template');
        }
    }

    async deletePolicyTemplate(id: string): Promise<void> {
        try {
            // Check if template is assigned to any users
            const assignments = await pool.query(
                'SELECT COUNT(*) as count FROM policy_assignments WHERE policy_template_id = $1 AND is_active = true',
                [id]
            );

            if (parseInt(assignments.rows[0].count) > 0) {
                throw new Error('Cannot delete policy template that is assigned to users');
            }

            const result = await pool.query(
                'DELETE FROM policy_templates WHERE id = $1',
                [id]
            );

            if (result.rowCount === 0) {
                throw new Error('Policy template not found');
            }
        } catch (error) {
            console.error('Error deleting policy template:', error);
            throw new Error(error instanceof Error ? error.message : 'Failed to delete policy template');
        }
    }

    // Policy Assignment Operations
    async assignPolicyToUser(userId: string, policyTemplateId: string, assignedBy: string, officeId?: string, effectiveFrom?: Date): Promise<PolicyAssignment> {
        try {
            // Check if user already has an active assignment for this policy
            const existingAssignment = await pool.query(
                `SELECT id FROM policy_assignments 
                WHERE user_id = $1 AND policy_template_id = $2 AND is_active = true`,
                [userId, policyTemplateId]
            );

            if (existingAssignment.rows.length > 0) {
                throw new Error('User already has an active assignment for this policy template');
            }

            const id = uuidv4();
            const effectiveDate = effectiveFrom || new Date();

            const result = await pool.query(
                `INSERT INTO policy_assignments 
                    (id, user_id, policy_template_id, office_id, assigned_by, effective_from)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, user_id, policy_template_id, office_id, assigned_by, 
                         assigned_at, effective_from, effective_to, is_active`,
                [id, userId, policyTemplateId, officeId, assignedBy, effectiveDate]
            );

            const row = result.rows[0];
            return {
                id: row.id,
                userId: row.user_id,
                policyTemplateId: row.policy_template_id,
                officeId: row.office_id,
                assignedBy: row.assigned_by,
                assignedAt: row.assigned_at,
                effectiveFrom: row.effective_from,
                effectiveTo: row.effective_to,
                isActive: row.is_active
            };
        } catch (error) {
            console.error('Error assigning policy to user:', error);
            throw new Error(error instanceof Error ? error.message : 'Failed to assign policy to user');
        }
    }

    async getUserPolicyAssignments(userId: string): Promise<PolicyAssignment[]> {
        try {
            const result = await pool.query(
                `SELECT pa.id, pa.user_id, pa.policy_template_id, pa.office_id, pa.assigned_by,
                        pa.assigned_at, pa.effective_from, pa.effective_to, pa.is_active,
                        pt.name as policy_name, pt.employee_type
                FROM policy_assignments pa
                JOIN policy_templates pt ON pa.policy_template_id = pt.id
                WHERE pa.user_id = $1
                ORDER BY pa.assigned_at DESC`,
                [userId]
            );

            return result.rows.map(row => ({
                id: row.id,
                userId: row.user_id,
                policyTemplateId: row.policy_template_id,
                officeId: row.office_id,
                assignedBy: row.assigned_by,
                assignedAt: row.assigned_at,
                effectiveFrom: row.effective_from,
                effectiveTo: row.effective_to,
                isActive: row.is_active
            }));
        } catch (error) {
            console.error('Error fetching user policy assignments:', error);
            throw new Error('Failed to fetch user policy assignments');
        }
    }

    async getActivePolicyForUser(userId: string, date: Date = new Date()): Promise<PolicyTemplate | null> {
        try {
            const result = await pool.query(
                `SELECT pt.id, pt.name, pt.description, pt.employee_type, pt.rules, 
                        pt.is_active, pt.is_default, pt.version, pt.created_by, 
                        pt.created_at, pt.updated_at
                FROM policy_templates pt
                JOIN policy_assignments pa ON pt.id = pa.policy_template_id
                WHERE pa.user_id = $1 
                  AND pa.is_active = true 
                  AND pa.effective_from <= $2
                  AND (pa.effective_to IS NULL OR pa.effective_to >= $2)
                  AND pt.is_active = true
                ORDER BY pa.assigned_at DESC
                LIMIT 1`,
                [userId, date]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const row = result.rows[0];
            return {
                id: row.id,
                name: row.name,
                description: row.description,
                employeeType: row.employee_type,
                rules: row.rules,
                isActive: row.is_active,
                isDefault: row.is_default,
                version: row.version,
                createdBy: row.created_by,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        } catch (error) {
            console.error('Error fetching active policy for user:', error);
            throw new Error('Failed to fetch active policy for user');
        }
    }

    // Policy Validation
    async validatePolicyRules(rules: PolicyRules): Promise<{ isValid: boolean; errors: string[] }> {
        const errors: string[] = [];

        try {
            // Validate working hours
            if (rules.workingHours) {
                const wh = rules.workingHours;
                if (wh.startTime && wh.endTime) {
                    const start = new Date(`2000-01-01T${wh.startTime}:00`);
                    const end = new Date(`2000-01-01T${wh.endTime}:00`);
                    if (start >= end) {
                        errors.push('Working hours: Start time must be before end time');
                    }
                }
                if (wh.totalHoursPerDay && (wh.totalHoursPerDay < 0 || wh.totalHoursPerDay > 24)) {
                    errors.push('Working hours: Total hours per day must be between 0 and 24');
                }
                if (wh.daysPerWeek && (wh.daysPerWeek < 1 || wh.daysPerWeek > 7)) {
                    errors.push('Working hours: Days per week must be between 1 and 7');
                }
            }

            // Validate grace periods
            if (rules.gracePeriods) {
                const gp = rules.gracePeriods;
                if (gp.checkInGraceMinutes && (gp.checkInGraceMinutes < 0 || gp.checkInGraceMinutes > 120)) {
                    errors.push('Grace periods: Check-in grace must be between 0 and 120 minutes');
                }
                if (gp.checkOutGraceMinutes && (gp.checkOutGraceMinutes < 0 || gp.checkOutGraceMinutes > 120)) {
                    errors.push('Grace periods: Check-out grace must be between 0 and 120 minutes');
                }
                if (gp.breakGraceMinutes && (gp.breakGraceMinutes < 0 || gp.breakGraceMinutes > 60)) {
                    errors.push('Grace periods: Break grace must be between 0 and 60 minutes');
                }
            }

            // Validate overtime rules
            if (rules.overtime) {
                const ot = rules.overtime;
                if (ot.thresholdHours && (ot.thresholdHours < 0 || ot.thresholdHours > 24)) {
                    errors.push('Overtime: Threshold hours must be between 0 and 24');
                }
                if (ot.maxDailyHours && (ot.maxDailyHours < 0 || ot.maxDailyHours > 24)) {
                    errors.push('Overtime: Max daily hours must be between 0 and 24');
                }
                if (ot.multiplier && (ot.multiplier < 1 || ot.multiplier > 5)) {
                    errors.push('Overtime: Multiplier must be between 1 and 5');
                }
            }

            // Validate break rules
            if (rules.breaks && !rules.breaks.flexible) {
                const breaks = rules.breaks;
                ['lunchBreak', 'shortBreak', 'personalBreak'].forEach(breakType => {
                    const breakRule = breaks[breakType as keyof typeof breaks];
                    if (breakRule && typeof breakRule === 'object') {
                        if (breakRule.durationMinutes < 0 || breakRule.durationMinutes > 480) {
                            errors.push(`${breakType}: Duration must be between 0 and 480 minutes`);
                        }
                        if (breakRule.maxPerDay < 0 || breakRule.maxPerDay > 10) {
                            errors.push(`${breakType}: Max per day must be between 0 and 10`);
                        }
                    }
                });
            }

            return {
                isValid: errors.length === 0,
                errors
            };
        } catch (error) {
            console.error('Error validating policy rules:', error);
            return {
                isValid: false,
                errors: ['Failed to validate policy rules']
            };
        }
    }

    // Enhanced Policy Rule Validation with Business Logic
    async validatePolicyRulesAdvanced(rules: PolicyRules): Promise<{ 
        isValid: boolean; 
        errors: string[]; 
        warnings: string[];
        conflicts: string[];
    }> {
        const errors: string[] = [];
        const warnings: string[] = [];
        const conflicts: string[] = [];

        try {
            // Basic validation (existing logic)
            const basicValidation = await this.validatePolicyRules(rules);
            errors.push(...basicValidation.errors);

            // Advanced business rule validation
            if (rules.workingHours) {
                const wh = rules.workingHours;
                
                // Check for logical conflicts
                if (wh.minHoursPerDay && wh.maxHoursPerDay && wh.minHoursPerDay > wh.maxHoursPerDay) {
                    conflicts.push('Working hours: Minimum hours per day cannot exceed maximum hours per day');
                }
                
                if (wh.totalHoursPerDay && wh.maxHoursPerDay && wh.totalHoursPerDay > wh.maxHoursPerDay) {
                    conflicts.push('Working hours: Total hours per day cannot exceed maximum hours per day');
                }
                
                // Business logic warnings
                if (wh.totalHoursPerDay && wh.totalHoursPerDay > 12) {
                    warnings.push('Working hours: Total hours per day exceeds 12 hours - consider labor law compliance');
                }
                
                if (wh.daysPerWeek && wh.daysPerWeek > 6) {
                    warnings.push('Working hours: More than 6 days per week may violate labor regulations');
                }
            }

            // Overtime validation
            if (rules.overtime && rules.workingHours) {
                const ot = rules.overtime;
                const wh = rules.workingHours;
                
                if (ot.thresholdHours && wh.totalHoursPerDay && ot.thresholdHours > wh.totalHoursPerDay) {
                    conflicts.push('Overtime: Threshold hours cannot exceed total working hours per day');
                }
                
                if (ot.maxDailyHours && wh.totalHoursPerDay && ot.maxDailyHours < wh.totalHoursPerDay) {
                    conflicts.push('Overtime: Max daily hours cannot be less than total working hours');
                }
            }

            // Break time validation
            if (rules.breaks && rules.workingHours) {
                const breaks = rules.breaks;
                const wh = rules.workingHours;
                
                if (!breaks.flexible && wh.totalHoursPerDay) {
                    let totalBreakTime = 0;
                    
                    ['lunchBreak', 'shortBreak', 'personalBreak'].forEach(breakType => {
                        const breakRule = breaks[breakType as keyof typeof breaks];
                        if (breakRule && typeof breakRule === 'object') {
                            totalBreakTime += breakRule.durationMinutes * breakRule.maxPerDay;
                        }
                    });
                    
                    const totalBreakHours = totalBreakTime / 60;
                    if (totalBreakHours > wh.totalHoursPerDay * 0.5) {
                        warnings.push('Break time: Total break time exceeds 50% of working hours');
                    }
                }
            }

            // Grace period validation
            if (rules.gracePeriods) {
                const gp = rules.gracePeriods;
                
                if (gp.checkInGraceMinutes && gp.checkInGraceMinutes > 30) {
                    warnings.push('Grace periods: Check-in grace period exceeds 30 minutes - may impact productivity');
                }
                
                if (gp.checkOutGraceMinutes && gp.checkOutGraceMinutes > 30) {
                    warnings.push('Grace periods: Check-out grace period exceeds 30 minutes - may impact overtime calculations');
                }
            }

            return {
                isValid: errors.length === 0 && conflicts.length === 0,
                errors,
                warnings,
                conflicts
            };
        } catch (error) {
            console.error('Error in advanced policy validation:', error);
            return {
                isValid: false,
                errors: ['Failed to validate policy rules'],
                warnings: [],
                conflicts: []
            };
        }
    }

    // Policy Conflict Detection
    async detectPolicyConflicts(policyTemplateId: string, employeeType?: string): Promise<{
        hasConflicts: boolean;
        conflicts: Array<{
            conflictType: string;
            description: string;
            severity: 'low' | 'medium' | 'high';
            conflictingPolicyId?: string;
            conflictingPolicyName?: string;
        }>;
    }> {
        try {
            const template = await this.getPolicyTemplateById(policyTemplateId);
            if (!template) {
                throw new Error('Policy template not found');
            }

            const conflicts: Array<{
                conflictType: string;
                description: string;
                severity: 'low' | 'medium' | 'high';
                conflictingPolicyId?: string;
                conflictingPolicyName?: string;
            }> = [];

            // Check for conflicts with other active policies of the same employee type
            const existingPolicies = await this.getPolicyTemplates({
                employeeType: employeeType || template.employeeType,
                isActive: true
            });

            for (const existingPolicy of existingPolicies) {
                if (existingPolicy.id === policyTemplateId) continue;

                // Check for default policy conflicts
                if (template.isDefault && existingPolicy.isDefault) {
                    conflicts.push({
                        conflictType: 'default_policy',
                        description: `Multiple default policies exist for ${template.employeeType} employees`,
                        severity: 'high',
                        conflictingPolicyId: existingPolicy.id,
                        conflictingPolicyName: existingPolicy.name
                    });
                }

                // Check for working hours conflicts
                if (template.rules.workingHours && existingPolicy.rules.workingHours) {
                    const templateHours = template.rules.workingHours.totalHoursPerDay;
                    const existingHours = existingPolicy.rules.workingHours.totalHoursPerDay;
                    
                    if (templateHours && existingHours && Math.abs(templateHours - existingHours) > 4) {
                        conflicts.push({
                            conflictType: 'working_hours',
                            description: `Significant difference in working hours (${templateHours}h vs ${existingHours}h)`,
                            severity: 'medium',
                            conflictingPolicyId: existingPolicy.id,
                            conflictingPolicyName: existingPolicy.name
                        });
                    }
                }

                // Check for overtime threshold conflicts
                if (template.rules.overtime && existingPolicy.rules.overtime) {
                    const templateThreshold = template.rules.overtime.thresholdHours;
                    const existingThreshold = existingPolicy.rules.overtime.thresholdHours;
                    
                    if (templateThreshold && existingThreshold && Math.abs(templateThreshold - existingThreshold) > 2) {
                        conflicts.push({
                            conflictType: 'overtime_threshold',
                            description: `Different overtime thresholds (${templateThreshold}h vs ${existingThreshold}h)`,
                            severity: 'low',
                            conflictingPolicyId: existingPolicy.id,
                            conflictingPolicyName: existingPolicy.name
                        });
                    }
                }
            }

            return {
                hasConflicts: conflicts.length > 0,
                conflicts
            };
        } catch (error) {
            console.error('Error detecting policy conflicts:', error);
            throw new Error('Failed to detect policy conflicts');
        }
    }

    // Enhanced Policy Impact Preview
    async previewPolicyImpactDetailed(policyTemplateId: string, userIds: string[], effectiveDate: Date = new Date()): Promise<{
        policyTemplate: PolicyTemplate;
        impactSummary: {
            totalAffectedUsers: number;
            estimatedChanges: {
                workingHoursAdjustments: number;
                gracePeriodsChanges: number;
                overtimeRuleChanges: number;
                breakPolicyChanges: number;
            };
            complianceImpact: {
                potentialViolations: Array<{
                    userId: string;
                    violationType: string;
                    description: string;
                    severity: 'low' | 'medium' | 'high';
                }>;
                complianceScore: number;
            };
            financialImpact: {
                estimatedOvertimeCostChange: number;
                estimatedProductivityImpact: number;
            };
        };
        userSpecificImpact: Array<{
            userId: string;
            currentPolicy?: PolicyTemplate;
            changes: {
                workingHours?: { before: any; after: any; impact: string };
                gracePeriods?: { before: any; after: any; impact: string };
                overtime?: { before: any; after: any; impact: string };
                breaks?: { before: any; after: any; impact: string };
            };
            riskLevel: 'low' | 'medium' | 'high';
        }>;
    }> {
        try {
            const template = await this.getPolicyTemplateById(policyTemplateId);
            if (!template) {
                throw new Error('Policy template not found');
            }

            const userSpecificImpact = [];
            let totalWorkingHoursChanges = 0;
            let totalGraceChanges = 0;
            let totalOvertimeChanges = 0;
            let totalBreakChanges = 0;
            const potentialViolations = [];

            // Analyze impact for each user
            for (const userId of userIds) {
                const currentPolicy = await this.getActivePolicyForUser(userId, effectiveDate);
                const userImpact = {
                    userId,
                    currentPolicy: currentPolicy || undefined,
                    changes: {} as any,
                    riskLevel: 'low' as 'low' | 'medium' | 'high'
                };

                // Compare working hours
                if (template.rules.workingHours && currentPolicy?.rules.workingHours) {
                    const currentHours = currentPolicy.rules.workingHours.totalHoursPerDay || 8;
                    const newHours = template.rules.workingHours.totalHoursPerDay || 8;
                    
                    if (currentHours !== newHours) {
                        userImpact.changes.workingHours = {
                            before: currentHours,
                            after: newHours,
                            impact: newHours > currentHours ? 'increase' : 'decrease'
                        };
                        totalWorkingHoursChanges++;
                        
                        if (Math.abs(newHours - currentHours) > 2) {
                            userImpact.riskLevel = 'high';
                        }
                    }
                }

                // Compare grace periods
                if (template.rules.gracePeriods && currentPolicy?.rules.gracePeriods) {
                    const currentGrace = currentPolicy.rules.gracePeriods.checkInGraceMinutes || 0;
                    const newGrace = template.rules.gracePeriods.checkInGraceMinutes || 0;
                    
                    if (currentGrace !== newGrace) {
                        userImpact.changes.gracePeriods = {
                            before: currentGrace,
                            after: newGrace,
                            impact: newGrace > currentGrace ? 'more_lenient' : 'more_strict'
                        };
                        totalGraceChanges++;
                        
                        if (newGrace < currentGrace && currentGrace - newGrace > 15) {
                            userImpact.riskLevel = 'medium';
                            potentialViolations.push({
                                userId,
                                violationType: 'grace_period_reduction',
                                description: `Grace period reduced from ${currentGrace} to ${newGrace} minutes`,
                                severity: 'medium' as 'medium'
                            });
                        }
                    }
                }

                // Compare overtime rules
                if (template.rules.overtime && currentPolicy?.rules.overtime) {
                    const currentThreshold = currentPolicy.rules.overtime.thresholdHours || 8;
                    const newThreshold = template.rules.overtime.thresholdHours || 8;
                    
                    if (currentThreshold !== newThreshold) {
                        userImpact.changes.overtime = {
                            before: currentThreshold,
                            after: newThreshold,
                            impact: newThreshold < currentThreshold ? 'earlier_overtime' : 'later_overtime'
                        };
                        totalOvertimeChanges++;
                    }
                }

                userSpecificImpact.push(userImpact);
            }

            // Calculate compliance score (0-100)
            const complianceScore = Math.max(0, 100 - (potentialViolations.length * 10));

            return {
                policyTemplate: template,
                impactSummary: {
                    totalAffectedUsers: userIds.length,
                    estimatedChanges: {
                        workingHoursAdjustments: totalWorkingHoursChanges,
                        gracePeriodsChanges: totalGraceChanges,
                        overtimeRuleChanges: totalOvertimeChanges,
                        breakPolicyChanges: totalBreakChanges
                    },
                    complianceImpact: {
                        potentialViolations,
                        complianceScore
                    },
                    financialImpact: {
                        estimatedOvertimeCostChange: totalOvertimeChanges * 100, // Simplified calculation
                        estimatedProductivityImpact: totalWorkingHoursChanges * 50 // Simplified calculation
                    }
                },
                userSpecificImpact
            };
        } catch (error) {
            console.error('Error in detailed policy impact preview:', error);
            throw new Error('Failed to preview detailed policy impact');
        }
    }

    // Policy Recommendation Engine
    async generatePolicyRecommendations(employeeType: string, currentRules?: PolicyRules): Promise<{
        recommendations: Array<{
            category: string;
            suggestion: string;
            reasoning: string;
            priority: 'low' | 'medium' | 'high';
            estimatedImpact: string;
        }>;
        bestPractices: string[];
    }> {
        try {
            const recommendations = [];
            const bestPractices = [];

            // Employee type specific recommendations
            switch (employeeType) {
                case 'full_time':
                    recommendations.push({
                        category: 'working_hours',
                        suggestion: 'Set standard 8-hour workday with 40-hour work week',
                        reasoning: 'Aligns with standard full-time employment expectations',
                        priority: 'high' as 'high',
                        estimatedImpact: 'Improved work-life balance and compliance'
                    });
                    break;
                    
                case 'part_time':
                    recommendations.push({
                        category: 'working_hours',
                        suggestion: 'Implement flexible working hours with 4-6 hour shifts',
                        reasoning: 'Accommodates part-time schedule requirements',
                        priority: 'high' as 'high',
                        estimatedImpact: 'Better schedule flexibility for part-time workers'
                    });
                    break;
                    
                case 'contractor':
                    recommendations.push({
                        category: 'overtime',
                        suggestion: 'Disable automatic overtime calculations',
                        reasoning: 'Contractors typically manage their own time and billing',
                        priority: 'medium' as 'medium',
                        estimatedImpact: 'Simplified time tracking for contractors'
                    });
                    break;
            }

            // General best practices
            bestPractices.push(
                'Ensure grace periods are reasonable (5-15 minutes for check-in)',
                'Set overtime thresholds that comply with local labor laws',
                'Implement mandatory break periods for shifts longer than 6 hours',
                'Consider flexible working arrangements where possible',
                'Regular policy reviews and updates based on employee feedback'
            );

            // Analyze current rules if provided
            if (currentRules) {
                if (currentRules.gracePeriods?.checkInGraceMinutes && currentRules.gracePeriods.checkInGraceMinutes > 30) {
                    recommendations.push({
                        category: 'grace_periods',
                        suggestion: 'Reduce check-in grace period to 15 minutes or less',
                        reasoning: 'Excessive grace periods may impact productivity and fairness',
                        priority: 'medium' as 'medium',
                        estimatedImpact: 'Improved punctuality and time management'
                    });
                }
                
                if (currentRules.workingHours?.totalHoursPerDay && currentRules.workingHours.totalHoursPerDay > 10) {
                    recommendations.push({
                        category: 'working_hours',
                        suggestion: 'Consider reducing daily working hours to 8-9 hours',
                        reasoning: 'Long working hours may lead to burnout and decreased productivity',
                        priority: 'high' as 'high',
                        estimatedImpact: 'Better employee wellbeing and sustained productivity'
                    });
                }
            }

            return {
                recommendations,
                bestPractices
            };
        } catch (error) {
            console.error('Error generating policy recommendations:', error);
            throw new Error('Failed to generate policy recommendations');
        }
    }

    // Policy Template Versioning Methods
    
    /**
     * Create a new version of a policy template
     */
    async createPolicyTemplateVersion(
        policyTemplateId: string, 
        changesSummary: string, 
        createdBy: string
    ): Promise<PolicyTemplateVersion> {
        try {
            // Get current policy template
            const currentTemplate = await this.getPolicyTemplateById(policyTemplateId);
            if (!currentTemplate) {
                throw new Error('Policy template not found');
            }

            // Generate new version number
            const latestVersion = await this.getLatestVersionNumber(policyTemplateId);
            const newVersionNumber = this.incrementVersion(latestVersion);

            const versionId = uuidv4();
            const now = new Date();

            // Insert new version record
            const query = `
                INSERT INTO policy_template_versions (
                    id, policy_template_id, version, changes_summary, 
                    rules_snapshot, created_by, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;

            const result = await pool.query(query, [
                versionId,
                policyTemplateId,
                newVersionNumber,
                changesSummary,
                JSON.stringify(currentTemplate.rules),
                createdBy,
                now
            ]);

            return {
                id: result.rows[0].id,
                policyTemplateId: result.rows[0].policy_template_id,
                version: result.rows[0].version,
                changesSummary: result.rows[0].changes_summary,
                rulesSnapshot: result.rows[0].rules_snapshot,
                createdBy: result.rows[0].created_by,
                createdAt: result.rows[0].created_at
            };
        } catch (error) {
            console.error('Error creating policy template version:', error);
            throw new Error('Failed to create policy template version');
        }
    }

    /**
     * Get version history for a policy template
     */
    async getPolicyTemplateVersionHistory(policyTemplateId: string): Promise<PolicyTemplateVersion[]> {
        try {
            const query = `
                SELECT * FROM policy_template_versions 
                WHERE policy_template_id = $1 
                ORDER BY created_at DESC
            `;

            const result = await pool.query(query, [policyTemplateId]);

            return result.rows.map(row => ({
                id: row.id,
                policyTemplateId: row.policy_template_id,
                version: row.version,
                changesSummary: row.changes_summary,
                rulesSnapshot: row.rules_snapshot,
                createdBy: row.created_by,
                createdAt: row.created_at
            }));
        } catch (error) {
            console.error('Error getting policy template version history:', error);
            throw new Error('Failed to get policy template version history');
        }
    }

    /**
     * Get a specific version of a policy template
     */
    async getPolicyTemplateVersion(versionId: string): Promise<PolicyTemplateVersion | null> {
        try {
            const query = `
                SELECT * FROM policy_template_versions 
                WHERE id = $1
            `;

            const result = await pool.query(query, [versionId]);

            if (result.rows.length === 0) {
                return null;
            }

            const row = result.rows[0];
            return {
                id: row.id,
                policyTemplateId: row.policy_template_id,
                version: row.version,
                changesSummary: row.changes_summary,
                rulesSnapshot: row.rules_snapshot,
                createdBy: row.created_by,
                createdAt: row.created_at
            };
        } catch (error) {
            console.error('Error getting policy template version:', error);
            throw new Error('Failed to get policy template version');
        }
    }

    /**
     * Compare two versions of a policy template
     */
    async comparePolicyTemplateVersions(
        versionId1: string, 
        versionId2: string
    ): Promise<{
        version1: PolicyTemplateVersion;
        version2: PolicyTemplateVersion;
        differences: Array<{
            path: string;
            type: 'added' | 'removed' | 'modified';
            oldValue?: any;
            newValue?: any;
            description: string;
        }>;
    }> {
        try {
            const [version1, version2] = await Promise.all([
                this.getPolicyTemplateVersion(versionId1),
                this.getPolicyTemplateVersion(versionId2)
            ]);

            if (!version1 || !version2) {
                throw new Error('One or both versions not found');
            }

            const differences = this.calculateRulesDifferences(
                version1.rulesSnapshot,
                version2.rulesSnapshot
            );

            return {
                version1,
                version2,
                differences
            };
        } catch (error) {
            console.error('Error comparing policy template versions:', error);
            throw new Error('Failed to compare policy template versions');
        }
    }

    /**
     * Rollback policy template to a specific version
     */
    async rollbackPolicyTemplateToVersion(
        policyTemplateId: string, 
        versionId: string, 
        rolledBackBy: string
    ): Promise<PolicyTemplate> {
        try {
            // Get the target version
            const targetVersion = await this.getPolicyTemplateVersion(versionId);
            if (!targetVersion) {
                throw new Error('Target version not found');
            }

            // Create a backup of current state before rollback
            await this.createPolicyTemplateVersion(
                policyTemplateId,
                `Backup before rollback to version ${targetVersion.version}`,
                rolledBackBy
            );

            // Update the policy template with the target version's rules
            const newVersion = this.incrementVersion(targetVersion.version) + '-rollback';
            
            const updatedTemplate = await this.updatePolicyTemplate(policyTemplateId, {
                rules: targetVersion.rulesSnapshot,
                version: newVersion
            });

            // Create a new version record for the rollback
            await this.createPolicyTemplateVersion(
                policyTemplateId,
                `Rolled back to version ${targetVersion.version}`,
                rolledBackBy
            );

            return updatedTemplate;
        } catch (error) {
            console.error('Error rolling back policy template:', error);
            throw new Error('Failed to rollback policy template');
        }
    }

    /**
     * Get the latest version number for a policy template
     */
    private async getLatestVersionNumber(policyTemplateId: string): Promise<string> {
        try {
            const query = `
                SELECT version FROM policy_template_versions 
                WHERE policy_template_id = $1 
                ORDER BY created_at DESC 
                LIMIT 1
            `;

            const result = await pool.query(query, [policyTemplateId]);
            
            if (result.rows.length === 0) {
                // Get version from main policy template
                const template = await this.getPolicyTemplateById(policyTemplateId);
                return template?.version || '1.0.0';
            }

            return result.rows[0].version;
        } catch (error) {
            console.error('Error getting latest version number:', error);
            return '1.0.0';
        }
    }

    /**
     * Increment version number (semantic versioning)
     */
    private incrementVersion(currentVersion: string): string {
        const versionParts = currentVersion.split('.');
        const major = parseInt(versionParts[0] || '1');
        const minor = parseInt(versionParts[1] || '0');
        const patch = parseInt(versionParts[2] || '0');

        // Increment patch version
        return `${major}.${minor}.${patch + 1}`;
    }

    /**
     * Calculate differences between two policy rules objects
     */
    private calculateRulesDifferences(
        oldRules: PolicyRules, 
        newRules: PolicyRules
    ): Array<{
        path: string;
        type: 'added' | 'removed' | 'modified';
        oldValue?: any;
        newValue?: any;
        description: string;
    }> {
        const differences: Array<{
            path: string;
            type: 'added' | 'removed' | 'modified';
            oldValue?: any;
            newValue?: any;
            description: string;
        }> = [];

        // Compare working hours
        if (oldRules.workingHours !== newRules.workingHours) {
            this.compareObjects(
                oldRules.workingHours || {},
                newRules.workingHours || {},
                'workingHours',
                differences
            );
        }

        // Compare grace periods
        if (oldRules.gracePeriods !== newRules.gracePeriods) {
            this.compareObjects(
                oldRules.gracePeriods || {},
                newRules.gracePeriods || {},
                'gracePeriods',
                differences
            );
        }

        // Compare overtime rules
        if (oldRules.overtime !== newRules.overtime) {
            this.compareObjects(
                oldRules.overtime || {},
                newRules.overtime || {},
                'overtime',
                differences
            );
        }

        // Compare break rules
        if (oldRules.breaks !== newRules.breaks) {
            this.compareObjects(
                oldRules.breaks || {},
                newRules.breaks || {},
                'breaks',
                differences
            );
        }

        return differences;
    }

    /**
     * Helper method to compare objects and track differences
     */
    private compareObjects(
        oldObj: any, 
        newObj: any, 
        basePath: string, 
        differences: Array<{
            path: string;
            type: 'added' | 'removed' | 'modified';
            oldValue?: any;
            newValue?: any;
            description: string;
        }>
    ): void {
        const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

        for (const key of allKeys) {
            const path = `${basePath}.${key}`;
            const oldValue = oldObj[key];
            const newValue = newObj[key];

            if (oldValue === undefined && newValue !== undefined) {
                differences.push({
                    path,
                    type: 'added',
                    newValue,
                    description: `Added ${key} with value ${JSON.stringify(newValue)}`
                });
            } else if (oldValue !== undefined && newValue === undefined) {
                differences.push({
                    path,
                    type: 'removed',
                    oldValue,
                    description: `Removed ${key} (was ${JSON.stringify(oldValue)})`
                });
            } else if (oldValue !== newValue) {
                differences.push({
                    path,
                    type: 'modified',
                    oldValue,
                    newValue,
                    description: `Changed ${key} from ${JSON.stringify(oldValue)} to ${JSON.stringify(newValue)}`
                });
            }
        }
    }

    /**
     * Delete old versions (cleanup utility)
     */
    async cleanupOldVersions(
        policyTemplateId: string, 
        keepLatestCount: number = 10
    ): Promise<number> {
        try {
            const query = `
                DELETE FROM policy_template_versions 
                WHERE policy_template_id = $1 
                AND id NOT IN (
                    SELECT id FROM policy_template_versions 
                    WHERE policy_template_id = $1 
                    ORDER BY created_at DESC 
                    LIMIT $2
                )
            `;

            const result = await pool.query(query, [policyTemplateId, keepLatestCount]);
            return result.rowCount || 0;
        } catch (error) {
            console.error('Error cleaning up old versions:', error);
            throw new Error('Failed to cleanup old versions');
        }
    }

    // ... existing code ...
}

// Export the service class and create a singleton instance
export { PolicyTemplateService };
export const policyTemplateService = new PolicyTemplateService();
export default policyTemplateService;