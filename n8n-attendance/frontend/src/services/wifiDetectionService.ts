import api from './api';
import { SystemConfigService } from './systemConfigService';
import { locationService } from './locationService';

export interface WiFiNetwork {
  ssid: string;
  bssid?: string;
  signalStrength?: number;
  frequency?: number;
}

export interface WiFiDetectionResult {
  isConnected: boolean;
  currentNetwork?: WiFiNetwork;
  availableNetworks: WiFiNetwork[];
  matchedOffice?: {
    id: string;
    name: string;
    confidence: number;
  };
  detectionMethod: 'navigator' | 'api' | 'fallback';
  timestamp: string;
}

export interface SmartClockInStatus {
  wifiStatus: {
    isDetected: boolean;
    isMatched: boolean;
    officeName?: string;
    confidence: number;
  };
  locationStatus: {
    isDetected: boolean;
    isValid: boolean;
    distance?: number;
    accuracy?: number;
    matchedOffice?: {
      id: string;
      name: string;
    };
  };
  canAutoClockIn: boolean;
  recommendedAction: 'auto' | 'manual' | 'blocked';
  message: string;
  // Add fallback mode properties
  currentMode: 'primary' | 'fallback';
  isFallbackMode: boolean;
  fallbackReason?: string;
}

class WiFiDetectionService {
  private lastDetectionTime = 0;
  private readonly MIN_DETECTION_INTERVAL = 10000; // 10 seconds minimum
  private detectionInterval: NodeJS.Timeout | null = null;
  private listeners: ((result: WiFiDetectionResult) => void)[] = [];
  private lastDetectionResult: WiFiDetectionResult | null = null;
  private locationCache: Map<string, { result: any; timestamp: number }> = new Map();

  /**
   * Start WiFi detection monitoring
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.detectionInterval) {
      this.stopMonitoring();
    }

    // Initial detection
    this.detectWiFiNetworks();

    // Set up periodic detection
    this.detectionInterval = setInterval(() => {
      this.detectWiFiNetworks();
    }, intervalMs);
  }

  /**
   * Stop WiFi detection monitoring
   */
  stopMonitoring(): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
  }

  /**
   * Add listener for WiFi detection updates
   */
  addListener(callback: (result: WiFiDetectionResult) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current WiFi detection status
   */
  getCurrentStatus(): WiFiDetectionResult | null {
    return this.lastDetectionResult;
  }

  /**
   * Detect current WiFi networks
   */
  async detectWiFiNetworks(): Promise<WiFiDetectionResult> {
    try {
      // Try multiple detection methods
      let result = await this.detectViaNavigatorAPI();
      
      if (!result.isConnected) {
        result = await this.detectViaBackendAPI();
      }

      if (!result.isConnected) {
        result = await this.detectViaFallbackMethod();
      }

      // Match with office networks
      if (result.currentNetwork || result.availableNetworks.length > 0) {
        result.matchedOffice = await this.matchWithOfficeNetworks(result);
      }

      this.lastDetectionResult = result;
      this.notifyListeners(result);
      
      return result;
    } catch (error) {
      console.error('WiFi detection failed:', error);
      const fallbackResult: WiFiDetectionResult = {
        isConnected: false,
        availableNetworks: [],
        detectionMethod: 'fallback',
        timestamp: new Date().toISOString()
      };
      
      this.lastDetectionResult = fallbackResult;
      this.notifyListeners(fallbackResult);
      
      return fallbackResult;
    }
  }

  /**
   * Detect WiFi via Navigator API (limited browser support)
   */
  private async detectViaNavigatorAPI(): Promise<WiFiDetectionResult> {
    // Note: This is experimental and has limited browser support
    // Most browsers don't expose WiFi information for security reasons
    
    const result: WiFiDetectionResult = {
      isConnected: false,
      availableNetworks: [],
      detectionMethod: 'navigator',
      timestamp: new Date().toISOString()
    };

    try {
      // Check if we're online and can infer WiFi connection
      if (navigator.onLine) {
        // Try to get connection info (limited support)
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        
        if (connection && connection.type === 'wifi') {
          result.isConnected = true;
          // Unfortunately, we can't get SSID from browser for security reasons
          result.currentNetwork = {
            ssid: 'Connected WiFi Network',
            signalStrength: connection.downlink || undefined
          };
        }
      }
    } catch (error) {
      console.warn('Navigator WiFi detection not supported:', error);
    }

    return result;
  }

  /**
   * Detect WiFi via backend API
   */
  private async detectViaBackendAPI(): Promise<WiFiDetectionResult> {
    try {
      const response = await api.post('/wifi/detect');
      return {
        ...response.data,
        detectionMethod: 'api',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn('Backend WiFi detection failed:', error);
      return {
        isConnected: false,
        availableNetworks: [],
        detectionMethod: 'api',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Fallback detection method using network timing
   */
  private async detectViaFallbackMethod(): Promise<WiFiDetectionResult> {
    const result: WiFiDetectionResult = {
      isConnected: navigator.onLine,
      availableNetworks: [],
      detectionMethod: 'fallback',
      timestamp: new Date().toISOString()
    };

    if (navigator.onLine) {
      try {
        // Use network timing to infer connection type
        const startTime = performance.now();
        await fetch('/api/ping', { method: 'HEAD' });
        const endTime = performance.now();
        const latency = endTime - startTime;

        // Infer connection type based on latency (rough estimation)
        if (latency < 50) {
          result.currentNetwork = {
            ssid: 'High-speed Connection (likely WiFi)',
            signalStrength: 90
          };
        } else if (latency < 200) {
          result.currentNetwork = {
            ssid: 'Medium-speed Connection',
            signalStrength: 60
          };
        } else {
          result.currentNetwork = {
            ssid: 'Slow Connection',
            signalStrength: 30
          };
        }
      } catch (error) {
        console.warn('Fallback detection failed:', error);
      }
    }

    return result;
  }

  /**
   * Match detected networks with office networks
   */
  private async matchWithOfficeNetworks(detectionResult: WiFiDetectionResult): Promise<{ id: string; name: string; confidence: number } | undefined> {
    try {
      // Get all office WiFi networks using the detection endpoint
      const officeNetworks = await SystemConfigService.getWiFiNetworksForDetection();
      
      // Ensure officeNetworks is an array
      if (!Array.isArray(officeNetworks) || !officeNetworks.length) {
        console.warn('No office networks available or invalid data format');
        return undefined;
      }

      // Check current network first
      if (detectionResult.currentNetwork) {
        const match = this.findNetworkMatch(detectionResult.currentNetwork, officeNetworks);
        if (match) {
          return match;
        }
      }

      // Check available networks
      for (const network of detectionResult.availableNetworks) {
        const match = this.findNetworkMatch(network, officeNetworks);
        if (match) {
          return match;
        }
      }

      return undefined;
    } catch (error) {
      console.error('Error matching office networks:', error);
      return undefined;
    }
  }

  private findNetworkMatch(detectedNetwork: WiFiNetwork, officeNetworks: any[]): { id: string; name: string; confidence: number } | undefined {
    // Add safety check for officeNetworks
    if (!Array.isArray(officeNetworks)) {
      console.warn('officeNetworks is not an array:', officeNetworks);
      return undefined;
    }

    for (const officeNetwork of officeNetworks) {
      let confidence = 0;

      // SSID match
      if (detectedNetwork.ssid === officeNetwork.ssid) {
        confidence += 70;
      } else if (detectedNetwork.ssid.toLowerCase().includes(officeNetwork.ssid.toLowerCase())) {
        confidence += 40;
      }

      // BSSID match (if available)
      if (detectedNetwork.bssid && officeNetwork.bssid && detectedNetwork.bssid === officeNetwork.bssid) {
        confidence += 30;
      }

      // Signal strength bonus
      if (detectedNetwork.signalStrength && detectedNetwork.signalStrength > 50) {
        confidence += 10;
      }

      if (confidence >= 70) {
        return {
          id: officeNetwork.officeId,
          name: officeNetwork.ssid,
          confidence
        };
      }
    }

    return undefined;
  }

  /**
   * Get smart clock-in status combining WiFi and location
   */
  async getSmartClockInStatus(userLocation?: { latitude: number; longitude: number }): Promise<SmartClockInStatus> {
    console.log('🌐 [WiFiDetectionService] Getting smart clock-in status...', { userLocation });
    
    const wifiResult = await this.detectWiFiNetworks();
    console.log('📶 [WiFiDetectionService] WiFi detection result:', wifiResult);
    
    const status: SmartClockInStatus = {
      wifiStatus: {
        isDetected: wifiResult.isConnected,
        isMatched: !!wifiResult.matchedOffice,
        officeName: wifiResult.matchedOffice?.name,
        confidence: wifiResult.matchedOffice?.confidence || 0
      },
      locationStatus: {
        isDetected: !!userLocation,
        isValid: false,
        distance: undefined,
        accuracy: undefined,
        matchedOffice: undefined
      },
      canAutoClockIn: false,
      recommendedAction: 'manual',
      message: 'Manual check-in required',
      currentMode: 'primary',
      isFallbackMode: false
    };
  
    console.log('📊 [WiFiDetectionService] Initial status:', status);
  
    // Validate location if provided
    if (userLocation) {
      console.log('📍 [WiFiDetectionService] Validating location...');
      
      try {
        let locationValidation;
        
        // If WiFi matched, validate against that specific office
        if (wifiResult.matchedOffice) {
          console.log('🏢 [WiFiDetectionService] Validating against matched office:', wifiResult.matchedOffice.name);
          locationValidation = await api.post('/locations/validate', {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            officeId: wifiResult.matchedOffice.id
          });
        } else {
          console.log('🔍 [WiFiDetectionService] WiFi not matched, validating against all offices (fallback mode)');
          locationValidation = await api.post('/locations/validate', {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude
            // No officeId - will find nearest office
          });
        }
  
        console.log('✅ [WiFiDetectionService] Location validation response:', locationValidation.data);
        
        status.locationStatus.isValid = locationValidation.data.isValid;
        status.locationStatus.distance = locationValidation.data.distance;
        
        if (locationValidation.data.office) {
          status.locationStatus.matchedOffice = {
            id: locationValidation.data.office.id,
            name: locationValidation.data.office.name
          };
        }
      } catch (error) {
        console.error('💥 [WiFiDetectionService] Location validation failed:', {
          error: error instanceof Error ? error.message : error,
          response: error,
          status: error
        });
      }
    } else {
      console.log('📍 [WiFiDetectionService] No user location provided');
    }
  
    // Determine mode and auto clock-in eligibility
    const wifiConfident = status.wifiStatus.isMatched && status.wifiStatus.confidence >= 70;
    const locationValid = status.locationStatus.isValid;
    const hasLocation = !!userLocation;
  
    console.log('🔍 [WiFiDetectionService] Decision factors:', {
      wifiConfident,
      locationValid,
      hasLocation,
      wifiMatched: status.wifiStatus.isMatched,
      wifiConfidence: status.wifiStatus.confidence
    });
  
    // Primary mode: WiFi + Location
    if (wifiConfident && locationValid) {
      console.log('✅ [WiFiDetectionService] Primary mode: WiFi + Location');
      status.currentMode = 'primary';
      status.isFallbackMode = false;
      status.canAutoClockIn = true;
      status.recommendedAction = 'auto';
      status.message = `Auto clock-in available at ${status.wifiStatus.officeName}`;
    }
    // Primary mode: WiFi only (when location not available)
    else if (wifiConfident && !hasLocation) {
      console.log('✅ [WiFiDetectionService] Primary mode: WiFi only');
      status.currentMode = 'primary';
      status.isFallbackMode = false;
      status.canAutoClockIn = true;
      status.recommendedAction = 'auto';
      status.message = `WiFi detected at ${status.wifiStatus.officeName}. Auto clock-in available.`;
    }
    // Fallback mode: Location only (WiFi not available but location valid)
    else if (!status.wifiStatus.isMatched && locationValid && status.locationStatus.matchedOffice) {
      console.log('⚠️ [WiFiDetectionService] Fallback mode: Location only');
      status.currentMode = 'fallback';
      status.isFallbackMode = true;
      status.fallbackReason = 'WiFi not detected';
      status.canAutoClockIn = true;
      status.recommendedAction = 'auto';
      status.message = `Fallback mode: Location-only clock-in available at ${status.locationStatus.matchedOffice.name}`;
    }
    // WiFi detected but location validation failed
    else if (wifiConfident && hasLocation && !locationValid) {
      console.log('❌ [WiFiDetectionService] WiFi detected but location validation failed');
      status.currentMode = 'primary';
      status.isFallbackMode = false;
      status.recommendedAction = 'manual';
      status.message = `WiFi detected but location validation failed. Manual check-in required.`;
    }
    // Location detected but not valid (outside geofence)
    else if (hasLocation && !locationValid) {
      console.log('❌ [WiFiDetectionService] Location detected but not valid (outside geofence)');
      status.currentMode = 'fallback';
      status.isFallbackMode = true;
      status.fallbackReason = 'Outside office geofence';
      status.recommendedAction = 'blocked';
      status.message = `You are ${Math.round(status.locationStatus.distance || 0)}m from the nearest office. Move closer to enable clock-in.`;
    }
    // No WiFi and no location
    else if (!status.wifiStatus.isMatched && !hasLocation) {
      console.log('❌ [WiFiDetectionService] No WiFi and no location');
      status.currentMode = 'fallback';
      status.isFallbackMode = true;
      status.fallbackReason = 'WiFi and location not available';
      status.recommendedAction = 'blocked';
      status.message = 'Enable location services or connect to office WiFi to clock in.';
    }
    // Default case
    else {
      console.log('❌ [WiFiDetectionService] Default case - requirements not met');
      status.currentMode = 'fallback';
      status.isFallbackMode = true;
      status.fallbackReason = 'Requirements not met';
      status.recommendedAction = 'blocked';
      status.message = 'Clock-in requirements not met. Check WiFi and location.';
    }
  
    console.log('🎯 [WiFiDetectionService] Final status:', {
      canAutoClockIn: status.canAutoClockIn,
      currentMode: status.currentMode,
      isFallbackMode: status.isFallbackMode,
      message: status.message,
      recommendedAction: status.recommendedAction
    });
  
    return status;
  }

  /**
   * Notify all listeners of detection updates
   */
  private notifyListeners(result: WiFiDetectionResult): void {
    this.listeners.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        console.error('Error in WiFi detection listener:', error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopMonitoring();
    this.listeners = [];
    this.lastDetectionResult = null;
  }
}

export const wifiDetectionService = new WiFiDetectionService();