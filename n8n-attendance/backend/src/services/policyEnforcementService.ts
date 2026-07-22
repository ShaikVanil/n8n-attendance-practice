import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { policyTemplateService, PolicyTemplate, PolicyViolation, PolicyRules } from './policyTemplateService';
import { notificationService } from './notificationService';
import { Attendance, Break } from '../types/attendance';

export interface EnforcementResult {
    isCompliant: boolean;
    violations: PolicyViolation[];
    warnings: EnforcementWarning[];
    gracePeriodsApplied: GracePeriodApplication[];
    escalationsTriggered: EscalationAction[];
}

export interface EnforcementWarning {
    id: string;
    userId: string;
    warningType: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    threshold?: number;
    currentValue?: number;
    createdAt: Date;
}

export interface GracePeriodApplication {
    id: string;
    userId: string;
    attendanceId?: string;
    breakId?: string;
    applicationType: 'check_in' | 'check_out' | 'break_start' | 'break_end';
    originalTime: Date;
    adjustedTime: Date;
    graceMinutes: number;
    graceSource: 'config' | 'exception';
    graceConfigId?: string;
    graceExceptionId?: string;
    reason: string;
    appliedBy: 'system' | 'manual';
    createdAt: Date;
}

export interface EscalationAction {
    id: string;
    userId: string;
    violationId: string;
    escalationRuleId: string;
    escalationLevel: number;
    actionType: 'warning' | 'notification' | 'manager_alert' | 'hr_alert' | 'disciplinary';
    actionDetails: Record<string, any>;
    triggeredAt: Date;
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    executedAt?: Date;
    executedBy?: string;
    errorMessage?: string;
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
    initiatedAt: Date;
    status: 'pending' | 'active' | 'completed' | 'appealed' | 'overturned';
    effectiveDate?: Date;
    expiryDate?: Date;
    appealDeadline?: Date;
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
    createdAt: Date;
    updatedAt: Date;
}

export interface ViolationHistory {
    userId: string;
    violationType: string;
    occurrences: number;
    firstOccurrence: Date;
    lastOccurrence: Date;
    escalationLevel: number;
}

class PolicyEnforcementService {

    // Main enforcement method - validates attendance against active policies
    async enforceAttendancePolicy(userId: string, attendanceId: string): Promise<EnforcementResult> {
        try {
            const attendance = await this.getAttendanceById(attendanceId);
            if (!attendance) {
                throw new Error('Attendance record not found');
            }

            const activePolicy = await policyTemplateService.getActivePolicyForUser(userId, new Date(attendance.date));
            if (!activePolicy) {
                return {
                    isCompliant: true,
                    violations: [],
                    warnings: [],
                    gracePeriodsApplied: [],
                    escalationsTriggered: []
                };
            }

            const result: EnforcementResult = {
                isCompliant: true,
                violations: [],
                warnings: [],
                gracePeriodsApplied: [],
                escalationsTriggered: []
            };

            // Apply grace periods first
            const graceApplications = await this.applyGracePeriods(attendance, activePolicy.rules);
            result.gracePeriodsApplied = graceApplications;

            // Validate working hours
            const workingHoursViolations = await this.validateWorkingHours(attendance, activePolicy.rules, userId);
            result.violations.push(...workingHoursViolations);

            // Validate check-in/check-out times
            const timeViolations = await this.validateCheckInOutTimes(attendance, activePolicy.rules, userId);
            result.violations.push(...timeViolations);

            // Validate overtime rules
            const overtimeViolations = await this.validateOvertimeRules(attendance, activePolicy.rules, userId);
            result.violations.push(...overtimeViolations);

            // Validate break policies
            const breakViolations = await this.validateBreakPolicies(attendance, activePolicy.rules, userId);
            result.violations.push(...breakViolations);

            // Generate warnings for approaching thresholds
            const warnings = await this.generateWarnings(attendance, activePolicy.rules, userId);
            result.warnings = warnings;

            // Check for escalations
            const escalations = await this.checkEscalationRules(result.violations, userId);
            result.escalationsTriggered = escalations;

            result.isCompliant = result.violations.length === 0;

            // Send notifications for violations and escalations
            await this.sendViolationNotifications(result, userId);

            return result;
        } catch (error) {
            console.error('Error enforcing attendance policy:', error);
            throw new Error('Failed to enforce attendance policy');
        }
    }

    // Enhanced grace periods application with configs and exceptions
    private async applyGracePeriods(attendance: Attendance, rules: PolicyRules): Promise<GracePeriodApplication[]> {
        const applications: GracePeriodApplication[] = [];

        // Get grace period configurations and exceptions
        const graceConfig = await this.getGracePeriodConfig(attendance.user_id);
        const graceExceptions = await this.getGracePeriodExceptions(attendance.user_id);

        if (!graceConfig && graceExceptions.length === 0) return applications;

        // Apply check-in grace period
        if (attendance.check_in_time) {
            const checkInApplication = await this.applyCheckInGracePeriod(attendance, rules, graceConfig, graceExceptions);
            if (checkInApplication) applications.push(checkInApplication);
        }

        // Apply check-out grace period
        if (attendance.check_out_time) {
            const checkOutApplication = await this.applyCheckOutGracePeriod(attendance, rules, graceConfig, graceExceptions);
            if (checkOutApplication) applications.push(checkOutApplication);
        }

        // Apply break grace periods
        const breaks = await this.getBreaksForAttendance(attendance.id);
        for (const breakRecord of breaks) {
            const breakApplications = await this.applyBreakGracePeriods(breakRecord, graceConfig, graceExceptions);
            applications.push(...breakApplications);
        }

        return applications;
    }

    // Get grace period configuration (by user's office)
    private async getGracePeriodConfig(userId: string): Promise<any> {
        const query = `
        SELECT gpc.* FROM grace_period_configs gpc
        JOIN users u ON u.office_id = gpc.office_id
        WHERE u.id = $1 AND gpc.is_active = true
    `;

        const result = await pool.query(query, [userId]);
        return result.rows[0] || null;
    }

    // Get grace period exceptions for a user
    private async getGracePeriodExceptions(userId: string): Promise<any[]> {
        const today = new Date().toISOString().split('T')[0];
        const query = `
        SELECT * FROM grace_period_exceptions
        WHERE user_id = $1 
        AND is_active = true
        AND valid_from <= $2
        AND (valid_to IS NULL OR valid_to >= $2)
        ORDER BY grace_period DESC
    `;

        const result = await pool.query(query, [userId, today]);
        return result.rows;
    }

    // Enhanced check-in grace period application
    private async applyCheckInGracePeriod(
        attendance: Attendance,
        rules: PolicyRules,
        graceConfig: any,
        graceExceptions: any[]
    ): Promise<GracePeriodApplication | null> {
        const expectedStartTime = this.parseTime(rules.workingHours?.startTime || '09:00');
        const checkInTime = new Date(attendance.check_in_time!);
        const actualCheckInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
        const expectedStartMinutes = expectedStartTime.hours * 60 + expectedStartTime.minutes;

        if (actualCheckInMinutes <= expectedStartMinutes) return null; // Not late

        const lateMinutes = actualCheckInMinutes - expectedStartMinutes;

        // Check exceptions first
        const checkInException = graceExceptions.find((ex: any) => ex.grace_type === 'check_in' || ex.grace_type === 'all');

        let graceMinutes = 0;
        let graceSource: 'config' | 'exception' = 'config';
        let graceSourceId: string | undefined;

        if (checkInException && lateMinutes <= checkInException.grace_period) {
            graceMinutes = lateMinutes;
            graceSource = 'exception';
            graceSourceId = checkInException.id;
        } else if (graceConfig && lateMinutes <= (graceConfig.check_in_grace || 0)) {
            graceMinutes = lateMinutes;
            graceSource = 'config';
            graceSourceId = graceConfig.id;
        }

        if (graceMinutes === 0) return null; // No grace period applicable

        const application: GracePeriodApplication = {
            id: uuidv4(),
            userId: attendance.user_id,
            attendanceId: attendance.id,
            applicationType: 'check_in',
            originalTime: checkInTime,
            adjustedTime: new Date(checkInTime.getTime() - graceMinutes * 60000),
            graceMinutes,
            graceSource,
            graceConfigId: graceSource === 'config' ? graceSourceId : undefined,
            graceExceptionId: graceSource === 'exception' ? graceSourceId : undefined,
            reason: `Applied ${graceMinutes} minute grace period for late check-in (${graceSource})`,
            appliedBy: 'system',
            createdAt: new Date()
        };

        await this.saveGracePeriodApplication(application);
        return application;
    }

    // Enhanced check-out grace period application
    private async applyCheckOutGracePeriod(
        attendance: Attendance,
        rules: PolicyRules,
        graceConfig: any,
        graceExceptions: any[]
    ): Promise<GracePeriodApplication | null> {
        const expectedEndTime = this.parseTime(rules.workingHours?.endTime || '17:00');
        const checkOutTime = new Date(attendance.check_out_time!);
        const actualCheckOutMinutes = checkOutTime.getHours() * 60 + checkOutTime.getMinutes();
        const expectedEndMinutes = expectedEndTime.hours * 60 + expectedEndTime.minutes;

        if (actualCheckOutMinutes >= expectedEndMinutes) return null; // Not early

        const earlyMinutes = expectedEndMinutes - actualCheckOutMinutes;

        // Check exceptions first
        const checkOutException = graceExceptions.find((ex: any) => ex.grace_type === 'check_out' || ex.grace_type === 'all');

        let graceMinutes = 0;
        let graceSource: 'config' | 'exception' = 'config';
        let graceSourceId: string | undefined;

        if (checkOutException && earlyMinutes <= checkOutException.grace_period) {
            graceMinutes = earlyMinutes;
            graceSource = 'exception';
            graceSourceId = checkOutException.id;
        } else if (graceConfig && earlyMinutes <= (graceConfig.check_out_grace || 0)) {
            graceMinutes = earlyMinutes;
            graceSource = 'config';
            graceSourceId = graceConfig.id;
        }

        if (graceMinutes === 0) return null; // No grace period applicable

        const application: GracePeriodApplication = {
            id: uuidv4(),
            userId: attendance.user_id,
            attendanceId: attendance.id,
            applicationType: 'check_out',
            originalTime: checkOutTime,
            adjustedTime: new Date(checkOutTime.getTime() + graceMinutes * 60000),
            graceMinutes,
            graceSource,
            graceConfigId: graceSource === 'config' ? graceSourceId : undefined,
            graceExceptionId: graceSource === 'exception' ? graceSourceId : undefined,
            reason: `Applied ${graceMinutes} minute grace period for early check-out (${graceSource})`,
            appliedBy: 'system',
            createdAt: new Date()
        };

        await this.saveGracePeriodApplication(application);
        return application;
    }

    // Apply break grace periods (start/end)
    private async applyBreakGracePeriods(
        breakRecord: Break,
        graceConfig: any,
        graceExceptions: any[]
    ): Promise<GracePeriodApplication[]> {
        const applications: GracePeriodApplication[] = [];

        if (breakRecord.start_time) {
            const startApp = await this.applyBreakStartGracePeriod(breakRecord, graceConfig, graceExceptions);
            if (startApp) applications.push(startApp);
        }

        if (breakRecord.end_time) {
            const endApp = await this.applyBreakEndGracePeriod(breakRecord, graceConfig, graceExceptions);
            if (endApp) applications.push(endApp);
        }

        return applications;
    }

    // Placeholder: Break start grace period (no expected schedule available)
    private async applyBreakStartGracePeriod(
        breakRecord: Break,
        graceConfig: any,
        graceExceptions: any[]
    ): Promise<GracePeriodApplication | null> {
        // Without explicit scheduled break start times in rules/config, we skip start-time adjustments.
        return null;
    }

    // Placeholder: Break end grace period (no expected schedule available)
    private async applyBreakEndGracePeriod(
        breakRecord: Break,
        graceConfig: any,
        graceExceptions: any[]
    ): Promise<GracePeriodApplication | null> {
        // Without explicit scheduled break durations per break type here, we skip end-time adjustments.
        return null;
    }

    // Send notification about grace period application
    private async sendGracePeriodNotification(application: GracePeriodApplication): Promise<void> {
        try {
            await notificationService.sendNotification({
                userId: application.userId,
                type: 'grace_period_applied',
                title: 'Grace Period Applied',
                message: application.reason,
                data: {
                    priority: 'low',
                    applicationId: application.id,
                    applicationType: application.applicationType,
                    graceMinutes: application.graceMinutes,
                    originalTime: application.originalTime,
                    adjustedTime: application.adjustedTime
                }
            });
        } catch (error) {
            console.error('Failed to send grace period notification:', error);
        }
    }

    // Validate working hours compliance
    private async validateWorkingHours(attendance: Attendance, rules: PolicyRules, userId: string): Promise<PolicyViolation[]> {
        const violations: PolicyViolation[] = [];

        if (!rules.workingHours || !attendance.total_hours) return violations;

        const minHours = rules.workingHours.minHoursPerDay || rules.workingHours.totalHoursPerDay || 8;
        const maxHours = rules.workingHours.maxHoursPerDay || 12;

        // Check minimum hours violation
        if (attendance.total_hours < minHours) {
            const violation: PolicyViolation = {
                id: uuidv4(),
                userId,
                policyTemplateId: await this.getPolicyTemplateIdForUser(userId),
                policyRuleId: 'working_hours_min',
                attendanceId: attendance.id,
                violationType: 'insufficient_working_hours',
                violationDetails: {
                    requiredHours: minHours,
                    actualHours: attendance.total_hours,
                    shortfall: minHours - attendance.total_hours
                },
                severity: attendance.total_hours < (minHours * 0.5) ? 'high' : 'medium',
                status: 'pending',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await this.savePolicyViolation(violation);
            violations.push(violation);
        }

        // Check maximum hours violation
        if (attendance.total_hours > maxHours) {
            const violation: PolicyViolation = {
                id: uuidv4(),
                userId,
                policyTemplateId: await this.getPolicyTemplateIdForUser(userId),
                policyRuleId: 'working_hours_max',
                attendanceId: attendance.id,
                violationType: 'excessive_working_hours',
                violationDetails: {
                    maxAllowedHours: maxHours,
                    actualHours: attendance.total_hours,
                    excess: attendance.total_hours - maxHours
                },
                severity: attendance.total_hours > (maxHours * 1.5) ? 'critical' : 'high',
                status: 'pending',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await this.savePolicyViolation(violation);
            violations.push(violation);
        }

        return violations;
    }

    // Validate check-in and check-out times
    private async validateCheckInOutTimes(attendance: Attendance, rules: PolicyRules, userId: string): Promise<PolicyViolation[]> {
        const violations: PolicyViolation[] = [];

        if (!rules.workingHours) return violations;

        const expectedStart = this.parseTime(rules.workingHours.startTime || '09:00');
        const expectedEnd = this.parseTime(rules.workingHours.endTime || '17:00');

        // Check late check-in (after grace period)
        if (attendance.check_in_time) {
            const checkInTime = new Date(attendance.check_in_time);
            const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
            const expectedStartMinutes = expectedStart.hours * 60 + expectedStart.minutes;
            const graceMinutes = rules.gracePeriods?.checkInGraceMinutes || 0;

            if (checkInMinutes > (expectedStartMinutes + graceMinutes)) {
                const lateMinutes = checkInMinutes - expectedStartMinutes;
                const violation: PolicyViolation = {
                    id: uuidv4(),
                    userId,
                    policyTemplateId: await this.getPolicyTemplateIdForUser(userId),
                    policyRuleId: 'check_in_time',
                    attendanceId: attendance.id,
                    violationType: 'late_check_in',
                    violationDetails: {
                        expectedTime: `${expectedStart.hours.toString().padStart(2, '0')}:${expectedStart.minutes.toString().padStart(2, '0')}`,
                        actualTime: `${checkInTime.getHours().toString().padStart(2, '0')}:${checkInTime.getMinutes().toString().padStart(2, '0')}`,
                        lateMinutes,
                        graceMinutesAllowed: graceMinutes
                    },
                    severity: lateMinutes > 60 ? 'high' : lateMinutes > 30 ? 'medium' : 'low',
                    status: 'pending',
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                await this.savePolicyViolation(violation);
                violations.push(violation);
            }
        }

        // Check early check-out (before grace period)
        if (attendance.check_out_time) {
            const checkOutTime = new Date(attendance.check_out_time);
            const checkOutMinutes = checkOutTime.getHours() * 60 + checkOutTime.getMinutes();
            const expectedEndMinutes = expectedEnd.hours * 60 + expectedEnd.minutes;
            const graceMinutes = rules.gracePeriods?.checkOutGraceMinutes || 0;

            if (checkOutMinutes < (expectedEndMinutes - graceMinutes)) {
                const earlyMinutes = expectedEndMinutes - checkOutMinutes;
                const violation: PolicyViolation = {
                    id: uuidv4(),
                    userId,
                    policyTemplateId: await this.getPolicyTemplateIdForUser(userId),
                    policyRuleId: 'check_out_time',
                    attendanceId: attendance.id,
                    violationType: 'early_check_out',
                    violationDetails: {
                        expectedTime: `${expectedEnd.hours.toString().padStart(2, '0')}:${expectedEnd.minutes.toString().padStart(2, '0')}`,
                        actualTime: `${checkOutTime.getHours().toString().padStart(2, '0')}:${checkOutTime.getMinutes().toString().padStart(2, '0')}`,
                        earlyMinutes,
                        graceMinutesAllowed: graceMinutes
                    },
                    severity: earlyMinutes > 60 ? 'high' : earlyMinutes > 30 ? 'medium' : 'low',
                    status: 'pending',
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                await this.savePolicyViolation(violation);
                violations.push(violation);
            }
        }

        return violations;
    }

    // Validate overtime rules
    private async validateOvertimeRules(attendance: Attendance, rules: PolicyRules, userId: string): Promise<PolicyViolation[]> {
        const violations: PolicyViolation[] = [];

        if (!rules.overtime || !attendance.total_hours) return violations;

        const overtimeThreshold = rules.overtime.thresholdHours || 8;
        const maxDailyHours = rules.overtime.maxDailyHours || 12;
        const requiresApproval = rules.overtime.requiresApproval || false;

        if (attendance.total_hours > overtimeThreshold) {
            const overtimeHours = attendance.total_hours - overtimeThreshold;

            // Check if overtime exceeds maximum allowed
            if (attendance.total_hours > maxDailyHours) {
                const violation: PolicyViolation = {
                    id: uuidv4(),
                    userId,
                    policyTemplateId: await this.getPolicyTemplateIdForUser(userId),
                    policyRuleId: 'overtime_max',
                    attendanceId: attendance.id,
                    violationType: 'excessive_overtime',
                    violationDetails: {
                        maxAllowedHours: maxDailyHours,
                        actualHours: attendance.total_hours,
                        overtimeHours,
                        excessHours: attendance.total_hours - maxDailyHours
                    },
                    severity: 'critical',
                    status: 'pending',
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                await this.savePolicyViolation(violation);
                violations.push(violation);
            }

            // Check if overtime requires approval
            if (requiresApproval) {
                const hasApproval = await this.checkOvertimeApproval(attendance.id);
                if (!hasApproval) {
                    const violation: PolicyViolation = {
                        id: uuidv4(),
                        userId,
                        policyTemplateId: await this.getPolicyTemplateIdForUser(userId),
                        policyRuleId: 'overtime_approval',
                        attendanceId: attendance.id,
                        violationType: 'unapproved_overtime',
                        violationDetails: {
                            overtimeHours,
                            requiresApproval: true,
                            approvalStatus: 'missing'
                        },
                        severity: 'medium',
                        status: 'pending',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };

                    await this.savePolicyViolation(violation);
                    violations.push(violation);
                }
            }
        }

        return violations;
    }

    // Validate break policies
    private async validateBreakPolicies(attendance: Attendance, rules: PolicyRules, userId: string): Promise<PolicyViolation[]> {
        const violations: PolicyViolation[] = [];

        if (!rules.breaks) return violations;

        const breaks = await this.getBreaksForAttendance(attendance.id);

        // Validate lunch break policy
        if (rules.breaks.lunchBreak) {
            const lunchBreaks = breaks.filter(b => b.break_type === 'lunch');
            const policy = rules.breaks.lunchBreak;

            if (policy.isMandatory && lunchBreaks.length === 0 && attendance.total_hours && attendance.total_hours >= 6) {
                const violation: PolicyViolation = {
                    id: uuidv4(),
                    userId,
                    policyTemplateId: await this.getPolicyTemplateIdForUser(userId),
                    policyRuleId: 'mandatory_lunch_break',
                    attendanceId: attendance.id,
                    violationType: 'missing_mandatory_break',
                    violationDetails: {
                        breakType: 'lunch',
                        isMandatory: true,
                        workHours: attendance.total_hours,
                        minimumWorkHoursForBreak: 6
                    },
                    severity: 'medium',
                    status: 'pending',
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                await this.savePolicyViolation(violation);
                violations.push(violation);
            }

            // Check for excessive lunch breaks
            if (lunchBreaks.length > policy.maxPerDay) {
                const violation: PolicyViolation = {
                    id: uuidv4(),
                    userId,
                    policyTemplateId: await this.getPolicyTemplateIdForUser(userId),
                    policyRuleId: 'excessive_lunch_breaks',
                    attendanceId: attendance.id,
                    violationType: 'excessive_breaks',
                    violationDetails: {
                        breakType: 'lunch',
                        maxAllowed: policy.maxPerDay,
                        actualCount: lunchBreaks.length
                    },
                    severity: 'low',
                    status: 'pending',
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                await this.savePolicyViolation(violation);
                violations.push(violation);
            }

            // Check for overly long lunch breaks
            for (const lunchBreak of lunchBreaks) {
                if (lunchBreak.duration_minutes && lunchBreak.duration_minutes > policy.durationMinutes * 1.5) {
                    const violation: PolicyViolation = {
                        id: uuidv4(),
                        userId,
                        policyTemplateId: await this.getPolicyTemplateIdForUser(userId),
                        policyRuleId: 'excessive_break_duration',
                        attendanceId: attendance.id,
                        violationType: 'excessive_break_duration',
                        violationDetails: {
                            breakType: 'lunch',
                            breakId: lunchBreak.id,
                            maxDuration: policy.durationMinutes,
                            actualDuration: lunchBreak.duration_minutes,
                            excessMinutes: lunchBreak.duration_minutes - policy.durationMinutes
                        },
                        severity: 'medium',
                        status: 'pending',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };

                    await this.savePolicyViolation(violation);
                    violations.push(violation);
                }
            }
        }

        return violations;
    }

    // Generate warnings for approaching thresholds
    private async generateWarnings(attendance: Attendance, rules: PolicyRules, userId: string): Promise<EnforcementWarning[]> {
        const warnings: EnforcementWarning[] = [];

        // Warning for approaching overtime threshold
        if (rules.overtime && attendance.total_hours) {
            const threshold = rules.overtime.thresholdHours || 8;
            const warningThreshold = threshold * 0.9; // 90% of threshold

            if (attendance.total_hours >= warningThreshold && attendance.total_hours < threshold) {
                const warning: EnforcementWarning = {
                    id: uuidv4(),
                    userId,
                    warningType: 'approaching_overtime',
                    message: `You are approaching overtime threshold. Current: ${attendance.total_hours}h, Threshold: ${threshold}h`,
                    severity: 'medium',
                    threshold,
                    currentValue: attendance.total_hours,
                    createdAt: new Date()
                };

                await this.saveEnforcementWarning(warning);
                warnings.push(warning);
            }
        }

        // Warning for approaching maximum daily hours
        if (rules.overtime && attendance.total_hours) {
            const maxHours = rules.overtime.maxDailyHours || 12;
            const warningThreshold = maxHours * 0.9;

            if (attendance.total_hours >= warningThreshold && attendance.total_hours < maxHours) {
                const warning: EnforcementWarning = {
                    id: uuidv4(),
                    userId,
                    warningType: 'approaching_max_hours',
                    message: `You are approaching maximum daily hours. Current: ${attendance.total_hours}h, Maximum: ${maxHours}h`,
                    severity: 'high',
                    threshold: maxHours,
                    currentValue: attendance.total_hours,
                    createdAt: new Date()
                };

                await this.saveEnforcementWarning(warning);
                warnings.push(warning);
            }
        }

        return warnings;
    }

    // Check escalation rules for repeated violations (enhanced)
    private async checkEscalationRules(violations: PolicyViolation[], userId: string): Promise<EscalationAction[]> {
        const escalations: EscalationAction[] = [];

        for (const violation of violations) {
            const escalationRules = await this.getEscalationRules(violation.policyTemplateId, violation.violationType);

            for (const rule of escalationRules) {
                const violationHistory = await this.getViolationHistory(userId, violation.violationType, rule.timeWindowDays);

                // Prevent spamming same escalation level recently
                const recentEscalation = await this.getRecentEscalation(userId, violation.violationType, rule.escalationLevel, 1);

                if (violationHistory.occurrences >= rule.occurrenceThreshold && !recentEscalation) {
                    const escalation: EscalationAction = {
                        id: uuidv4(),
                        userId,
                        violationId: violation.id,
                        escalationRuleId: rule.id,
                        escalationLevel: rule.escalationLevel,
                        actionType: rule.actionType,
                        actionDetails: {
                            ...rule.actionConfig,
                            violationType: violation.violationType,
                            occurrences: violationHistory.occurrences,
                            timeWindow: rule.timeWindowDays,
                            threshold: rule.occurrenceThreshold
                        },
                        triggeredAt: new Date(),
                        status: 'pending'
                    };

                    await this.saveEscalationAction(escalation);
                    await this.executeEscalationAction(escalation);
                    escalations.push(escalation);
                }
            }
        }

        return escalations;
    }

    // New method to check for recent escalations to prevent spam
    private async getRecentEscalation(userId: string, violationType: string, escalationLevel: number, withinDays: number): Promise<boolean> {
        const query = `
        SELECT COUNT(*) as count FROM escalation_actions ea
        JOIN escalation_rules er ON ea.escalation_rule_id = er.id
        WHERE ea.user_id = $1 
        AND er.violation_type = $2 
        AND ea.escalation_level = $3
        AND ea.triggered_at > NOW() - INTERVAL '${withinDays} days'
    `;

        const result = await pool.query(query, [userId, violationType, escalationLevel]);
        return parseInt(result.rows[0].count) > 0;
    }

    // Execute escalation actions (enhanced)
    private async executeEscalationAction(escalation: EscalationAction): Promise<void> {
        try {
            switch (escalation.actionType) {
                case 'warning':
                    await this.sendWarningNotification(escalation);
                    break;
                case 'notification':
                    await this.sendEscalationNotification(escalation);
                    break;
                case 'manager_alert':
                    await this.sendManagerAlert(escalation);
                    break;
                case 'hr_alert':
                    await this.sendHRAlert(escalation);
                    break;
                case 'disciplinary':
                    await this.initiateDisciplinaryAction(escalation);
                    break;
            }

            await this.updateEscalationStatus(escalation.id, 'completed');

            // Log escalation notification
            await this.logEscalationNotification(escalation);
        } catch (error) {
            console.error('Failed to execute escalation action:', error);
            await this.updateEscalationStatus(escalation.id, 'failed');
            await pool.query(
                'UPDATE escalation_actions SET error_message = $1 WHERE id = $2',
                [(error as any).message || String(error), escalation.id]
            );
        }
    }

    // Send notifications for violations and escalations
    private async sendViolationNotifications(result: EnforcementResult, userId: string): Promise<void> {
        // Send violation notifications
        for (const violation of result.violations) {
            await notificationService.sendNotification({
                userId,
                type: 'policy_violation',
                title: 'Policy Violation Detected',
                message: this.formatViolationMessage(violation),
                data: {

                    priority: this.mapSeverityToPriority(violation.severity),
                    violationId: violation.id,
                    violationType: violation.violationType,
                    severity: violation.severity
                }
            });
        }

        // Send warning notifications
        for (const warning of result.warnings) {
            await notificationService.sendNotification({
                userId,
                type: 'policy_violation',
                title: 'Policy Warning',
                message: warning.message,
                data: {

                    priority: this.mapSeverityToPriority(warning.severity),
                    warningId: warning.id,
                    warningType: warning.warningType
                }
            });
        }
    }

    // Utility methods
    private parseTime(timeString: string): { hours: number; minutes: number } {
        const [hours, minutes] = timeString.split(':').map(Number);
        return { hours, minutes };
    }

    private formatViolationMessage(violation: PolicyViolation): string {
        switch (violation.violationType) {
            case 'late_check_in':
                return `Late check-in detected. You were ${violation.violationDetails.lateMinutes} minutes late.`;
            case 'early_check_out':
                return `Early check-out detected. You left ${violation.violationDetails.earlyMinutes} minutes early.`;
            case 'insufficient_working_hours':
                return `Insufficient working hours. Required: ${violation.violationDetails.requiredHours}h, Actual: ${violation.violationDetails.actualHours}h`;
            case 'excessive_working_hours':
                return `Excessive working hours detected. Maximum: ${violation.violationDetails.maxAllowedHours}h, Actual: ${violation.violationDetails.actualHours}h`;
            case 'excessive_overtime':
                return `Excessive overtime detected. You worked ${violation.violationDetails.excessHours} hours beyond the maximum allowed.`;
            case 'unapproved_overtime':
                return `Unapproved overtime detected. ${violation.violationDetails.overtimeHours} hours of overtime requires approval.`;
            case 'missing_mandatory_break':
                return `Mandatory ${violation.violationDetails.breakType} break is missing for a ${violation.violationDetails.workHours}h work day.`;
            case 'excessive_breaks':
                return `Too many ${violation.violationDetails.breakType} breaks. Maximum: ${violation.violationDetails.maxAllowed}, Actual: ${violation.violationDetails.actualCount}`;
            case 'excessive_break_duration':
                return `${violation.violationDetails.breakType} break exceeded maximum duration by ${violation.violationDetails.excessMinutes} minutes.`;
            default:
                return 'Policy violation detected. Please review your attendance.';
        }
    }

    private mapSeverityToPriority(severity: string): 'low' | 'medium' | 'high' | 'urgent' {
        switch (severity) {
            case 'critical': return 'urgent';
            case 'high': return 'high';
            case 'medium': return 'medium';
            case 'low': return 'low';
            default: return 'medium';
        }
    }

    // Database operations
    private async getAttendanceById(attendanceId: string): Promise<Attendance | null> {
        const query = 'SELECT * FROM attendance WHERE id = $1';
        const result = await pool.query(query, [attendanceId]);
        return result.rows[0] || null;
    }

    private async getBreaksForAttendance(attendanceId: string): Promise<Break[]> {
        const query = 'SELECT * FROM breaks WHERE attendance_id = $1';
        const result = await pool.query(query, [attendanceId]);
        return result.rows;
    }

    private async getPolicyTemplateIdForUser(userId: string): Promise<string> {
        const policy = await policyTemplateService.getActivePolicyForUser(userId);
        return policy?.id || '';
    }

    private async checkOvertimeApproval(attendanceId: string): Promise<boolean> {
        const query = 'SELECT COUNT(*) FROM overtime_approvals WHERE attendance_id = $1 AND status = $2';
        const result = await pool.query(query, [attendanceId, 'approved']);
        return parseInt(result.rows[0].count) > 0;
    }

    private async savePolicyViolation(violation: PolicyViolation): Promise<void> {
        const query = `
            INSERT INTO policy_violations (
                id, user_id, policy_template_id, policy_rule_id, attendance_id,
                violation_type, violation_details, severity, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `;

        await pool.query(query, [
            violation.id, violation.userId, violation.policyTemplateId, violation.policyRuleId,
            violation.attendanceId, violation.violationType, JSON.stringify(violation.violationDetails),
            violation.severity, violation.status, violation.createdAt, violation.updatedAt
        ]);
    }

    private async saveGracePeriodApplication(application: GracePeriodApplication): Promise<void> {
        const query = `
            INSERT INTO grace_period_applications (
                id, user_id, attendance_id, break_id, application_type, 
                original_time, adjusted_time, grace_minutes, grace_source,
                grace_config_id, grace_exception_id, reason, applied_by, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `;

        await pool.query(query, [
            application.id, application.userId, application.attendanceId,
            application.breakId, application.applicationType, application.originalTime,
            application.adjustedTime, application.graceMinutes, application.graceSource,
            application.graceConfigId, application.graceExceptionId, application.reason,
            application.appliedBy, application.createdAt
        ]);

        // Send notification about grace period application
        await this.sendGracePeriodNotification(application);
    }

    private async saveEnforcementWarning(warning: EnforcementWarning): Promise<void> {
        const query = `
            INSERT INTO enforcement_warnings (
                id, user_id, warning_type, message, severity, threshold, current_value, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;

        await pool.query(query, [
            warning.id, warning.userId, warning.warningType, warning.message,
            warning.severity, warning.threshold, warning.currentValue, warning.createdAt
        ]);
    }

    // Enhanced escalation action saving with rule reference
    private async saveEscalationAction(escalation: EscalationAction): Promise<void> {
        const query = `
            INSERT INTO escalation_actions (
                id, user_id, violation_id, escalation_rule_id, escalation_level,
                action_type, action_details, triggered_at, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;

        await pool.query(query, [
            escalation.id, escalation.userId, escalation.violationId, escalation.escalationRuleId,
            escalation.escalationLevel, escalation.actionType, JSON.stringify(escalation.actionDetails),
            escalation.triggeredAt, escalation.status
        ]);
    }

    private async getEscalationRules(policyTemplateId: string, violationType: string): Promise<EscalationRule[]> {
        const query = `
            SELECT * FROM escalation_rules 
            WHERE policy_template_id = $1 AND violation_type = $2 AND is_active = true
            ORDER BY escalation_level ASC
        `;
        const result = await pool.query(query, [policyTemplateId, violationType]);
        return result.rows;
    }

    private async getViolationHistory(userId: string, violationType: string, timeWindowDays: number): Promise<ViolationHistory> {
        const query = `
            SELECT 
                COUNT(*) as occurrences,
                MIN(created_at) as first_occurrence,
                MAX(created_at) as last_occurrence,
                MAX(escalation_level) as escalation_level
            FROM policy_violations pv
            LEFT JOIN escalation_actions ea ON pv.id = ea.violation_id
            WHERE pv.user_id = $1 AND pv.violation_type = $2 
            AND pv.created_at >= NOW() - INTERVAL '%s days'
        `;

        const result = await pool.query(query, [userId, violationType, timeWindowDays]);
        const row = result.rows[0];

        return {
            userId,
            violationType,
            occurrences: parseInt(row.occurrences) || 0,
            firstOccurrence: row.first_occurrence,
            lastOccurrence: row.last_occurrence,
            escalationLevel: row.escalation_level || 0
        };
    }

    private async updateEscalationStatus(escalationId: string, status: 'pending' | 'completed' | 'failed'): Promise<void> {
        const query = 'UPDATE escalation_actions SET status = $1 WHERE id = $2';
        await pool.query(query, [status, escalationId]);
    }

    // Notification methods
    private async sendWarningNotification(escalation: EscalationAction): Promise<void> {
        await notificationService.sendNotification({
            userId: escalation.userId,
            type: 'policy_violation',
            title: 'Policy Warning',
            message: `Warning: Repeated ${escalation.actionDetails.violationType} violations detected.`,

            data: {
                priority: 'medium'
            }
        });
    }

    private async sendEscalationNotification(escalation: EscalationAction): Promise<void> {
        await notificationService.sendNotification({
            userId: escalation.userId,
            type: 'policy_violation',
            title: 'Policy Escalation',
            message: `Escalation Level ${escalation.escalationLevel}: Multiple ${escalation.actionDetails.violationType} violations require attention.`,

            data: {
                priority: 'high'
            }
        });
    }

    private async sendManagerAlert(escalation: EscalationAction): Promise<void> {
        // Get user's manager
        const managerQuery = 'SELECT manager_id FROM users WHERE id = $1';
        const managerResult = await pool.query(managerQuery, [escalation.userId]);
        const managerId = managerResult.rows[0]?.manager_id;

        if (managerId) {
            await notificationService.sendNotification({
                userId: managerId,
                type: 'policy_violation',
                title: 'Employee Policy Violation Alert',
                message: `Employee ${escalation.actionDetails.employeeName} has multiple ${escalation.actionDetails.violationType} violations requiring manager attention.`,

                data: {
                    priority: 'high'
                }
            });
        }
    }

    private async sendHRAlert(escalation: EscalationAction): Promise<void> {
        // Get HR users
        const hrQuery = 'SELECT id FROM users WHERE role = $1';
        const hrResult = await pool.query(hrQuery, ['hr']);

        const hrUsers = hrResult.rows;
        if (hrUsers.length > 0) {
            for (const hrUser of hrUsers) {
                await notificationService.sendNotification({
                    userId: hrUser.id,
                    type: 'policy_violation',
                    title: 'HR Policy Violation Alert',
                    message: `Employee ${escalation.actionDetails.employeeName} requires HR intervention for repeated ${escalation.actionDetails.violationType} violations.`,

                    data: {
                        priority: 'high'
                    }
                });
            }
        }
    }

    // Enhanced disciplinary action initiation
    private async initiateDisciplinaryAction(escalation: EscalationAction): Promise<void> {
        const actionType = (escalation.actionDetails as any).action_type || 'written_warning';
        const improvementPeriod = (escalation.actionDetails as any).improvement_period_days || 30;

        const disciplinaryAction: DisciplinaryAction = {
            id: uuidv4(),
            employeeId: escalation.userId,
            escalationActionId: escalation.id,
            violationType: (escalation.actionDetails as any).violationType,
            escalationLevel: escalation.escalationLevel,
            actionType,
            description: (escalation.actionDetails as any).message || `Formal disciplinary action for repeated ${(escalation.actionDetails as any).violationType} violations`,
            initiatedBy: 'system',
            initiatedAt: new Date(),
            status: 'pending',
            effectiveDate: new Date(),
            expiryDate: new Date(Date.now() + (improvementPeriod * 24 * 60 * 60 * 1000)),
            appealDeadline: new Date(Date.now() + (14 * 24 * 60 * 60 * 1000))
        };

        await this.saveDisciplinaryAction(disciplinaryAction);

        // Notify HR and employee
        await this.sendHRAlert(escalation);
        await this.sendDisciplinaryNotification(disciplinaryAction);
    }

    // New methods for enhanced escalation system
    private async saveDisciplinaryAction(action: DisciplinaryAction): Promise<void> {
        const query = `
            INSERT INTO disciplinary_actions (
                id, employee_id, escalation_action_id, violation_type, escalation_level,
                action_type, description, initiated_by, initiated_at, status,
                effective_date, expiry_date, appeal_deadline
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `;

        await pool.query(query, [
            action.id, action.employeeId, action.escalationActionId, action.violationType,
            action.escalationLevel, action.actionType, action.description, action.initiatedBy,
            action.initiatedAt, action.status, action.effectiveDate, action.expiryDate,
            action.appealDeadline
        ]);
    }

    private async logEscalationNotification(escalation: EscalationAction): Promise<void> {
        // Log notification to escalation_notifications table
        const query = `
            INSERT INTO escalation_notifications (
                escalation_action_id, recipient_id, recipient_type, notification_type,
                subject, content, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;

        await pool.query(query, [
            escalation.id, escalation.userId, 'employee', 'system',
            `Escalation Level ${escalation.escalationLevel}`,
            JSON.stringify(escalation.actionDetails),
            'sent'
        ]);
    }

    private async sendDisciplinaryNotification(action: DisciplinaryAction): Promise<void> {
        await notificationService.sendNotification({
            userId: action.employeeId,
            type: 'policy_escalation',
            title: 'Disciplinary Action Initiated',
            message: action.description,
            data: {

                actionType: action.actionType,
                effectiveDate: action.effectiveDate,
                appealDeadline: action.appealDeadline,
                priority: 'high'
            }
        });
    }

    // Public API methods
    async getViolationsForUser(userId: string, startDate?: Date, endDate?: Date): Promise<PolicyViolation[]> {
        let query = 'SELECT * FROM policy_violations WHERE user_id = $1';
        const params: any[] = [userId];

        if (startDate) {
            query += ' AND created_at >= $2';
            params.push(startDate.toISOString());
        }

        if (endDate) {
            query += ` AND created_at <= $${params.length + 1}`;
            params.push(endDate.toISOString());
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);
        return result.rows;
    }

    async acknowledgeViolation(violationId: string, userId: string, notes?: string): Promise<void> {
        const query = `
            UPDATE policy_violations 
            SET status = 'acknowledged', resolved_by = $1, resolved_at = $2, resolution_notes = $3
            WHERE id = $4
        `;

        await pool.query(query, [userId, new Date(), notes, violationId]);
    }

    async dismissViolation(violationId: string, userId: string, reason: string): Promise<void> {
        const query = `
            UPDATE policy_violations 
            SET status = 'dismissed', resolved_by = $1, resolved_at = $2, resolution_notes = $3
            WHERE id = $4
        `;

        await pool.query(query, [userId, new Date(), reason, violationId]);
    }

    async createEscalationRule(rule: Omit<EscalationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<EscalationRule> {
        const id = uuidv4();
        const now = new Date();

        const query = `
            INSERT INTO escalation_rules (
                id, policy_template_id, violation_type, occurrence_threshold,
                time_window_days, escalation_level, action_type, action_config,
                is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;

        const result = await pool.query(query, [
            id, rule.policyTemplateId, rule.violationType, rule.occurrenceThreshold,
            rule.timeWindowDays, rule.escalationLevel, rule.actionType,
            JSON.stringify(rule.actionConfig), rule.isActive, now, now
        ]);

        return result.rows[0];
    }

    // Method to get escalation statistics
    async getEscalationStatistics(startDate: Date, endDate: Date): Promise<{
        totalEscalations: number;
        escalationsByLevel: Record<number, number>;
        escalationsByType: Record<string, number>;
        disciplinaryActions: number;
        pendingEscalations: number;
    }> {
        const escalationsQuery = `
            SELECT 
                COUNT(*) as total_escalations,
                escalation_level,
                action_type,
                status
            FROM escalation_actions
            WHERE triggered_at BETWEEN $1 AND $2
            GROUP BY escalation_level, action_type, status
        `;

        const disciplinaryQuery = `
            SELECT COUNT(*) as disciplinary_count
            FROM disciplinary_actions
            WHERE initiated_at BETWEEN $1 AND $2
        `;

        const [escalationsResult, disciplinaryResult] = await Promise.all([
            pool.query(escalationsQuery, [startDate, endDate]),
            pool.query(disciplinaryQuery, [startDate, endDate])
        ]);

        const escalationsByLevel: Record<number, number> = {};
        const escalationsByType: Record<string, number> = {};
        let totalEscalations = 0;
        let pendingEscalations = 0;

        escalationsResult.rows.forEach((row: any) => {
            const count = parseInt(row.total_escalations);
            totalEscalations += count;
            escalationsByLevel[row.escalation_level] = (escalationsByLevel[row.escalation_level] || 0) + count;
            escalationsByType[row.action_type] = (escalationsByType[row.action_type] || 0) + count;

            if (row.status === 'pending') {
                pendingEscalations += count;
            }
        });

        return {
            totalEscalations,
            escalationsByLevel,
            escalationsByType,
            disciplinaryActions: parseInt(disciplinaryResult.rows[0]?.disciplinary_count || '0'),
            pendingEscalations
        };
    }

    async getEnforcementStatistics(startDate: Date, endDate: Date): Promise<{
        totalViolations: number;
        violationsByType: Record<string, number>;
        violationsBySeverity: Record<string, number>;
        escalationsTriggered: number;
        gracePeriodsApplied: number;
        complianceRate: number;
    }> {
        const violationsQuery = `
            SELECT 
                COUNT(*) as total_violations,
                violation_type,
                severity
            FROM policy_violations 
            WHERE created_at BETWEEN $1 AND $2
            GROUP BY violation_type, severity
        `;

        const escalationsQuery = `
            SELECT COUNT(*) as escalations
            FROM escalation_actions 
            WHERE triggered_at BETWEEN $1 AND $2
        `;

        const gracePeriodsQuery = `
            SELECT COUNT(*) as grace_periods
            FROM grace_period_applications 
            WHERE applied_at BETWEEN $1 AND $2
        `;

        const attendanceQuery = `
            SELECT COUNT(*) as total_attendance
            FROM attendance 
            WHERE date BETWEEN $1 AND $2
        `;

        const [violationsResult, escalationsResult, gracePeriodsResult, attendanceResult] = await Promise.all([
            pool.query(violationsQuery, [startDate, endDate]),
            pool.query(escalationsQuery, [startDate, endDate]),
            pool.query(gracePeriodsQuery, [startDate, endDate]),
            pool.query(attendanceQuery, [startDate, endDate])
        ]);

        const violationsByType: Record<string, number> = {};
        const violationsBySeverity: Record<string, number> = {};
        let totalViolations = 0;

        for (const row of violationsResult.rows) {
            const count = parseInt(row.total_violations);
            totalViolations += count;
            violationsByType[row.violation_type] = (violationsByType[row.violation_type] || 0) + count;
            violationsBySeverity[row.severity] = (violationsBySeverity[row.severity] || 0) + count;
        }

        const totalAttendance = parseInt(attendanceResult.rows[0]?.total_attendance || '0');
        const complianceRate = totalAttendance > 0 ? ((totalAttendance - totalViolations) / totalAttendance) * 100 : 100;

        return {
            totalViolations,
            violationsByType,
            violationsBySeverity,
            escalationsTriggered: parseInt(escalationsResult.rows[0]?.escalations || '0'),
            gracePeriodsApplied: parseInt(gracePeriodsResult.rows[0]?.grace_periods || '0'),
            complianceRate: Math.round(complianceRate * 100) / 100
        };
    }
}

// Export the service class and create a singleton instance
export { PolicyEnforcementService };
export const policyEnforcementService = new PolicyEnforcementService();
export default policyEnforcementService;