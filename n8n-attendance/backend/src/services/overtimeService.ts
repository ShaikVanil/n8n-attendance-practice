import pool from '../config/database';
import { systemConfigService } from './systemConfigService';

export interface OvertimeCalculation {
    regularHours: number;
    overtimeHours: number;
    totalHours: number;
    overtimeThreshold: number;
    overtimeMultiplier: number;
    isOvertime: boolean;
    overtimeAmount?: number; // For payroll calculations
}

export interface DailyOvertimeStatus {
    userId: string;
    date: string;
    totalWorkHours: number;
    regularHours: number;
    overtimeHours: number;
    overtimeThreshold: number;
    isOvertime: boolean;
    overtimeStartTime?: Date;
    currentStatus: 'working' | 'overtime' | 'completed';
}

class OvertimeService {
    /**
     * Calculate overtime for given work hours
     */
    async calculateOvertime(workHours: number, userId?: string, officeId?: string): Promise<OvertimeCalculation> {
        try {
            const config = await systemConfigService.getSystemConfig();
            const threshold = config.overtimeThresholdHours;
            const multiplier = config.overtimeMultiplier;
            
            const isOvertime = workHours > threshold;
            const regularHours = Math.min(workHours, threshold);
            const overtimeHours = Math.max(0, workHours - threshold);
            
            return {
                regularHours,
                overtimeHours,
                totalHours: workHours,
                overtimeThreshold: threshold,
                overtimeMultiplier: multiplier,
                isOvertime,
                overtimeAmount: overtimeHours * multiplier
            };
        } catch (error) {
            console.error('Error calculating overtime:', error);
            throw new Error('Failed to calculate overtime');
        }
    }

    /**
     * Get current overtime status for a user
     */
    async getCurrentOvertimeStatus(userId: string): Promise<DailyOvertimeStatus | null> {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Get today's total work hours
            const attendanceQuery = `
                SELECT 
                    COALESCE(SUM(total_hours), 0) as completed_hours
                FROM attendance 
                WHERE user_id = $1 AND date = $2 AND status = 'completed'
            `;
            
            const attendanceResult = await pool.query(attendanceQuery, [userId, today]);
            let totalHours = parseFloat(attendanceResult.rows[0].completed_hours) || 0;
            
            // Add current session hours if checked in
            const currentSessionQuery = `
                SELECT check_in_time, id
                FROM attendance 
                WHERE user_id = $1 AND date = $2 AND status = 'active'
                ORDER BY check_in_time DESC
                LIMIT 1
            `;
            
            const currentSessionResult = await pool.query(currentSessionQuery, [userId, today]);
            
            if (currentSessionResult.rows.length > 0) {
                const checkInTime = new Date(currentSessionResult.rows[0].check_in_time);
                const currentTime = new Date();
                const sessionHours = (currentTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
                
                // Subtract break time
                const breakQuery = `
                    SELECT COALESCE(SUM(duration_minutes), 0) as total_break_minutes
                    FROM breaks 
                    WHERE attendance_id = $1 AND status = 'completed'
                `;
                
                const breakResult = await pool.query(breakQuery, [currentSessionResult.rows[0].id]);
                const breakHours = parseFloat(breakResult.rows[0].total_break_minutes) / 60 || 0;
                
                totalHours += Math.max(0, sessionHours - breakHours);
            }
            
            const overtimeCalc = await this.calculateOvertime(totalHours, userId);
            
            let currentStatus: 'working' | 'overtime' | 'completed' = 'completed';
            let overtimeStartTime: Date | undefined;
            
            if (currentSessionResult.rows.length > 0) {
                currentStatus = overtimeCalc.isOvertime ? 'overtime' : 'working';
                
                if (overtimeCalc.isOvertime) {
                    // Calculate when overtime started
                    const checkInTime = new Date(currentSessionResult.rows[0].check_in_time);
                    overtimeStartTime = new Date(checkInTime.getTime() + (overtimeCalc.overtimeThreshold * 60 * 60 * 1000));
                }
            }
            
            return {
                userId,
                date: today,
                totalWorkHours: totalHours,
                regularHours: overtimeCalc.regularHours,
                overtimeHours: overtimeCalc.overtimeHours,
                overtimeThreshold: overtimeCalc.overtimeThreshold,
                isOvertime: overtimeCalc.isOvertime,
                overtimeStartTime,
                currentStatus
            };
        } catch (error) {
            console.error('Error getting overtime status:', error);
            throw new Error('Failed to get overtime status');
        }
    }

    /**
     * Get overtime history for a user
     */
    async getOvertimeHistory(
        userId: string, 
        startDate?: string, 
        endDate?: string, 
        limit: number = 50, 
        offset: number = 0
    ): Promise<{ records: DailyOvertimeStatus[], total: number }> {
        try {
            let query = `
                SELECT 
                    user_id,
                    date,
                    COALESCE(SUM(total_hours), 0) as total_work_hours
                FROM attendance 
                WHERE user_id = $1 AND status = 'completed'
            `;
            
            const params: any[] = [userId];
            let paramIndex = 2;
            
            if (startDate) {
                query += ` AND date >= $${paramIndex}`;
                params.push(startDate);
                paramIndex++;
            }
            
            if (endDate) {
                query += ` AND date <= $${paramIndex}`;
                params.push(endDate);
                paramIndex++;
            }
            
            query += ` GROUP BY user_id, date ORDER BY date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(limit, offset);
            
            const result = await pool.query(query, params);
            
            const records: DailyOvertimeStatus[] = [];
            
            for (const row of result.rows) {
                const overtimeCalc = await this.calculateOvertime(parseFloat(row.total_work_hours), userId);
                
                records.push({
                    userId: row.user_id,
                    date: row.date,
                    totalWorkHours: parseFloat(row.total_work_hours),
                    regularHours: overtimeCalc.regularHours,
                    overtimeHours: overtimeCalc.overtimeHours,
                    overtimeThreshold: overtimeCalc.overtimeThreshold,
                    isOvertime: overtimeCalc.isOvertime,
                    currentStatus: 'completed'
                });
            }
            
            // Get total count
            let countQuery = `
                SELECT COUNT(DISTINCT date) as total
                FROM attendance 
                WHERE user_id = $1 AND status = 'completed'
            `;
            
            const countParams: any[] = [userId];
            let countParamIndex = 2;
            
            if (startDate) {
                countQuery += ` AND date >= $${countParamIndex}`;
                countParams.push(startDate);
                countParamIndex++;
            }
            
            if (endDate) {
                countQuery += ` AND date <= $${countParamIndex}`;
                countParams.push(endDate);
            }
            
            const countResult = await pool.query(countQuery, countParams);
            const total = parseInt(countResult.rows[0].total);
            
            return { records, total };
        } catch (error) {
            console.error('Error getting overtime history:', error);
            throw new Error('Failed to get overtime history');
        }
    }

    /**
     * Check if current work hours exceed maximum overtime limit
     */
    async checkOvertimeLimit(userId: string): Promise<{ exceedsLimit: boolean; maxHours: number; currentHours: number }> {
        try {
            const config = await systemConfigService.getSystemConfig();
            const maxOvertimeHours = config.maxOvertimeHours;
            const overtimeThreshold = config.overtimeThresholdHours;
            const maxTotalHours = overtimeThreshold + maxOvertimeHours;
            
            const status = await this.getCurrentOvertimeStatus(userId);
            const currentHours = status?.totalWorkHours || 0;
            
            return {
                exceedsLimit: currentHours > maxTotalHours,
                maxHours: maxTotalHours,
                currentHours
            };
        } catch (error) {
            console.error('Error checking overtime limit:', error);
            throw new Error('Failed to check overtime limit');
        }
    }

    /**
     * Get overtime statistics for reporting
     */
    async getOvertimeStats(
        startDate?: string, 
        endDate?: string, 
        userId?: string
    ): Promise<{
        totalOvertimeHours: number;
        totalOvertimeDays: number;
        averageOvertimePerDay: number;
        topOvertimeUsers: Array<{ userId: string; totalOvertimeHours: number; overtimeDays: number }>;
    }> {
        try {
            let query = `
                SELECT 
                    user_id,
                    date,
                    COALESCE(SUM(total_hours), 0) as daily_hours
                FROM attendance 
                WHERE status = 'completed'
            `;
            
            const params: any[] = [];
            let paramIndex = 1;
            
            if (startDate) {
                query += ` AND date >= $${paramIndex}`;
                params.push(startDate);
                paramIndex++;
            }
            
            if (endDate) {
                query += ` AND date <= $${paramIndex}`;
                params.push(endDate);
                paramIndex++;
            }
            
            if (userId) {
                query += ` AND user_id = $${paramIndex}`;
                params.push(userId);
            }
            
            query += ` GROUP BY user_id, date ORDER BY user_id, date`;
            
            const result = await pool.query(query, params);
            
            const config = await systemConfigService.getSystemConfig();
            const threshold = config.overtimeThresholdHours;
            
            let totalOvertimeHours = 0;
            let totalOvertimeDays = 0;
            const userStats = new Map<string, { totalOvertimeHours: number; overtimeDays: number }>();
            
            for (const row of result.rows) {
                const dailyHours = parseFloat(row.daily_hours);
                const overtimeHours = Math.max(0, dailyHours - threshold);
                
                if (overtimeHours > 0) {
                    totalOvertimeHours += overtimeHours;
                    totalOvertimeDays++;
                    
                    const userStat = userStats.get(row.user_id) || { totalOvertimeHours: 0, overtimeDays: 0 };
                    userStat.totalOvertimeHours += overtimeHours;
                    userStat.overtimeDays++;
                    userStats.set(row.user_id, userStat);
                }
            }
            
            const topOvertimeUsers = Array.from(userStats.entries())
                .map(([userId, stats]) => ({ userId, ...stats }))
                .sort((a, b) => b.totalOvertimeHours - a.totalOvertimeHours)
                .slice(0, 10);
            
            return {
                totalOvertimeHours,
                totalOvertimeDays,
                averageOvertimePerDay: totalOvertimeDays > 0 ? totalOvertimeHours / totalOvertimeDays : 0,
                topOvertimeUsers
            };
        } catch (error) {
            console.error('Error getting overtime stats:', error);
            throw new Error('Failed to get overtime statistics');
        }
    }
}

export const overtimeService = new OvertimeService();
export { OvertimeService };