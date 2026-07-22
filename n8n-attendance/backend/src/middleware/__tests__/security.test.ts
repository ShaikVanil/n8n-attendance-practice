import request from 'supertest';
import express from 'express';
import { 
  securityHeaders, 
  apiRateLimit, 
  validateInput, 
  preventSQLInjection,
  requestSizeLimiter 
} from '../security';

describe('Security Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('securityHeaders', () => {
    it('should add security headers to response', async () => {
      // Arrange
      app.use(securityHeaders);
      app.get('/test', (req, res) => res.json({ success: true }));

      // Act & Assert
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['content-security-policy']).toBeDefined();
    });
  });

  describe('validateInput', () => {
    beforeEach(() => {
      app.use(validateInput);
      app.post('/test', (req, res) => res.json({ body: req.body }));
    });

    it('should allow valid input', async () => {
      // Act & Assert
      await request(app)
        .post('/test')
        .send({ name: 'John Doe', email: 'john@example.com' })
        .expect(200);
    });

    it('should reject XSS attempts', async () => {
      // Act & Assert
      await request(app)
        .post('/test')
        .send({ name: '<script>alert("xss")</script>' })
        .expect(400);
    });

    it('should reject oversized strings', async () => {
      // Arrange
      const longString = 'a'.repeat(10001); // Assuming 10000 char limit

      // Act & Assert
      await request(app)
        .post('/test')
        .send({ description: longString })
        .expect(400);
    });

    it('should sanitize HTML content', async () => {
      // Act
      const response = await request(app)
        .post('/test')
        .send({ content: '<p>Safe content</p><script>alert("bad")</script>' })
        .expect(200);

      // Assert
      expect(response.body.body.content).not.toContain('<script>');
      expect(response.body.body.content).toContain('<p>Safe content</p>');
    });
  });

  describe('preventSQLInjection', () => {
    beforeEach(() => {
      app.use(preventSQLInjection);
      app.post('/test', (req, res) => res.json({ success: true }));
    });

    it('should allow normal queries', async () => {
      // Act & Assert
      await request(app)
        .post('/test')
        .send({ search: 'normal search term' })
        .expect(200);
    });

    it('should block SQL injection attempts', async () => {
      // Arrange
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "UNION SELECT * FROM passwords",
        "'; INSERT INTO admin VALUES('hacker'); --"
      ];

      // Act & Assert
      for (const injection of sqlInjectionAttempts) {
        await request(app)
          .post('/test')
          .send({ query: injection })
          .expect(400);
      }
    });

    it('should allow legitimate SQL-like content in safe contexts', async () => {
      // Act & Assert
      await request(app)
        .post('/test')
        .send({ 
          description: 'This tutorial explains SELECT statements in SQL',
          code_example: 'SELECT name FROM users WHERE active = true'
        })
        .expect(200);
    });
  });

  describe('requestSizeLimiter', () => {
    beforeEach(() => {
      app.use(requestSizeLimiter);
      app.post('/test', (req, res) => res.json({ success: true }));
    });

    it('should accept normal sized requests', async () => {
      // Act & Assert
      await request(app)
        .post('/test')
        .send({ data: 'normal amount of data' })
        .expect(200);
    });

    it('should reject oversized requests', async () => {
      // Arrange
      const largeData = 'x'.repeat(11 * 1024 * 1024); // 11MB (assuming 10MB limit)

      // Act & Assert
      await request(app)
        .post('/test')
        .send({ data: largeData })
        .expect(413); // Payload Too Large
    });
  });

  describe('apiRateLimit', () => {
    beforeEach(() => {
      app.use(apiRateLimit);
      app.get('/test', (req, res) => res.json({ success: true }));
    });

    it('should allow requests within rate limit', async () => {
      // Act & Assert
      for (let i = 0; i < 5; i++) {
        await request(app)
          .get('/test')
          .expect(200);
      }
    });

    it('should block requests exceeding rate limit', async () => {
      // Arrange - Make requests up to the limit
      for (let i = 0; i < 100; i++) { // Assuming 100 req/min limit
        await request(app).get('/test');
      }

      // Act & Assert - Next request should be blocked
      await request(app)
        .get('/test')
        .expect(429); // Too Many Requests
    }, 10000);

    it('should include rate limit headers', async () => {
      // Act
      const response = await request(app)
        .get('/test')
        .expect(200);

      // Assert
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
  });
});