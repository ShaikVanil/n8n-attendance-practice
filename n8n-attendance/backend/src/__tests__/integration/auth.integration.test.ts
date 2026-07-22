import request from 'supertest';
import express from 'express';
import { testDb, testUtils } from '../setup';
import authRoutes from '../../routes/auth';
import bcrypt from 'bcryptjs';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        role: 'employee'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.name).toBe(userData.name);
      expect(response.body.user.role).toBe(userData.role);
      expect(response.body.user.password_hash).toBeUndefined();

      // Verify user was created in database
      const dbUser = await testDb.query('SELECT * FROM users WHERE email = $1', [userData.email]);
      expect(dbUser.rows).toHaveLength(1);
      expect(dbUser.rows[0].email).toBe(userData.email);
      
      // Verify password was hashed
      const isPasswordValid = await bcrypt.compare(userData.password, dbUser.rows[0].password_hash);
      expect(isPasswordValid).toBe(true);
    });

    it('should reject duplicate email registration', async () => {
      // Create existing user
      await testUtils.createTestUser({ email: 'existing@example.com' });

      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Duplicate User',
        role: 'employee'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123', // too short
        name: '',
        role: 'invalid-role'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user with known password
      const hashedPassword = await bcrypt.hash('password123', 10);
      await testUtils.createTestUser({
        email: 'testuser@example.com',
        password_hash: hashedPassword,
        name: 'Test User',
        role: 'employee'
      });
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'testuser@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(loginData.email);
      expect(response.body.user.password_hash).toBeUndefined();
    });

    it('should reject invalid credentials', async () => {
      const loginData = {
        email: 'testuser@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });
  });

  describe('GET /api/auth/profile', () => {
    let authToken: string;
    let testUser: any;

    beforeEach(async () => {
      // Create test user and get auth token
      const hashedPassword = await bcrypt.hash('password123', 10);
      testUser = await testUtils.createTestUser({
        email: 'profile@example.com',
        password_hash: hashedPassword,
        name: 'Profile User',
        role: 'employee'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'profile@example.com', password: 'password123' });
      
      authToken = loginResponse.body.token;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe(testUser.id);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.password_hash).toBeUndefined();
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('token');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('token');
    });
  });
});