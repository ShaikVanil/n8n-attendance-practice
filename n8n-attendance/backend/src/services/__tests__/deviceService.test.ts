import { DeviceService } from '../deviceService';
import { testDb, testUtils } from '../../__tests__/setup';

describe('DeviceService', () => {
  let deviceService: DeviceService;

  beforeEach(() => {
    deviceService = new DeviceService();
  });

  describe('registerDevice', () => {
    it('should successfully register a new device', async () => {
      // Arrange
      const deviceData = {
        device_id: 'DEV001',
        device_name: 'Office Scanner',
        location: 'Main Office',
        device_type: 'scanner'
      };

      // Act
      const result = await deviceService.registerDevice(deviceData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.device.device_id).toBe(deviceData.device_id);
      expect(result.device.device_name).toBe(deviceData.device_name);
      expect(result.device.is_active).toBe(true);
    });

    it('should fail to register device with duplicate device_id', async () => {
      // Arrange
      await testUtils.createTestDevice({ device_id: 'DEV001' });
      const duplicateDevice = {
        device_id: 'DEV001',
        device_name: 'Duplicate Device',
        location: 'Another Location'
      };

      // Act
      const result = await deviceService.registerDevice(duplicateDevice);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Device ID already exists');
    });

    it('should validate required fields', async () => {
      // Arrange
      const invalidDevice = {
        device_name: 'Test Device'
        // Missing device_id and location
      };

      // Act
      const result = await deviceService.registerDevice(invalidDevice);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Device ID is required');
    });
  });

  describe('getDeviceStatus', () => {
    it('should return device status with last activity', async () => {
      // Arrange
      const device = await testUtils.createTestDevice();
      const user = await testUtils.createTestUser();
      await testUtils.createTestAttendance({
        device_id: device.id,
        user_id: user.id,
        check_in_time: new Date()
      });

      // Act
      const result = await deviceService.getDeviceStatus(device.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.status.device_id).toBe(device.device_id);
      expect(result.status.is_active).toBe(true);
      expect(result.status.last_activity).toBeDefined();
      expect(result.status.total_scans_today).toBeGreaterThan(0);
    });

    it('should handle non-existent device', async () => {
      // Act
      const result = await deviceService.getDeviceStatus(999);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Device not found');
    });
  });

  describe('updateDeviceLocation', () => {
    it('should successfully update device location', async () => {
      // Arrange
      const device = await testUtils.createTestDevice({ location: 'Old Location' });
      const newLocation = 'New Location';

      // Act
      const result = await deviceService.updateDeviceLocation(device.id, newLocation);

      // Assert
      expect(result.success).toBe(true);
      expect(result.device.location).toBe(newLocation);
    });

    it('should log location change for audit trail', async () => {
      // Arrange
      const device = await testUtils.createTestDevice({ location: 'Old Location' });
      const newLocation = 'New Location';

      // Act
      await deviceService.updateDeviceLocation(device.id, newLocation);

      // Assert - Check audit log
      const auditLogs = await testDb.query(
        'SELECT * FROM audit_logs WHERE entity_type = $1 AND entity_id = $2',
        ['device', device.id]
      );
      expect(auditLogs.rows.length).toBeGreaterThan(0);
      expect(auditLogs.rows[0].action).toBe('location_update');
    });
  });
});