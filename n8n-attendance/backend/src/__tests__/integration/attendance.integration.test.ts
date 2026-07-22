import request from 'supertest';
import express from 'express';
import { testDb, testUtils } from '../setup';
import attendanceRoutes from '../../routes/attendance';
import authRoutes from '../../routes/auth';
import bcrypt from 'bcryptjs';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);

describe('Attendance Integration Tests', () => {
  let authToken: string;
  let testUser: any;
  let testDevice: any;

  beforeEach(async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await testUtils.createTestUser({
      email: 'attendance@example.com',
      password_hash: hashedPassword,
      name: 'Attendance User',
      role: 'employee'
    });

    // Create test device
    testDevice = await testUtils.createTestDevice({
      device_id: 'ATTENDANCE_DEVICE_001',
      device_name: 'Attendance Test Device',
      location: 'Test Office'
    });

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'attendance@example.com', password: 'password123' });
    
    authToken = loginResponse.body.token;
  });

  describe('POST /api/attendance/checkin', () => {
    it('should check in user successfully', async () => {
      const checkinData = {
        device_id: testDevice.device_id,
        location: {
          latitude: 40.7128,
          longitude: -74.0060
        }
      };

      const response = await request(app)
        .post('/api/attendance/checkin')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkinData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.attendance.user_id).toBe(testUser.id);
      expect(response.body.attendance.check_in_time).toBeDefined();
      expect(response.body.attendance.status).toBe('present');

      // Verify attendance record in database
      const dbAttendance = await testDb.query(
        'SELECT * FROM attendance_records WHERE user_id = $1 AND device_id = $2',
        [testUser.id, testDevice.id]
      );
      expect(dbAttendance.rows).toHaveLength(1);
      expect(dbAttendance.rows[0].status).toBe('present');
    });

    it('should prevent duplicate check-in on same day', async () => {
      // Create existing attendance record for today
      await testUtils.createTestAttendance({
        user_id: testUser.id,
        device_id: testDevice.id,
        check_in_time: new Date(),
        status: 'present'
      });

      const checkinData = {
        device_id: testDevice.device_id,
        location: {
          latitude: 40.7128,
          longitude: -74.0060
        }
      };

      const response = await request(app)
        .post('/api/attendance/checkin')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkinData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already checked in');
    });

    it('should reject check-in with invalid device', async () => {
      const checkinData = {
        device_id: 'INVALID_DEVICE',
        location: {
          latitude: 40.7128,
          longitude: -74.0060
        }
      };

      const response = await request(app)
        .post('/api/attendance/checkin')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkinData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Device not found');
    });

    it('should require authentication', async () => {
      const checkinData = {
        device_id: testDevice.device_id,
        location: {
          latitude: 40.7128,
          longitude: -74.0060
        }
      };

      const response = await request(app)
        .post('/api/attendance/checkin')
        .send(checkinData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/attendance/checkout', () => {
    beforeEach(async () => {
      // Create check-in record first
      await testUtils.createTestAttendance({
        user_id: testUser.id,
        device_id: testDevice.id,
        check_in_time: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
        status: 'present'
      });
    });

    it('should check out user successfully', async () => {
      const checkoutData = {
        device_id: testDevice.device_id,
        location: {
          latitude: 40.7128,
          longitude: -74.0060
        }
      };

      const response = await request(app)
        .post('/api/attendance/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.attendance.check_out_time).toBeDefined();
      expect(response.body.attendance.total_hours).toBeGreaterThan(0);

      // Verify checkout time in database
      const dbAttendance = await testDb.query(
        'SELECT * FROM attendance_records WHERE user_id = $1 AND device_id = $2',
        [testUser.id, testDevice.id]
      );
      expect(dbAttendance.rows[0].check_out_time).toBeDefined();
    });

    it('should reject checkout without check-in', async () => {
      // Clear existing attendance records
      await testDb.query('DELETE FROM attendance_records WHERE user_id = $1', [testUser.id]);

      const checkoutData = {
        device_id: testDevice.device_id,
        location: {
          latitude: 40.7128,
          longitude: -74.0060
        }
      };

      const response = await request(app)
        .post('/api/attendance/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No active check-in');
    });
  });

  describe('GET /api/attendance/status', () => {
    it('should get current attendance status', async () => {
      // Create attendance record
      await testUtils.createTestAttendance({
        user_id: testUser.id,
        device_id: testDevice.id,
        check_in_time: new Date(),
        status: 'present'
      });

      const response = await request(app)
        .get('/api/attendance/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('checked_in');
      expect(response.body.attendance).toBeDefined();
    });

    it('should return not checked in status', async () => {
      const response = await request(app)
        .get('/api/attendance/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('not_checked_in');
    });
  });

  describe('GET /api/attendance/history', () => {
    beforeEach(async () => {
      // Create multiple attendance records
      const dates = [
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        new Date() // today
      ];

      for (const date of dates) {
        await testUtils.createTestAttendance({
          user_id: testUser.id,
          device_id: testDevice.id,
          check_in_time: date,
          status: 'present'
        });
      }
    });

    it('should get attendance history with pagination', async () => {
      const response = await request(app)
        .get('/api/attendance/history?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.attendance).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(3);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
    });

    it('should filter attendance history by date range', async () => {
      const startDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/attendance/history?start_date=${startDate}&end_date=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.attendance.length).toBeGreaterThanOrEqual(2);
    });
  });
});