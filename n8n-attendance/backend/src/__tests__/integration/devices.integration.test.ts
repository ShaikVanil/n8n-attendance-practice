import request from 'supertest';
import express from 'express';
import { testDb, testUtils } from '../setup';
import deviceRoutes from '../../routes/devices';
import authRoutes from '../../routes/auth';
import bcrypt from 'bcryptjs';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);

describe('Devices Integration Tests', () => {
  let adminToken: string;
  let employeeToken: string;
  let adminUser: any;
  let testDevice: any;

  beforeEach(async () => {
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    adminUser = await testUtils.createTestUser({
      email: 'admin@example.com',
      password_hash: hashedPassword,
      name: 'Admin User',
      role: 'admin'
    });

    // Create employee user
    const employeeUser = await testUtils.createTestUser({
      email: 'employee@example.com',
      password_hash: hashedPassword,
      name: 'Employee User',
      role: 'employee'
    });

    // Get tokens
    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'admin123' });
    adminToken = adminLoginResponse.body.token;

    const employeeLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'employee@example.com', password: 'admin123' });
    employeeToken = employeeLoginResponse.body.token;

    // Create test device
    testDevice = await testUtils.createTestDevice({
      device_id: 'TEST_DEVICE_001',
      device_name: 'Test Device',
      location: 'Test Office'
    });
  });

  describe('GET /api/devices', () => {
    it('should get all devices for admin', async () => {
      const response = await request(app)
        .get('/api/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.devices).toHaveLength(1);
      expect(response.body.devices[0].device_id).toBe(testDevice.device_id);
    });

    it('should get devices for employees (read-only)', async () => {
      const response = await request(app)
        .get('/api/devices')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.devices).toHaveLength(1);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/devices')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should support filtering by location', async () => {
      // Create device in different location
      await testUtils.createTestDevice({
        device_id: 'TEST_DEVICE_002',
        device_name: 'Remote Device',
        location: 'Remote Office'
      });

      const response = await request(app)
        .get('/api/devices?location=Test Office')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.devices).toHaveLength(1);
      expect(response.body.devices[0].location).toBe('Test Office');
    });
  });

  describe('GET /api/devices/:id', () => {
    it('should get device by ID', async () => {
      const response = await request(app)
        .get(`/api/devices/${testDevice.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.device.id).toBe(testDevice.id);
      expect(response.body.device.device_id).toBe(testDevice.device_id);
    });

    it('should return 404 for non-existent device', async () => {
      const response = await request(app)
        .get('/api/devices/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('POST /api/devices', () => {
    it('should create new device for admin', async () => {
      const newDeviceData = {
        device_id: 'NEW_DEVICE_001',
        device_name: 'New Test Device',
        location: 'New Office',
        wifi_ssid: 'OfficeWiFi',
        wifi_bssid: '00:11:22:33:44:55'
      };

      const response = await request(app)
        .post('/api/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newDeviceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.device.device_id).toBe(newDeviceData.device_id);
      expect(response.body.device.device_name).toBe(newDeviceData.device_name);

      // Verify device in database
      const dbDevice = await testDb.query('SELECT * FROM devices WHERE device_id = $1', [newDeviceData.device_id]);
      expect(dbDevice.rows).toHaveLength(1);
    });

    it('should reject device creation for non-admin', async () => {
      const newDeviceData = {
        device_id: 'UNAUTHORIZED_DEVICE',
        device_name: 'Unauthorized Device',
        location: 'Unauthorized Office'
      };

      const response = await request(app)
        .post('/api/devices')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(newDeviceData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should reject duplicate device_id', async () => {
      const duplicateDeviceData = {
        device_id: testDevice.device_id, // Same as existing device
        device_name: 'Duplicate Device',
        location: 'Duplicate Office'
      };

      const response = await request(app)
        .post('/api/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateDeviceData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const invalidDeviceData = {
        device_name: 'Invalid Device'
        // Missing required device_id and location
      };

      const response = await request(app)
        .post('/api/devices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidDeviceData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('PUT /api/devices/:id', () => {
    it('should update device for admin', async () => {
      const updateData = {
        device_name: 'Updated Device Name',
        location: 'Updated Location',
        status: 'inactive'
      };

      const response = await request(app)
        .put(`/api/devices/${testDevice.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.device.device_name).toBe(updateData.device_name);
      expect(response.body.device.location).toBe(updateData.location);
      expect(response.body.device.status).toBe(updateData.status);

      // Verify update in database
      const dbDevice = await testDb.query('SELECT * FROM devices WHERE id = $1', [testDevice.id]);
      expect(dbDevice.rows[0].device_name).toBe(updateData.device_name);
    });

    it('should reject device update for non-admin', async () => {
      const updateData = {
        device_name: 'Unauthorized Update'
      };

      const response = await request(app)
        .put(`/api/devices/${testDevice.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/devices/:id', () => {
    it('should delete device for admin', async () => {
      const response = await request(app)
        .delete(`/api/devices/${testDevice.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify deletion in database
      const dbDevice = await testDb.query('SELECT * FROM devices WHERE id = $1', [testDevice.id]);
      expect(dbDevice.rows).toHaveLength(0);
    });

    it('should reject device deletion for non-admin', async () => {
      const response = await request(app)
        .delete(`/api/devices/${testDevice.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should prevent deletion of device with active attendance records', async () => {
      // Create attendance record for this device
      await testUtils.createTestAttendance({
        user_id: adminUser.id,
        device_id: testDevice.id,
        check_in_time: new Date(),
        status: 'present'
      });

      const response = await request(app)
        .delete(`/api/devices/${testDevice.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('active attendance records');
    });
  });

  describe('POST /api/devices/:id/status', () => {
    it('should update device status', async () => {
      const statusData = {
        status: 'maintenance',
        notes: 'Device under maintenance'
      };

      const response = await request(app)
        .post(`/api/devices/${testDevice.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(statusData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.device.status).toBe(statusData.status);

      // Verify status update in database
      const dbDevice = await testDb.query('SELECT * FROM devices WHERE id = $1', [testDevice.id]);
      expect(dbDevice.rows[0].status).toBe(statusData.status);
    });
  });
});