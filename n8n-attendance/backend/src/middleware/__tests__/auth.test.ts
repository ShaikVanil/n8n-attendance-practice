import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, requireRole } from '../auth';
import { testUtils } from '../../__tests__/setup';

describe('Authentication Middleware', () => {
  let app: express.Application;
  let validToken: string;
  let adminToken: string;
  let expiredToken: string;

  beforeEach(async () => {
    app = express();
    app.use(express.json());

    // Create test tokens
    const user = await testUtils.createTestUser({ role: 'employee' });
    const admin = await testUtils.createTestUser({ 
      email: 'admin@example.com',
      role: 'admin' 
    });

    validToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { userId: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    expiredToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '-1h' }
    );
  });

  describe('authenticateToken', () => {
    beforeEach(() => {
      app.use(authenticateToken);
      app.get('/protected', (req, res) => {
        res.json({ user: req.user, message: 'Access granted' });
      });
    });

    it('should allow access with valid token', async () => {
      // Act
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Assert
      expect(response.body.message).toBe('Access granted');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBeDefined();
    });

    it('should reject request without token', async () => {
      // Act & Assert
      await request(app)
        .get('/protected')
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      // Act & Assert
      await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('should reject request with expired token', async () => {
      // Act & Assert
      await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should handle malformed Authorization header', async () => {
      // Act & Assert
      await request(app)
        .get('/protected')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });
  });

  describe('requireRole', () => {
    beforeEach(() => {
      app.use(authenticateToken);
      app.get('/admin-only', requireRole(['admin']), (req, res) => {
        res.json({ message: 'Admin access granted' });
      });
      app.get('/manager-or-admin', requireRole(['manager', 'admin']), (req, res) => {
        res.json({ message: 'Manager/Admin access granted' });
      });
    });

    it('should allow admin access to admin-only endpoint', async () => {
      // Act & Assert
      await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should deny employee access to admin-only endpoint', async () => {
      // Act & Assert
      await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);
    });

    it('should allow admin access to manager-or-admin endpoint', async () => {
      // Act & Assert
      await request(app)
        .get('/manager-or-admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should include proper error message for insufficient permissions', async () => {
      // Act
      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);

      // Assert
      expect(response.body.error).toContain('Insufficient permissions');
    });
  });
});