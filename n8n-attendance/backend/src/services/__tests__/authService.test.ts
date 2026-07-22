import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../authService';
import { testDb, testUtils } from '../../__tests__/setup';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      // Arrange
      const password = 'testpassword123';
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await testUtils.createTestUser({
        email: 'test@example.com',
        password_hash: hashedPassword
      });

      // Act
      const result = await authService.login('test@example.com', password);

      // Assert
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.password_hash).toBeUndefined(); // Should not return password
    });

    it('should fail login with invalid email', async () => {
      // Act
      const result = await authService.login('nonexistent@example.com', 'password');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(result.token).toBeUndefined();
    });

    it('should fail login with invalid password', async () => {
      // Arrange
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      await testUtils.createTestUser({
        email: 'test@example.com',
        password_hash: hashedPassword
      });

      // Act
      const result = await authService.login('test@example.com', 'wrongpassword');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should fail login for inactive user', async () => {
      // Arrange
      const password = 'testpassword123';
      const hashedPassword = await bcrypt.hash(password, 10);
      await testUtils.createTestUser({
        email: 'test@example.com',
        password_hash: hashedPassword,
        is_active: false
      });

      // Act
      const result = await authService.login('test@example.com', password);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Account is deactivated');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      // Arrange
      const user = await testUtils.createTestUser();
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      // Act
      const result = await authService.verifyToken(token);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.user.id).toBe(user.id);
      expect(result.user.email).toBe(user.email);
    });

    it('should reject invalid token', async () => {
      // Act
      const result = await authService.verifyToken('invalid.token.here');

      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject expired token', async () => {
      // Arrange
      const user = await testUtils.createTestUser();
      const expiredToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      // Act
      const result = await authService.verifyToken(expiredToken);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });
  });

  describe('register', () => {
    it('should successfully register new user', async () => {
      // Arrange
      const userData = {
        email: 'newuser@example.com',
        password: 'securepassword123',
        name: 'New User'
      };

      // Act
      const result = await authService.register(userData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.user.email).toBe(userData.email);
      expect(result.user.name).toBe(userData.name);
      expect(result.user.password_hash).toBeUndefined();
      expect(result.token).toBeDefined();
    });

    it('should fail to register user with existing email', async () => {
      // Arrange
      await testUtils.createTestUser({ email: 'existing@example.com' });
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Duplicate User'
      };

      // Act
      const result = await authService.register(userData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already exists');
    });

    it('should validate password strength', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: '123', // Weak password
        name: 'Test User'
      };

      // Act
      const result = await authService.register(userData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Password must be');
    });
  });
});