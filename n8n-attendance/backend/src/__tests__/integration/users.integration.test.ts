import request from 'supertest';
import express from 'express';
import { testDb, testUtils } from '../setup';
import userRoutes from '../../routes/users';
import authRoutes from '../../routes/auth';
import bcrypt from 'bcryptjs';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

describe('Users Integration Tests', () => {
  let adminToken: string;
  let employeeToken: string;
  let adminUser: any;
  let employeeUser: any;

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
    employeeUser = await testUtils.createTestUser({
      email: 'employee@example.com',
      password_hash: hashedPassword,
      name: 'Employee User',
      role: 'employee'
    });

    // Get admin token
    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'admin123' });
    adminToken = adminLoginResponse.body.token;

    // Get employee token
    const employeeLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'employee@example.com', password: 'admin123' });
    employeeToken = employeeLoginResponse.body.token;
  });

  describe('GET /api/users', () => {
    it('should get all users for admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toHaveLength(2);
      expect(response.body.users[0].password_hash).toBeUndefined();
    });

    it('should reject access for non-admin users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('access denied');
    });

    it('should support pagination and filtering', async () => {
      // Create additional users
      for (let i = 0; i < 5; i++) {
        await testUtils.createTestUser({
          email: `user${i}@example.com`,
          name: `User ${i}`,
          role: 'employee'
        });
      }

      const response = await request(app)
        .get('/api/users?page=1&limit=3&role=employee')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toHaveLength(3);
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(6);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by ID for admin', async () => {
      const response = await request(app)
        .get(`/api/users/${employeeUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe(employeeUser.id);
      expect(response.body.user.email).toBe(employeeUser.email);
      expect(response.body.user.password_hash).toBeUndefined();
    });

    it('should allow users to get their own profile', async () => {
      const response = await request(app)
        .get(`/api/users/${employeeUser.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe(employeeUser.id);
    });

    it('should reject access to other users for non-admin', async () => {
      const response = await request(app)
        .get(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('POST /api/users', () => {
    it('should create new user for admin', async () => {
      const newUserData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        role: 'employee'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(newUserData.email);
      expect(response.body.user.password_hash).toBeUndefined();

      // Verify user in database
      const dbUser = await testDb.query('SELECT * FROM users WHERE email = $1', [newUserData.email]);
      expect(dbUser.rows).toHaveLength(1);
    });

    it('should reject user creation for non-admin', async () => {
      const newUserData = {
        email: 'unauthorized@example.com',
        password: 'password123',
        name: 'Unauthorized User',
        role: 'employee'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(newUserData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user for admin', async () => {
      const updateData = {
        name: 'Updated Employee Name',
        role: 'manager'
      };

      const response = await request(app)
        .put(`/api/users/${employeeUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.name).toBe(updateData.name);
      expect(response.body.user.role).toBe(updateData.role);

      // Verify update in database
      const dbUser = await testDb.query('SELECT * FROM users WHERE id = $1', [employeeUser.id]);
      expect(dbUser.rows[0].name).toBe(updateData.name);
      expect(dbUser.rows[0].role).toBe(updateData.role);
    });

    it('should allow users to update their own profile (limited fields)', async () => {
      const updateData = {
        name: 'Self Updated Name'
      };

      const response = await request(app)
        .put(`/api/users/${employeeUser.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.name).toBe(updateData.name);
    });

    it('should reject role changes by non-admin users', async () => {
      const updateData = {
        role: 'admin' // Employee trying to make themselves admin
      };

      const response = await request(app)
        .put(`/api/users/${employeeUser.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user for admin', async () => {
      const response = await request(app)
        .delete(`/api/users/${employeeUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify deletion in database
      const dbUser = await testDb.query('SELECT * FROM users WHERE id = $1', [employeeUser.id]);
      expect(dbUser.rows).toHaveLength(0);
    });

    it('should reject user deletion for non-admin', async () => {
      const response = await request(app)
        .delete(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should prevent admin from deleting themselves', async () => {
      const response = await request(app)
        .delete(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('cannot delete yourself');
    });
  });
});