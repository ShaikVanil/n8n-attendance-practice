import api from './api';

export interface SystemConfig {
  id: string;
  category: string;
  key: string;
  value: string;
  description?: string;
  updatedAt: string;
}

export interface Office {
  id: string;
  name: string;
  address: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Add GPS fields
  latitude?: number;
  longitude?: number;
  geofence_radius_meters?: number;
  geofence_enabled?: boolean;
}

export interface WiFiNetwork {
  id: string;
  officeId: string;
  ssid: string;
  bssid?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOfficeRequest {
  name: string;
  address: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  timezone: string;
  latitude?: number;
  longitude?: number;
  geofence_radius_meters?: number;
  geofence_enabled?: boolean;
}

export interface UpdateOfficeRequest {
  name?: string;
  address?: string;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  timezone?: string;
  isActive?: boolean;
  latitude?: number;
  longitude?: number;
  geofence_radius_meters?: number;
  geofence_enabled?: boolean;
}

export interface CreateWiFiRequest {
  officeId: string;
  ssid: string;
  bssid?: string;
}

export interface UpdateWiFiRequest {
  ssid?: string;
  bssid?: string;
  isActive?: boolean;
  officeId?: string; // Add this field
}

export interface SystemConfigUpdate {
    // Attendance Automation
    workingHoursStart?: string;
    workingHoursEnd?: string;
    gracePeriodMinutes?: number;
    allowWeekendCheckIn?: boolean;
    maxCheckInsPerDay?: number;
    
    // Break Policies
    maxBreakDurationMinutes?: number;
    maxBreaksPerDay?: number;
    mandatoryBreakDuration?: number;
    
    // Overtime
    overtimeThresholdHours?: number;
    overtimeMultiplier?: number;
    maxOvertimeHours?: number;
    
    // Notifications
    emailNotificationsEnabled?: boolean;
    smsNotificationsEnabled?: boolean;
    realTimeNotificationsEnabled?: boolean;
    notificationRetryAttempts?: number;
    notificationRetryDelayMinutes?: number;
}

export class SystemConfigService {

  private static wifiNetworksCache: { data: WiFiNetwork[]; timestamp: number } | null = null;
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Add a method to clear the cache
  private static clearWiFiNetworksCache(): void {
    this.wifiNetworksCache = null;
  }

  // System Configuration
  static async getSystemConfig(): Promise<SystemConfig[]> {
    const response = await api.get('/system/config');
    const flatConfig = response.data;
    
    // Transform flat object into array format expected by UI
    const configArray: SystemConfig[] = [];
    
    // Map flat config to categorized array
    const configMapping = [
      // Attendance Automation
      { key: 'workingHoursStart', category: 'attendance_automation', dbKey: 'working_hours_start' },
      { key: 'workingHoursEnd', category: 'attendance_automation', dbKey: 'working_hours_end' },
      { key: 'gracePeriodMinutes', category: 'attendance_automation', dbKey: 'grace_period_minutes' },
      { key: 'allowWeekendCheckIn', category: 'attendance_automation', dbKey: 'allow_weekend_checkin' },
      { key: 'maxCheckInsPerDay', category: 'attendance_automation', dbKey: 'max_checkins_per_day' },
      
      // Break Policies
      { key: 'maxBreakDurationMinutes', category: 'break_policies', dbKey: 'max_break_duration_minutes' },
      { key: 'maxBreaksPerDay', category: 'break_policies', dbKey: 'max_breaks_per_day' },
      { key: 'mandatoryBreakDuration', category: 'break_policies', dbKey: 'mandatory_break_duration' },
      
      // Overtime
      { key: 'overtimeThresholdHours', category: 'overtime', dbKey: 'overtime_threshold_hours' },
      { key: 'overtimeMultiplier', category: 'overtime', dbKey: 'overtime_multiplier' },
      { key: 'maxOvertimeHours', category: 'overtime', dbKey: 'max_overtime_hours' },
      
      // Notifications
      { key: 'emailNotificationsEnabled', category: 'notifications', dbKey: 'email_enabled' },
      { key: 'smsNotificationsEnabled', category: 'notifications', dbKey: 'sms_enabled' },
      { key: 'realTimeNotificationsEnabled', category: 'notifications', dbKey: 'realtime_enabled' },
      { key: 'notificationRetryAttempts', category: 'notifications', dbKey: 'retry_attempts' },
      { key: 'notificationRetryDelayMinutes', category: 'notifications', dbKey: 'retry_delay_minutes' }
    ];
    
    configMapping.forEach(({ key, category, dbKey }) => {
      if (flatConfig[key] !== undefined) {
        configArray.push({
          id: `${category}.${dbKey}`,
          category,
          key: dbKey,
          value: flatConfig[key].toString(),
          description: `${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
          updatedAt: new Date().toISOString()
        });
      }
    });
    
    return configArray;
  }

  static async updateSystemConfig(config: SystemConfigUpdate): Promise<void> {
    await api.put('/system/config', config);
  }

  // Offices
  static async getOffices(): Promise<Office[]> {
    const response = await api.get('/system/offices');
    return response.data;
  }

  static async getOfficeById(id: string): Promise<Office> {
    const response = await api.get(`/system/offices/${id}`);
    return response.data;
  }

  static async createOffice(officeData: CreateOfficeRequest): Promise<Office> {
    const response = await api.post('/system/offices', officeData);
    return response.data;
  }

  static async updateOffice(id: string, officeData: UpdateOfficeRequest): Promise<Office> {
    const response = await api.put(`/system/offices/${id}`, officeData);
    return response.data;
  }

  static async deleteOffice(id: string): Promise<void> {
    await api.delete(`/system/offices/${id}`);
  }

  // WiFi Networks
  static async getWiFiNetworks(officeId?: string): Promise<WiFiNetwork[]> {
    try {
      const now = Date.now();
      
      // Return cached data if still valid
      if (this.wifiNetworksCache && 
          (now - this.wifiNetworksCache.timestamp) < this.CACHE_DURATION) {
        return this.wifiNetworksCache.data;
      }
      
      // Fetch fresh data
      const params = officeId ? { officeId } : {};
      const response = await api.get('/system/wifi-networks', { params });
      
      // Ensure response.data is an array
      const data = Array.isArray(response.data) ? response.data : [];
      
      // Update cache
      this.wifiNetworksCache = {
        data,
        timestamp: now
      };
      
      return data;
    } catch (error) {
      console.error('Error fetching WiFi networks:', error);
      // Return empty array instead of throwing error
      return [];
    }
  }

  static async getWiFiNetworkById(id: string): Promise<WiFiNetwork> {
    const response = await api.get(`/system/wifi-networks/${id}`);
    return response.data;
  }

  static async createWiFiNetwork(wifiData: CreateWiFiRequest): Promise<WiFiNetwork> {
    const response = await api.post('/system/wifi-networks', wifiData);
    // Clear cache after creating
    this.clearWiFiNetworksCache();
    return response.data;
  }

  static async updateWiFiNetwork(id: string, wifiData: UpdateWiFiRequest): Promise<WiFiNetwork> {
    const response = await api.put(`/system/wifi-networks/${id}`, wifiData);
    // Clear cache after updating
    this.clearWiFiNetworksCache();
    return response.data;
  }

  static async deleteWiFiNetwork(id: string): Promise<void> {
    await api.delete(`/system/wifi-networks/${id}`);
    // Clear cache after deleting
    this.clearWiFiNetworksCache();
  }

  // Add new method for WiFi detection (accessible to all authenticated users)
  static async getWiFiNetworksForDetection(): Promise<WiFiNetwork[]> {
    try {
      const response = await api.get('/system/wifi-networks/detection');
      
      // Ensure response.data is an array
      const data = Array.isArray(response.data) ? response.data : [];
      
      return data;
    } catch (error) {
      console.error('Error fetching WiFi networks for detection:', error);
      return [];
    }
  }
}