import request from 'supertest';
import express from 'express';
import { testDb, testUtils } from '../setup';
import reportRoutes from '../../routes/reports';
import authRoutes from '../../routes/auth';
import bcrypt from 'bcryptjs';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);

describe('Reports Integration Tests', () => {
  let adminToken: string;
  let managerToken: string;
  let employeeToken: string;
  let adminUser: any;
  let managerUser: any;
  let employeeUser: any;
  let testDevice: any;

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create users with different roles
    adminUser = await testUtils.createTestUser({
      email: 'admin@example.com',
      password_hash: hashedPassword,
      name: 'Admin User',
      role: 'admin'
    });

    managerUser = await testUtils.createTestUser({
      email: 'manager@example.com',
      password_hash: hashedPassword,
      name: 'Manager User',
      role: 'manager'
    });

    employeeUser = await testUtils.createTestUser({
      email: 'employee@example.com',
      password_hash: hashedPassword,
      name: 'Employee User',
      role: 'employee'
    });

    // Create test device
    testDevice = await testUtils.createTestDevice({
      device_id: 'REPORT_DEVICE_001',
      device_name: 'Report Test Device',
      location: 'Report Office'
    });

    // Get auth tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });
    adminToken = adminLogin.body.token;

    const managerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'manager@example.com', password: 'password123' });
    managerToken = managerLogin.body.token;

    const employeeLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'employee@example.com', password: 'password123' });
    employeeToken = employeeLogin.body.token;

    // Create sample attendance data
    await createSampleAttendanceData();
  });

  async function createSampleAttendanceData() {
    const dates = [
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)  // 3 days ago
    ];

    for (const date of dates) {
      // Employee attendance
      await testUtils.createTestAttendance({
        user_id: employeeUser.id,
        device_id: testDevice.id,
        check_in_time: new Date(date.getTime() + 9 * 60 * 60 * 1000), // 9 AM
        check_out_time: new Date(date.getTime() + 17 * 60 * 60 * 1000), // 5 PM
        status: 'present'
      });

      // Manager attendance
      await testUtils.createTestAttendance({
        user_id: managerUser.id,
        device_id: testDevice.id,
        check_in_time: new Date(date.getTime() + 8 * 60 * 60 * 1000), // 8 AM
        check_out_time: new Date(date.getTime() + 18 * 60 * 60 * 1000), // 6 PM
        status: 'present'
      });
    }
  }

  describe('GET /api/reports/attendance', () => {
    it('should generate attendance report for admin', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/reports/attendance?start_date=${startDate}&end_date=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
      expect(response.body.report.summary).toBeDefined();
      expect(response.body.report.details).toBeDefined();
      expect(response.body.report.details.length).toBeGreaterThan(0);
    });

    it('should allow managers to generate reports', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/reports/attendance?start_date=${startDate}&end_date=${endDate}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
    });

    it('should reject report access for employees', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/reports/attendance?start_date=${startDate}&end_date=${endDate}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should filter reports by user_id', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/reports/attendance?start_date=${startDate}&end_date=${endDate}&user_id=${employeeUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.report.details).toBeDefined();
      // All records should be for the specified user
      response.body.report.details.forEach((record: any) => {
        expect(record.user_id).toBe(employeeUser.id);
      });
    });

    it('should validate date range parameters', async () => {
      const response = await request(app)
        .get('/api/reports/attendance?start_date=invalid-date&end_date=also-invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid date');
    });

    it('should require start_date and end_date parameters', async () => {
      const response = await request(app)
        .get('/api/reports/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });
  });

  describe('GET /api/reports/employee/:id', () => {
    it('should generate individual employee report for admin', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/reports/employee/${employeeUser.id}?start_date=${startDate}&end_date=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
      expect(response.body.report.employee).toBeDefined();
      expect(response.body.report.employee.id).toBe(employeeUser.id);
      expect(response.body.report.attendance_summary).toBeDefined();
      expect(response.body.report.attendance_records).toBeDefined();
    });

    it('should allow employees to view their own report', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/reports/employee/${employeeUser.id}?start_date=${startDate}&end_date=${endDate}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.report.employee.id).toBe(employeeUser.id);
    });

    it('should reject employees viewing other employee reports', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/reports/employee/${managerUser.id}?start_date=${startDate}&end_date=${endDate}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent employee', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/reports/employee/99999?start_date=${startDate}&end_date=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('GET /api/reports/summary', () => {
    it('should generate summary report for admin', async () => {
      const response = await request(app)
        .get('/api/reports/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.total_employees).toBeDefined();
      expect(response.body.summary.present_today).toBeDefined();
      expect(response.body.summary.absent_today).toBeDefined();
      expect(response.body.summary.late_today).toBeDefined();
    });

    it('should include department breakdown for managers', async () => {
      const response = await request(app)
        .get('/api/reports/summary')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.summary).toBeDefined();
    });

    it('should reject summary access for employees', async () => {
      const response = await request(app)
        .get('/api/reports/summary')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/reports/export', () => {
    it('should export attendance report as CSV for admin', async () => {
      const exportData = {
        format: 'csv',
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        include_summary: true
      };

      const response = await request(app)
        .post('/api/reports/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(exportData)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should export attendance report as PDF for admin', async () => {
      const exportData = {
        format: 'pdf',
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        include_charts: true
      };

      const response = await request(app)
        .post('/api/reports/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(exportData)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should reject export for employees', async () => {
      const exportData = {
        format: 'csv',
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      };

      const response = await request(app)
        .post('/api/reports/export')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(exportData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should validate export format', async () => {
      const exportData = {
        format: 'invalid-format',
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      };

      const response = await request(app)
        .post('/api/reports/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(exportData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid format');
    });
  });
});