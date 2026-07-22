import pool from '../config/database';
import { attendanceAutomationService } from './attendanceAutomationService';

export interface SystemConfig {
    // Working Hours Configuration
    workingHoursStart: string;
    workingHoursEnd: string;
    gracePeriodMinutes: number;
    allowWeekendCheckIn: boolean;
    maxCheckInsPerDay: number;

    // Break Configuration
    maxBreakDurationMinutes: number;
    maxBreaksPerDay: number;
    mandatoryBreakDuration: number;

    // Overtime Configuration
    overtimeThresholdHours: number;
    overtimeMultiplier: number;
    maxOvertimeHours: number;

    // Notification Configuration
    emailNotificationsEnabled: boolean;
    smsNotificationsEnabled: boolean;
    realTimeNotificationsEnabled: boolean;
    notificationRetryAttempts: number;
    notificationRetryDelayMinutes: number;
}

export interface OfficeConfig {
    id: string;
    name: string;
    address: string;
    timezone: string;
    workingHoursStart?: string;
    workingHoursEnd?: string;
    isActive: boolean;
    latitude?: number;
    longitude?: number;
    geofence_radius_meters?: number;
    geofence_enabled?: boolean;
}

export interface WifiNetworkConfig {
    id: string;
    ssid: string;
    bssid?: string;
    officeId: string;
    description?: string;
    isActive: boolean;
}

export interface GracePeriodConfig {
    id: string;
    officeId: string;
    checkInGrace: number;
    checkOutGrace: number;
    breakGrace: number;
    isActive: boolean;
}

export interface GracePeriodException {
    id: string;
    userId: string;
    officeId?: string;
    type: 'temporary' | 'permanent';
    graceType: 'check_in' | 'check_out' | 'break' | 'all';
    gracePeriod: number;
    validFrom: string;
    validTo?: string;
    reason?: string;
    createdBy: string;
    isActive: boolean;
}

export interface BreakPolicyConfig {
    id: string;
    officeId?: string;
    breakType: 'lunch' | 'short' | 'personal';
    maxDurationMinutes: number;
    maxBreaksPerDay: number;
    isMandatory: boolean;
    isActive: boolean;
}

class SystemConfigService {
    /**
     * Get all system configuration
     */
    async getSystemConfig(): Promise<SystemConfig> {
        try {
            const result = await pool.query(
                'SELECT category, key, value FROM system_config ORDER BY category, key'
            );

            const config: Partial<SystemConfig> = {};

            result.rows.forEach(row => {
                const { category, key, value } = row;

                switch (category) {
                    case 'attendance_automation':
                        switch (key) {
                            case 'working_hours_start':
                                config.workingHoursStart = value;
                                break;
                            case 'working_hours_end':
                                config.workingHoursEnd = value;
                                break;
                            case 'grace_period_minutes':
                                config.gracePeriodMinutes = parseInt(value);
                                break;
                            case 'allow_weekend_checkin':
                                config.allowWeekendCheckIn = value === 'true';
                                break;
                            case 'max_checkins_per_day':
                                config.maxCheckInsPerDay = parseInt(value);
                                break;
                        }
                        break;

                    case 'break_policies':
                        switch (key) {
                            case 'max_break_duration_minutes':
                                config.maxBreakDurationMinutes = parseInt(value);
                                break;
                            case 'max_breaks_per_day':
                                config.maxBreaksPerDay = parseInt(value);
                                break;
                            case 'mandatory_break_duration':
                                config.mandatoryBreakDuration = parseInt(value);
                                break;
                        }
                        break;

                    case 'overtime_policies':
                        switch (key) {
                            case 'overtime_threshold_hours':
                                config.overtimeThresholdHours = parseFloat(value);
                                break;
                            case 'overtime_multiplier':
                                config.overtimeMultiplier = parseFloat(value);
                                break;
                            case 'max_overtime_hours':
                                config.maxOvertimeHours = parseFloat(value);
                                break;
                        }
                        break;

                    case 'notifications':
                        switch (key) {
                            case 'email_enabled':
                                config.emailNotificationsEnabled = value === 'true';
                                break;
                            case 'sms_enabled':
                                config.smsNotificationsEnabled = value === 'true';
                                break;
                            case 'realtime_enabled':
                                config.realTimeNotificationsEnabled = value === 'true';
                                break;
                            case 'retry_attempts':
                                config.notificationRetryAttempts = parseInt(value);
                                break;
                            case 'retry_delay_minutes':
                                config.notificationRetryDelayMinutes = parseInt(value);
                                break;
                        }
                        break;
                }
            });

            // Set defaults for missing values
            return {
                workingHoursStart: config.workingHoursStart || '08:00',
                workingHoursEnd: config.workingHoursEnd || '18:00',
                gracePeriodMinutes: config.gracePeriodMinutes || 30,
                allowWeekendCheckIn: config.allowWeekendCheckIn || false,
                maxCheckInsPerDay: config.maxCheckInsPerDay || 1,
                maxBreakDurationMinutes: config.maxBreakDurationMinutes || 60,
                maxBreaksPerDay: config.maxBreaksPerDay || 3,
                mandatoryBreakDuration: config.mandatoryBreakDuration || 30,
                overtimeThresholdHours: config.overtimeThresholdHours || 8,
                overtimeMultiplier: config.overtimeMultiplier || 1.5,
                maxOvertimeHours: config.maxOvertimeHours || 4,
                emailNotificationsEnabled: config.emailNotificationsEnabled ?? true,
                smsNotificationsEnabled: config.smsNotificationsEnabled ?? false,
                realTimeNotificationsEnabled: config.realTimeNotificationsEnabled ?? true,
                notificationRetryAttempts: config.notificationRetryAttempts || 3,
                notificationRetryDelayMinutes: config.notificationRetryDelayMinutes || 5
            };
        } catch (error) {
            console.error('Error getting system config:', error);
            throw new Error('Failed to retrieve system configuration');
        }
    }

    /**
     * Update system configuration
     */
    async updateSystemConfig(updates: Partial<SystemConfig>): Promise<void> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            for (const [key, value] of Object.entries(updates)) {
                let category: string;
                let dbKey: string;

                // Map config keys to database categories and keys
                switch (key) {
                    case 'workingHoursStart':
                        category = 'attendance_automation';
                        dbKey = 'working_hours_start';
                        break;
                    case 'workingHoursEnd':
                        category = 'attendance_automation';
                        dbKey = 'working_hours_end';
                        break;
                    case 'gracePeriodMinutes':
                        category = 'attendance_automation';
                        dbKey = 'grace_period_minutes';
                        break;
                    case 'allowWeekendCheckIn':
                        category = 'attendance_automation';
                        dbKey = 'allow_weekend_checkin';
                        break;
                    case 'maxCheckInsPerDay':
                        category = 'attendance_automation';
                        dbKey = 'max_checkins_per_day';
                        break;
                    case 'maxBreakDurationMinutes':
                        category = 'break_policies';
                        dbKey = 'max_break_duration_minutes';
                        break;
                    case 'maxBreaksPerDay':
                        category = 'break_policies';
                        dbKey = 'max_breaks_per_day';
                        break;
                    case 'mandatoryBreakDuration':
                        category = 'break_policies';
                        dbKey = 'mandatory_break_duration';
                        break;
                    case 'overtimeThresholdHours':
                        category = 'overtime_policies';
                        dbKey = 'overtime_threshold_hours';
                        break;
                    case 'overtimeMultiplier':
                        category = 'overtime_policies';
                        dbKey = 'overtime_multiplier';
                        break;
                    case 'maxOvertimeHours':
                        category = 'overtime_policies';
                        dbKey = 'max_overtime_hours';
                        break;
                    case 'emailNotificationsEnabled':
                        category = 'notifications';
                        dbKey = 'email_enabled';
                        break;
                    case 'smsNotificationsEnabled':
                        category = 'notifications';
                        dbKey = 'sms_enabled';
                        break;
                    case 'realTimeNotificationsEnabled':
                        category = 'notifications';
                        dbKey = 'realtime_enabled';
                        break;
                    case 'notificationRetryAttempts':
                        category = 'notifications';
                        dbKey = 'retry_attempts';
                        break;
                    case 'notificationRetryDelayMinutes':
                        category = 'notifications';
                        dbKey = 'retry_delay_minutes';
                        break;
                    default:
                        continue; // Skip unknown keys
                }

                await client.query(
                    `INSERT INTO system_config (category, key, value, updated_at) 
           VALUES ($1, $2, $3, NOW()) 
           ON CONFLICT (category, key) 
           DO UPDATE SET value = $3, updated_at = NOW()`,
                    [category, dbKey, value.toString()]
                );
            }

            await client.query('COMMIT');

            // Update attendance automation service if relevant configs changed
            const attendanceKeys = ['workingHoursStart', 'workingHoursEnd', 'gracePeriodMinutes', 'allowWeekendCheckIn', 'maxCheckInsPerDay'];
            const hasAttendanceUpdates = Object.keys(updates).some(key => attendanceKeys.includes(key));

            if (hasAttendanceUpdates) {
                const attendanceConfig = {
                    workingHoursStart: updates.workingHoursStart,
                    workingHoursEnd: updates.workingHoursEnd,
                    gracePeriodMinutes: updates.gracePeriodMinutes,
                    allowWeekendCheckIn: updates.allowWeekendCheckIn,
                    maxCheckInsPerDay: updates.maxCheckInsPerDay
                };

                // Filter out undefined values
                const filteredConfig = Object.fromEntries(
                    Object.entries(attendanceConfig).filter(([_, value]) => value !== undefined)
                );

                await attendanceAutomationService.updateConfiguration(filteredConfig);
            }

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error updating system config:', error);
            throw new Error('Failed to update system configuration');
        } finally {
            client.release();
        }
    }

    /**
     * Get all office configurations
     */
    async getOffices(): Promise<OfficeConfig[]> {
        try {
            const result = await pool.query(
                `SELECT id, name, address, timezone, working_hours_start, working_hours_end, 
                COALESCE(is_active, true) as is_active, latitude, longitude, 
                geofence_radius_meters, geofence_enabled
         FROM office_locations 
         ORDER BY name`
            );
            return result.rows.map(row => ({
                id: row.id,
                name: row.name,
                address: row.address,
                timezone: row.timezone,
                workingHoursStart: row.working_hours_start,
                workingHoursEnd: row.working_hours_end,
                isActive: row.is_active,
                latitude: row.latitude,
                longitude: row.longitude,
                geofence_radius_meters: row.geofence_radius_meters,
                geofence_enabled: row.geofence_enabled
            }));
        } catch (error) {
            console.error('Error getting offices:', error);
            throw new Error('Failed to retrieve office configurations');
        }
    }

    /**
     * Create or update office configuration
     */
    async upsertOffice(office: Partial<OfficeConfig> & { name: string; address: string }): Promise<OfficeConfig> {
        try {
            console.log('Upserting office with data:', JSON.stringify(office, null, 2));
            
            if (office.id) {
                // Update existing office
                const result = await pool.query(
                    `UPDATE office_locations 
                     SET name = $2, address = $3, timezone = $4, working_hours_start = $5, 
                         working_hours_end = $6, latitude = $7, longitude = $8, 
                         geofence_radius_meters = $9, geofence_enabled = $10
                     WHERE id = $1 
                     RETURNING id, name, address, timezone, working_hours_start, working_hours_end, 
                               is_active, latitude, longitude, geofence_radius_meters, geofence_enabled`,
                    [
                      office.id,
                      office.name,
                      office.address,
                      office.timezone,
                      office.workingHoursStart,
                      office.workingHoursEnd,
                      office.latitude,
                      office.longitude,
                      office.geofence_radius_meters,
                      office.geofence_enabled
                    ]
                );
            
            if (result.rows.length === 0) {
                throw new Error('Office not found');
            }
            
            const row = result.rows[0];
            return {
                id: row.id,
                name: row.name,
                address: row.address,
                timezone: row.timezone,
                workingHoursStart: row.working_hours_start,
                workingHoursEnd: row.working_hours_end,
                isActive: row.is_active,
                latitude: row.latitude,
                longitude: row.longitude,
                geofence_radius_meters: row.geofence_radius_meters,
                geofence_enabled: row.geofence_enabled
            };
        } else {
            // Create new office
            const result = await pool.query(
                `INSERT INTO office_locations 
                     (name, address, timezone, working_hours_start, working_hours_end, 
                      latitude, longitude, geofence_radius_meters, geofence_enabled, is_active) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) 
                     RETURNING id, name, address, timezone, working_hours_start, working_hours_end, 
                               is_active, latitude, longitude, geofence_radius_meters, geofence_enabled`,
                    [
                      office.name,
                      office.address,
                      office.timezone,
                      office.workingHoursStart,
                      office.workingHoursEnd,
                      office.latitude,
                      office.longitude,
                      office.geofence_radius_meters,
                      office.geofence_enabled
                    ]
                );
            
            const row = result.rows[0];
            return {
                id: row.id,
                name: row.name,
                address: row.address,
                timezone: row.timezone,
                workingHoursStart: row.working_hours_start,
                workingHoursEnd: row.working_hours_end,
                isActive: row.is_active,
                latitude: row.latitude,
                longitude: row.longitude,
                geofence_radius_meters: row.geofence_radius_meters,
                geofence_enabled: row.geofence_enabled
            };
        }
    } catch (error) {
        console.error('Error upserting office:', error);
        console.error('Office data that caused error:', JSON.stringify(office, null, 2));
        throw new Error('Failed to save office configuration');
    }
}

    /**
     * Delete office configuration
     */
    async deleteOffice(officeId: string): Promise<void> {
        try {
            // Check if office has associated users or wifi networks
            const usersResult = await pool.query(
                'SELECT COUNT(*) as count FROM users WHERE current_location_id = $1',
                [officeId]
            );
    
            const wifiResult = await pool.query(
                'SELECT COUNT(*) as count FROM wifi_networks WHERE office_id = $1',
                [officeId]
            );
    
            if (parseInt(usersResult.rows[0].count) > 0) {
                throw new Error('Cannot delete office with associated users');
            }
    
            if (parseInt(wifiResult.rows[0].count) > 0) {
                throw new Error('Cannot delete office with associated Wi-Fi networks');
            }
    
            const result = await pool.query(
                'DELETE FROM office_locations WHERE id = $1',
                [officeId]
            );
    
            if (result.rowCount === 0) {
                throw new Error('Office not found');
            }
        } catch (error) {
            console.error('Error deleting office:', error);
            throw error;
        }
    }

    /**
     * Get Wi-Fi network configurations
     */
    async getWifiNetworks(): Promise<WifiNetworkConfig[]> {
        try {
            const result = await pool.query(
                `SELECT w.id, w.ssid, w.bssid, w.office_id, w.description,
                COALESCE(w.is_active, true) as is_active,
                o.name as office_name
         FROM wifi_networks w
         LEFT JOIN offices o ON w.office_id = o.id
         ORDER BY o.name, w.ssid`
            );

            return result.rows.map(row => ({
                id: row.id,
                ssid: row.ssid,
                bssid: row.bssid,
                officeId: row.office_id,
                description: row.description,
                isActive: row.is_active
            }));
        } catch (error) {
            console.error('Error getting Wi-Fi networks:', error);
            throw new Error('Failed to retrieve Wi-Fi network configurations');
        }
    }

    /**
     * Create or update Wi-Fi network configuration
     */
    async upsertWifiNetwork(network: Omit<WifiNetworkConfig, 'id'> & { id?: string }): Promise<WifiNetworkConfig> {
        try {
            if (network.id) {
                // Update existing network
                const result = await pool.query(
                    `UPDATE wifi_networks 
           SET ssid = $2, bssid = $3, office_id = $4, description = $5, 
               is_active = $6, updated_at = NOW()
           WHERE id = $1 
           RETURNING *`,
                    [network.id, network.ssid, network.bssid, network.officeId,
                    network.description, network.isActive]
                );

                if (result.rows.length === 0) {
                    throw new Error('Wi-Fi network not found');
                }

                const row = result.rows[0];
                return {
                    id: row.id,
                    ssid: row.ssid,
                    bssid: row.bssid,
                    officeId: row.office_id,
                    description: row.description,
                    isActive: row.is_active
                };
            } else {
                // Create new network
                const result = await pool.query(
                    `INSERT INTO wifi_networks (ssid, bssid, office_id, description, is_active)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
                    [network.ssid, network.bssid, network.officeId,
                    network.description, network.isActive]
                );

                const row = result.rows[0];
                return {
                    id: row.id,
                    ssid: row.ssid,
                    bssid: row.bssid,
                    officeId: row.office_id,
                    description: row.description,
                    isActive: row.is_active
                };
            }
        } catch (error) {
            console.error('Error upserting Wi-Fi network:', error);
            throw new Error('Failed to save Wi-Fi network configuration');
        }
    }

    /**
     * Delete Wi-Fi network configuration
     */
    async deleteWifiNetwork(networkId: string): Promise<void> {
        try {
            const result = await pool.query(
                'DELETE FROM wifi_networks WHERE id = $1',
                [networkId]
            );

            if (result.rowCount === 0) {
                throw new Error('Wi-Fi network not found');
            }
        } catch (error) {
            console.error('Error deleting Wi-Fi network:', error);
            throw error;
        }
    }

    /**
     * Get grace period configurations for all offices
     */
    async getGracePeriodConfigs(): Promise<GracePeriodConfig[]> {
        try {
            const result = await pool.query(`
        SELECT 
          gpc.id,
          gpc.office_id as "officeId",
          gpc.check_in_grace as "checkInGrace",
          gpc.check_out_grace as "checkOutGrace",
          gpc.break_grace as "breakGrace",
          gpc.is_active as "isActive"
        FROM grace_period_configs gpc
        WHERE gpc.is_active = true
        ORDER BY gpc.created_at
      `);

            return result.rows;
        } catch (error) {
            console.error('Error getting grace period configs:', error);
            throw new Error('Failed to retrieve grace period configurations');
        }
    }

    /**
     * Update grace period configuration for an office
     */
    async updateGracePeriodConfig(officeId: string, config: Partial<Omit<GracePeriodConfig, 'id' | 'officeId'>>): Promise<GracePeriodConfig> {
        try {
            const result = await pool.query(`
        UPDATE grace_period_configs 
        SET 
          check_in_grace = COALESCE($2, check_in_grace),
          check_out_grace = COALESCE($3, check_out_grace),
          break_grace = COALESCE($4, break_grace),
          is_active = COALESCE($5, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE office_id = $1
        RETURNING 
          id,
          office_id as "officeId",
          check_in_grace as "checkInGrace",
          check_out_grace as "checkOutGrace",
          break_grace as "breakGrace",
          is_active as "isActive"
      `, [officeId, config.checkInGrace, config.checkOutGrace, config.breakGrace, config.isActive]);

            if (result.rows.length === 0) {
                throw new Error('Grace period configuration not found');
            }

            return result.rows[0];
        } catch (error) {
            console.error('Error updating grace period config:', error);
            throw new Error('Failed to update grace period configuration');
        }
    }

    /**
     * Get grace period exceptions
     */
    async getGracePeriodExceptions(filters?: { userId?: string; officeId?: string; isActive?: boolean }): Promise<GracePeriodException[]> {
        try {
            let query = `
        SELECT 
          gpe.id,
          gpe.user_id as "userId",
          gpe.office_id as "officeId",
          gpe.type,
          gpe.grace_type as "graceType",
          gpe.grace_period as "gracePeriod",
          gpe.valid_from as "validFrom",
          gpe.valid_to as "validTo",
          gpe.reason,
          gpe.created_by as "createdBy",
          gpe.is_active as "isActive"
        FROM grace_period_exceptions gpe
        WHERE 1=1
      `;

            const params: any[] = [];
            let paramIndex = 1;

            if (filters?.userId) {
                query += ` AND gpe.user_id = $${paramIndex++}`;
                params.push(filters.userId);
            }

            if (filters?.officeId) {
                query += ` AND gpe.office_id = $${paramIndex++}`;
                params.push(filters.officeId);
            }

            if (filters?.isActive !== undefined) {
                query += ` AND gpe.is_active = $${paramIndex++}`;
                params.push(filters.isActive);
            }

            query += ` ORDER BY gpe.created_at DESC`;

            const result = await pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error getting grace period exceptions:', error);
            throw new Error('Failed to retrieve grace period exceptions');
        }
    }

    /**
     * Create grace period exception
     */
    async createGracePeriodException(exception: Omit<GracePeriodException, 'id' | 'isActive'>): Promise<GracePeriodException> {
        try {
            const result = await pool.query(`
        INSERT INTO grace_period_exceptions (
          user_id, office_id, type, grace_type, grace_period, 
          valid_from, valid_to, reason, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING 
          id,
          user_id as "userId",
          office_id as "officeId",
          type,
          grace_type as "graceType",
          grace_period as "gracePeriod",
          valid_from as "validFrom",
          valid_to as "validTo",
          reason,
          created_by as "createdBy",
          is_active as "isActive"
      `, [
                exception.userId,
                exception.officeId,
                exception.type,
                exception.graceType,
                exception.gracePeriod,
                exception.validFrom,
                exception.validTo,
                exception.reason,
                exception.createdBy
            ]);

            return result.rows[0];
        } catch (error) {
            console.error('Error creating grace period exception:', error);
            throw new Error('Failed to create grace period exception');
        }
    }

    /**
     * Update grace period exception
     */
    async updateGracePeriodException(id: string, updates: Partial<Omit<GracePeriodException, 'id' | 'userId' | 'createdBy'>>): Promise<GracePeriodException> {
        try {
            const result = await pool.query(`
        UPDATE grace_period_exceptions 
        SET 
          office_id = COALESCE($2, office_id),
          type = COALESCE($3, type),
          grace_type = COALESCE($4, grace_type),
          grace_period = COALESCE($5, grace_period),
          valid_from = COALESCE($6, valid_from),
          valid_to = COALESCE($7, valid_to),
          reason = COALESCE($8, reason),
          is_active = COALESCE($9, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING 
          id,
          user_id as "userId",
          office_id as "officeId",
          type,
          grace_type as "graceType",
          grace_period as "gracePeriod",
          valid_from as "validFrom",
          valid_to as "validTo",
          reason,
          created_by as "createdBy",
          is_active as "isActive"
      `, [
                id,
                updates.officeId,
                updates.type,
                updates.graceType,
                updates.gracePeriod,
                updates.validFrom,
                updates.validTo,
                updates.reason,
                updates.isActive
            ]);

            if (result.rows.length === 0) {
                throw new Error('Grace period exception not found');
            }

            return result.rows[0];
        } catch (error) {
            console.error('Error updating grace period exception:', error);
            throw new Error('Failed to update grace period exception');
        }
    }

    /**
     * Delete grace period exception
     */
    async deleteGracePeriodException(id: string): Promise<void> {
        try {
            const result = await pool.query(
                'DELETE FROM grace_period_exceptions WHERE id = $1',
                [id]
            );

            if (result.rowCount === 0) {
                throw new Error('Grace period exception not found');
            }
        } catch (error) {
            console.error('Error deleting grace period exception:', error);
            throw new Error('Failed to delete grace period exception');
        }
    }

    /**
     * Get effective grace period for a user at a specific office and grace type
     */
    async getEffectiveGracePeriod(userId: string, officeId: string, graceType: 'check_in' | 'check_out' | 'break', date: Date = new Date()): Promise<number> {
        try {
            // First check for active exceptions
            const exceptionResult = await pool.query(`
        SELECT grace_period
        FROM grace_period_exceptions
        WHERE user_id = $1 
          AND (office_id = $2 OR office_id IS NULL)
          AND (grace_type = $3 OR grace_type = 'all')
          AND is_active = true
          AND valid_from <= $4
          AND (valid_to IS NULL OR valid_to >= $4)
        ORDER BY 
          CASE WHEN office_id IS NOT NULL THEN 1 ELSE 2 END,
          CASE WHEN grace_type = $3 THEN 1 ELSE 2 END,
          created_at DESC
        LIMIT 1
      `, [userId, officeId, graceType, date.toISOString().split('T')[0]]);

            if (exceptionResult.rows.length > 0) {
                return exceptionResult.rows[0].grace_period;
            }

            // Fall back to office configuration
            const configResult = await pool.query(`
        SELECT 
          CASE 
            WHEN $2 = 'check_in' THEN check_in_grace
            WHEN $2 = 'check_out' THEN check_out_grace
            WHEN $2 = 'break' THEN break_grace
            ELSE 15
          END as grace_period
        FROM grace_period_configs
        WHERE office_id = $1 AND is_active = true
      `, [officeId, graceType]);

            if (configResult.rows.length > 0) {
                return configResult.rows[0].grace_period;
            }

            // Default fallback
            return graceType === 'break' ? 5 : 15;
        } catch (error) {
            console.error('Error getting effective grace period:', error);
            throw new Error('Failed to get effective grace period');
        }
    }

    // Break Policy Management Methods
    async getBreakPolicies(): Promise<BreakPolicyConfig[]> {
        try {
            const result = await pool.query(
                `SELECT id, office_id as "officeId", break_type as "breakType", 
                max_duration_minutes as "maxDurationMinutes", 
                max_breaks_per_day as "maxBreaksPerDay",
                is_mandatory as "isMandatory", is_active as "isActive"
         FROM break_policies 
         ORDER BY office_id NULLS FIRST, break_type`
            );
            return result.rows;
        } catch (error) {
            console.error('Error getting break policies:', error);
            throw new Error('Failed to retrieve break policies');
        }
    }

    async upsertBreakPolicy(policy: Omit<BreakPolicyConfig, 'id'> & { id?: string }): Promise<BreakPolicyConfig> {
        try {
            if (policy.id) {
                // Update existing policy
                const result = await pool.query(
                    `UPDATE break_policies 
                     SET max_duration_minutes = $1, max_breaks_per_day = $2, 
                         is_mandatory = $3, is_active = $4, updated_at = NOW()
                     WHERE id = $5
                     RETURNING id, office_id as "officeId", break_type as "breakType", 
                               max_duration_minutes as "maxDurationMinutes", 
                               max_breaks_per_day as "maxBreaksPerDay",
                               is_mandatory as "isMandatory", is_active as "isActive"`,
                    [policy.maxDurationMinutes, policy.maxBreaksPerDay, policy.isMandatory, policy.isActive, policy.id]
                );
                return result.rows[0];
            } else {
                // Create new policy
                const result = await pool.query(
                    `INSERT INTO break_policies (office_id, break_type, max_duration_minutes, max_breaks_per_day, is_mandatory, is_active)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING id, office_id as "officeId", break_type as "breakType", 
                               max_duration_minutes as "maxDurationMinutes", 
                               max_breaks_per_day as "maxBreaksPerDay",
                               is_mandatory as "isMandatory", is_active as "isActive"`,
                    [policy.officeId || null, policy.breakType, policy.maxDurationMinutes, policy.maxBreaksPerDay, policy.isMandatory, policy.isActive]
                );
                return result.rows[0];
            }
        } catch (error) {
            console.error('Error upserting break policy:', error);
            throw new Error('Failed to save break policy');
        }
    }

    async deleteBreakPolicy(policyId: string): Promise<void> {
        try {
            const result = await pool.query(
                'DELETE FROM break_policies WHERE id = $1',
                [policyId]
            );
            
            if (result.rowCount === 0) {
                throw new Error('Break policy not found');
            }
        } catch (error) {
            console.error('Error deleting break policy:', error);
            throw new Error('Failed to delete break policy');
        }
    }
}
export { SystemConfigService };
export const systemConfigService = new SystemConfigService();