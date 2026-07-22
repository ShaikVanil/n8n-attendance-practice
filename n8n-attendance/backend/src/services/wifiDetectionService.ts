import pool from '../config/database';
import { EventEmitter } from 'events';
import { DeviceService } from './deviceService';

interface NetworkDevice {
  macAddress: string;
  ipAddress: string;
  hostname?: string;
  connectionTime: Date;
  disconnectionTime?: Date;
  signalStrength?: number;
}

interface WifiNetwork {
  id: string;
  ssid: string;
  bssid: string;
  officeId: string;
  isActive: boolean;
}

export interface DeviceConnectionEvent {
  deviceId: string;
  macAddress: string;
  userId: string;
  networkId: string;
  connectionType: 'connect' | 'disconnect';
  timestamp: Date;
  signalStrength?: number;
  deviceName?: string;
  officeName?: string;
}

export class WifiDetectionService extends EventEmitter {
  private deviceService: DeviceService;
  private connectedDevices: Map<string, NetworkDevice> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;

  constructor() {
    super();
    this.deviceService = new DeviceService();
  }

  /**
   * Start Wi-Fi monitoring service
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('Wi-Fi monitoring is already running');
      return;
    }

    console.log('Starting Wi-Fi detection service...');
    this.isMonitoring = true;

    // Start periodic network scanning
    this.monitoringInterval = setInterval(async () => {
      await this.scanNetwork();
    }, 30000); // Scan every 30 seconds

    // Initial scan
    await this.scanNetwork();
    
    this.emit('monitoring-started');
  }

  /**
   * Stop Wi-Fi monitoring service
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    console.log('Stopping Wi-Fi detection service...');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.emit('monitoring-stopped');
  }

  /**
   * Scan network for connected devices
   */
  private async scanNetwork(): Promise<void> {
    try {
      // Get active Wi-Fi networks from database
      const activeNetworks = await this.getActiveWifiNetworks();
      
      for (const network of activeNetworks) {
        await this.scanNetworkDevices(network);
      }
    } catch (error) {
      console.error('Error scanning network:', error);
      this.emit('scan-error', error);
    }
  }

  /**
   * Scan devices on a specific network
   */
  private async scanNetworkDevices(network: WifiNetwork): Promise<void> {
    try {
      // In a real implementation, this would use network scanning tools
      // For now, we'll simulate device detection
      const detectedDevices = await this.detectNetworkDevices(network);
      
      for (const device of detectedDevices) {
        await this.processDeviceConnection(device, network);
      }
      
      // Check for disconnections
      await this.checkForDisconnections(network);
    } catch (error) {
      console.error(`Error scanning network ${network.ssid}:`, error);
    }
  }

  /**
   * Detect devices on network (simulated for now)
   * In production, this would integrate with network infrastructure
   */
  private async detectNetworkDevices(network: WifiNetwork): Promise<NetworkDevice[]> {
    // This is a placeholder implementation
    // In production, you would:
    // 1. Use SNMP to query router/access point
    // 2. Parse DHCP lease files
    // 3. Use network scanning tools like nmap
    // 4. Integrate with enterprise Wi-Fi controllers
    
    return [];
  }

  /**
   * Process device connection event
   */
  private async processDeviceConnection(device: NetworkDevice, network: WifiNetwork): Promise<void> {
    const deviceKey = `${device.macAddress}-${network.id}`;
    const existingConnection = this.connectedDevices.get(deviceKey);
    
    if (!existingConnection) {
      // New connection detected
      this.connectedDevices.set(deviceKey, device);
      
      // Check if this is a registered device
      const registeredDevice = await this.findRegisteredDevice(device.macAddress);
      
      if (registeredDevice) {
        // Get office name from network
        const officeResult = await pool.query(
          'SELECT name FROM offices WHERE id = $1',
          [network.officeId]
        );
        
        const connectionEvent: DeviceConnectionEvent = {
          deviceId: registeredDevice.id,
          macAddress: device.macAddress,
          userId: registeredDevice.userId,
          networkId: network.id,
          connectionType: 'connect',
          timestamp: device.connectionTime,
          signalStrength: device.signalStrength,
          deviceName: registeredDevice.name || registeredDevice.device_name,
          officeName: officeResult.rows[0]?.name || 'Unknown Office'
        };
        
        await this.logConnectionEvent(connectionEvent);
        this.emit('device-connected', connectionEvent);
      }
    }
  }

  /**
   * Check for device disconnections
   */
  private async checkForDisconnections(network: WifiNetwork): Promise<void> {
    const currentTime = new Date();
    const disconnectionThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const [deviceKey, device] of this.connectedDevices.entries()) {
      if (deviceKey.endsWith(`-${network.id}`)) {
        const timeSinceLastSeen = currentTime.getTime() - device.connectionTime.getTime();
        
        if (timeSinceLastSeen > disconnectionThreshold) {
          // Device disconnected
          this.connectedDevices.delete(deviceKey);
          
          const registeredDevice = await this.findRegisteredDevice(device.macAddress);
          
          if (registeredDevice) {
            const disconnectionEvent: DeviceConnectionEvent = {
              deviceId: registeredDevice.id,
              macAddress: device.macAddress,
              userId: registeredDevice.userId,
              networkId: network.id,
              connectionType: 'disconnect',
              timestamp: currentTime
            };
            
            await this.logConnectionEvent(disconnectionEvent);
            this.emit('device-disconnected', disconnectionEvent);
          }
        }
      }
    }
  }

  /**
   * Find registered device by MAC address
   */
  private async findRegisteredDevice(macAddress: string): Promise<any> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM devices WHERE mac_address = $1 AND status = $2',
        [macAddress, 'approved']
      );
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * Get active Wi-Fi networks from database
   */
  private async getActiveWifiNetworks(): Promise<WifiNetwork[]> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM wifi_networks WHERE is_active = true'
      );
      
      return result.rows.map(row => ({
        id: row.id,
        ssid: row.ssid,
        bssid: row.bssid,
        officeId: row.office_id,
        isActive: row.is_active
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Log connection event to database
   */
  private async logConnectionEvent(event: DeviceConnectionEvent): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query(
        `INSERT INTO device_connection_logs 
         (device_id, mac_address, user_id, network_id, connection_type, timestamp, signal_strength)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          event.deviceId,
          event.macAddress,
          event.userId,
          event.networkId,
          event.connectionType,
          event.timestamp,
          event.signalStrength || null
        ]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Get connection history for a device
   */
  async getDeviceConnectionHistory(deviceId: string, limit: number = 50): Promise<DeviceConnectionEvent[]> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `SELECT * FROM device_connection_logs 
         WHERE device_id = $1 
         ORDER BY timestamp DESC 
         LIMIT $2`,
        [deviceId, limit]
      );
      
      return result.rows.map(row => ({
        deviceId: row.device_id,
        macAddress: row.mac_address,
        userId: row.user_id,
        networkId: row.network_id,
        connectionType: row.connection_type,
        timestamp: row.timestamp,
        signalStrength: row.signal_strength
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Get currently connected devices
   */
  getConnectedDevices(): NetworkDevice[] {
    return Array.from(this.connectedDevices.values());
  }

  /**
   * Check if a specific device is currently connected
   */
  isDeviceConnected(macAddress: string): boolean {
    for (const device of this.connectedDevices.values()) {
      if (device.macAddress === macAddress) {
        return true;
      }
    }
    return false;
  }
}

// Singleton instance
export const wifiDetectionService = new WifiDetectionService();