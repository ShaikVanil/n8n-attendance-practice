# Node.js Testing Guide

## Testing Strategy Overview

### Testing Pyramid for Node.js Applications
```
                 /\
                /  \
               / E2E \     <- End-to-End Tests (Few)
              /______\
             /        \
            /Integration\ <- Integration Tests (Some)
           /____________\
          /              \
         /   Unit Tests   \  <- Unit Tests (Many)
        /________________\
```

## Jest Configuration and Setup

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/types/**',
    '!src/config/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@models/(.*)$': '<rootDir>/src/models/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
  },
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true,
};
```

### Test Setup File
```typescript
// tests/setup.ts
import { database } from '@config/database';
import { redisClient } from '@config/redis';

// Mock external dependencies
jest.mock('@config/redis', () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    call: jest.fn(),
  },
}));

// Setup and teardown
beforeAll(async () => {
  // Initialize test database connection
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  // Close database connections
  await database.close();
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Global test utilities
global.testUtils = {
  mockUser: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  
  mockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides,
  }),
  
  mockResponse: () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
    return res;
  },
};
```

## Unit Testing

### Service Layer Testing
```typescript
// tests/unit/services/userService.test.ts
import { userService } from '@services/userService';
import { userRepository } from '@models/userRepository';
import { ApiError } from '@utils/ApiError';
import { hashPassword } from '@utils/password';

// Mock dependencies
jest.mock('@models/userRepository');
jest.mock('@utils/password');

const mockUserRepository = userRepository as jest.Mocked<typeof userRepository>;
const mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>;

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = global.testUtils.mockUser;
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.findById('123');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('123');
    });

    it('should throw ApiError when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.findById('123')).rejects.toThrow(ApiError);
      await expect(userService.findById('123')).rejects.toThrow('User not found');
    });
  });

  describe('create', () => {
    const createUserData = {
      email: 'new@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
    };

    it('should create user successfully', async () => {
      const hashedPassword = 'hashed_password';
      const createdUser = { ...global.testUtils.mockUser, ...createUserData };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockHashPassword.mockResolvedValue(hashedPassword);
      mockUserRepository.create.mockResolvedValue(createdUser);

      const result = await userService.create(createUserData);

      expect(result).toEqual(createdUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(createUserData.email);
      expect(mockHashPassword).toHaveBeenCalledWith(createUserData.password);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        ...createUserData,
        password: hashedPassword,
        role: 'user',
        isActive: true,
      });
    });

    it('should throw ApiError when email already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(global.testUtils.mockUser);

      await expect(userService.create(createUserData)).rejects.toThrow(ApiError);
      await expect(userService.create(createUserData)).rejects.toThrow('User with this email already exists');
    });

    it('should throw ApiError for invalid email format', async () => {
      const invalidData = { ...createUserData, email: 'invalid-email' };

      await expect(userService.create(invalidData)).rejects.toThrow(ApiError);
      await expect(userService.create(invalidData)).rejects.toThrow('Invalid email format');
    });
  });

  describe('update', () => {
    const updateData = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should update user successfully', async () => {
      const existingUser = global.testUtils.mockUser;
      const updatedUser = { ...existingUser, ...updateData };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.update('123', updateData);

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('123');
      expect(mockUserRepository.update).toHaveBeenCalledWith('123', updateData);
    });

    it('should check email uniqueness when updating email', async () => {
      const existingUser = global.testUtils.mockUser;
      const updateDataWithEmail = { ...updateData, email: 'newemail@example.com' };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.update.mockResolvedValue({ ...existingUser, ...updateDataWithEmail });

      await userService.update('123', updateDataWithEmail);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('newemail@example.com');
    });

    it('should throw ApiError when updating to existing email', async () => {
      const existingUser = global.testUtils.mockUser;
      const anotherUser = { ...global.testUtils.mockUser, id: 'different-id' };
      const updateDataWithEmail = { email: 'existing@example.com' };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.findByEmail.mockResolvedValue(anotherUser);

      await expect(userService.update('123', updateDataWithEmail)).rejects.toThrow(ApiError);
      await expect(userService.update('123', updateDataWithEmail)).rejects.toThrow('Email already in use');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const currentPassword = 'current123';
      const newPassword = 'new123';
      const hashedNewPassword = 'hashed_new_password';
      const user = { ...global.testUtils.mockUser, password: 'hashed_current' };

      mockUserRepository.findById.mockResolvedValue(user);
      jest.mocked(require('@utils/password').comparePassword).mockResolvedValue(true);
      mockHashPassword.mockResolvedValue(hashedNewPassword);
      mockUserRepository.update.mockResolvedValue(user);

      await userService.changePassword('123', currentPassword, newPassword);

      expect(mockUserRepository.update).toHaveBeenCalledWith('123', { password: hashedNewPassword });
    });

    it('should throw ApiError for incorrect current password', async () => {
      const user = global.testUtils.mockUser;
      mockUserRepository.findById.mockResolvedValue(user);
      jest.mocked(require('@utils/password').comparePassword).mockResolvedValue(false);

      await expect(userService.changePassword('123', 'wrong', 'new123')).rejects.toThrow(ApiError);
      await expect(userService.changePassword('123', 'wrong', 'new123')).rejects.toThrow('Current password is incorrect');
    });
  });
});
```

### Repository Testing
```typescript
// tests/unit/models/userRepository.test.ts
import { userRepository } from '@models/userRepository';
import { database } from '@config/database';
import { UserRole } from '@types/auth';

// Mock database
jest.mock('@config/database');
const mockDatabase = database as jest.Mocked<typeof database>;

describe('UserRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockRow = {
        id: '123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDatabase.query.mockResolvedValue({ rows: [mockRow] });

      const result = await userRepository.findById('123');

      expect(result).toEqual({
        id: '123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        isActive: true,
        createdAt: mockRow.created_at,
        updatedAt: mockRow.updated_at,
      });

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users WHERE id = $1'),
        ['123']
      );
    });

    it('should return null when user not found', async () => {
      mockDatabase.query.mockResolvedValue({ rows: [] });

      const result = await userRepository.findById('123');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create user successfully', async () => {
      const userData = {
        email: 'new@example.com',
        password: 'hashed_password',
        firstName: 'New',
        lastName: 'User',
        role: UserRole.USER,
        isActive: true,
      };

      const mockRow = {
        id: '123',
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        role: userData.role,
        is_active: userData.isActive,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDatabase.query.mockResolvedValue({ rows: [mockRow] });

      const result = await userRepository.create(userData);

      expect(result.email).toBe(userData.email);
      expect(result.firstName).toBe(userData.firstName);
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([userData.email, userData.password])
      );
    });
  });

  describe('findManyWithFilters', () => {
    it('should apply search filter correctly', async () => {
      const mockRows = [
        {
          id: '1',
          email: 'john@example.com',
          first_name: 'John',
          last_name: 'Doe',
          role: 'user',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDatabase.query.mockResolvedValue({ rows: mockRows });

      await userRepository.findManyWithFilters(
        { page: 1, limit: 10 },
        { search: 'john' }
      );

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['%john%', 10, 0])
      );
    });

    it('should apply role filter correctly', async () => {
      mockDatabase.query.mockResolvedValue({ rows: [] });

      await userRepository.findManyWithFilters(
        { page: 1, limit: 10 },
        { role: UserRole.ADMIN }
      );

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('role = $'),
        expect.arrayContaining([UserRole.ADMIN])
      );
    });
  });
});
```

### Utility Function Testing
```typescript
// tests/unit/utils/password.test.ts
import { hashPassword, comparePassword, generateSecurePassword } from '@utils/password';
import bcrypt from 'bcryptjs';

// Mock bcrypt
jest.mock('bcryptjs');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('Password Utils', () => {
  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const password = 'testpassword';
      const hashedPassword = 'hashed_password';

      mockBcrypt.hash.mockResolvedValue(hashedPassword);

      const result = await hashPassword(password);

      expect(result).toBe(hashedPassword);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 12);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      const password = 'testpassword';
      const hash = 'hashed_password';

      mockBcrypt.compare.mockResolvedValue(true);

      const result = await comparePassword(password, hash);

      expect(result).toBe(true);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hash);
    });

    it('should return false for non-matching passwords', async () => {
      const password = 'testpassword';
      const hash = 'different_hash';

      mockBcrypt.compare.mockResolvedValue(false);

      const result = await comparePassword(password, hash);

      expect(result).toBe(false);
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate password with default length', () => {
      const password = generateSecurePassword();

      expect(password).toHaveLength(16);
      expect(typeof password).toBe('string');
    });

    it('should generate password with custom length', () => {
      const length = 20;
      const password = generateSecurePassword(length);

      expect(password).toHaveLength(length);
    });

    it('should generate different passwords on multiple calls', () => {
      const password1 = generateSecurePassword();
      const password2 = generateSecurePassword();

      expect(password1).not.toBe(password2);
    });
  });
});
```

## Integration Testing

### API Endpoint Testing
```typescript
// tests/integration/routes/auth.test.ts
import request from 'supertest';
import App from '@/app';
import { database } from '@config/database';
import { userRepository } from '@models/userRepository';
import { hashPassword } from '@utils/password';

describe('Auth Routes', () => {
  let app: App;
  let server: any;

  beforeAll(async () => {
    app = new App();
    server = app.app;
    
    // Setup test database
    await database.query('BEGIN');
  });

  afterAll(async () => {
    await database.query('ROLLBACK');
    await database.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await database.query('DELETE FROM users WHERE email LIKE %test%');
  });

  describe('POST /api/v1/auth/register', () => {
    const registerData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should register user successfully', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            email: registerData.email,
            firstName: registerData.firstName,
            lastName: registerData.lastName,
            role: 'user',
            isActive: true,
          },
          token: expect.any(String),
        },
      });

      // Verify user was created in database
      const user = await userRepository.findByEmail(registerData.email);
      expect(user).toBeTruthy();
      expect(user?.firstName).toBe(registerData.firstName);
    });

    it('should return validation error for invalid email', async () => {
      const invalidData = { ...registerData, email: 'invalid-email' };

      const response = await request(server)
        .post('/api/v1/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation Error',
        errors: expect.arrayContaining([
          expect.stringContaining('valid email'),
        ]),
      });
    });

    it('should return error for duplicate email', async () => {
      // Create user first
      await userRepository.create({
        ...registerData,
        password: await hashPassword(registerData.password),
        role: 'user',
        isActive: true,
      });

      const response = await request(server)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        message: 'User with this email already exists',
      });
    });

    it('should return validation error for weak password', async () => {
      const weakPasswordData = { ...registerData, password: '123' };

      const response = await request(server)
        .post('/api/v1/auth/register')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body.errors).toContain(
        expect.stringContaining('Password must be at least 8 characters')
      );
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    beforeEach(async () => {
      // Create test user
      await userRepository.create({
        email: loginData.email,
        password: await hashPassword(loginData.password),
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        isActive: true,
      });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            email: loginData.email,
            role: 'user',
          },
          token: expect.any(String),
        },
      });
    });

    it('should return error for invalid email', async () => {
      const invalidData = { ...loginData, email: 'wrong@example.com' };

      const response = await request(server)
        .post('/api/v1/auth/login')
        .send(invalidData)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Invalid credentials',
      });
    });

    it('should return error for invalid password', async () => {
      const invalidData = { ...loginData, password: 'wrongpassword' };

      const response = await request(server)
        .post('/api/v1/auth/login')
        .send(invalidData)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Invalid credentials',
      });
    });

    it('should return error for inactive user', async () => {
      // Deactivate user
      const user = await userRepository.findByEmail(loginData.email);
      await userRepository.update(user!.id, { isActive: false });

      const response = await request(server)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.message).toContain('account is disabled');
    });
  });

  describe('Protected Routes', () => {
    let authToken: string;
    let testUser: any;

    beforeEach(async () => {
      // Create and login test user
      testUser = await userRepository.create({
        email: 'auth-test@example.com',
        password: await hashPassword('password123'),
        firstName: 'Auth',
        lastName: 'Test',
        role: 'user',
        isActive: true,
      });

      const loginResponse = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'auth-test@example.com',
          password: 'password123',
        });

      authToken = loginResponse.body.data.token;
    });

    it('should access protected route with valid token', async () => {
      const response = await request(server)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.email).toBe('auth-test@example.com');
    });

    it('should reject request without token', async () => {
      const response = await request(server)
        .get('/api/v1/users/me')
        .expect(401);

      expect(response.body.message).toContain('Access token is required');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(server)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toContain('Invalid token');
    });
  });
});
```

### Database Integration Testing
```typescript
// tests/integration/database/userRepository.integration.test.ts
import { userRepository } from '@models/userRepository';
import { database } from '@config/database';
import { UserRole } from '@types/auth';

describe('UserRepository Integration', () => {
  beforeAll(async () => {
    await database.query('BEGIN');
  });

  afterAll(async () => {
    await database.query('ROLLBACK');
    await database.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await database.query('DELETE FROM users WHERE email LIKE %test%');
  });

  describe('CRUD Operations', () => {
    it('should perform complete CRUD lifecycle', async () => {
      // Create
      const userData = {
        email: 'crud-test@example.com',
        password: 'hashed_password',
        firstName: 'CRUD',
        lastName: 'Test',
        role: UserRole.USER,
        isActive: true,
      };

      const createdUser = await userRepository.create(userData);
      expect(createdUser.id).toBeDefined();
      expect(createdUser.email).toBe(userData.email);

      // Read
      const foundUser = await userRepository.findById(createdUser.id);
      expect(foundUser).toBeTruthy();
      expect(foundUser?.email).toBe(userData.email);

      // Update
      const updateData = { firstName: 'Updated', lastName: 'Name' };
      const updatedUser = await userRepository.update(createdUser.id, updateData);
      expect(updatedUser.firstName).toBe('Updated');
      expect(updatedUser.lastName).toBe('Name');

      // Delete
      await userRepository.delete(createdUser.id);
      const deletedUser = await userRepository.findById(createdUser.id);
      expect(deletedUser).toBeNull();
    });
  });

  describe('Complex Queries', () => {
    beforeEach(async () => {
      // Create test data
      const users = [
        {
          email: 'admin-test@example.com',
          password: 'password',
          firstName: 'Admin',
          lastName: 'User',
          role: UserRole.ADMIN,
          isActive: true,
        },
        {
          email: 'user-test@example.com',
          password: 'password',
          firstName: 'Regular',
          lastName: 'User',
          role: UserRole.USER,
          isActive: true,
        },
        {
          email: 'inactive-test@example.com',
          password: 'password',
          firstName: 'Inactive',
          lastName: 'User',
          role: UserRole.USER,
          isActive: false,
        },
      ];

      for (const user of users) {
        await userRepository.create(user);
      }
    });

    it('should filter by role', async () => {
      const adminUsers = await userRepository.findManyWithFilters(
        { page: 1, limit: 10 },
        { role: UserRole.ADMIN }
      );

      expect(adminUsers).toHaveLength(1);
      expect(adminUsers[0].role).toBe(UserRole.ADMIN);
    });

    it('should filter by active status', async () => {
      const activeUsers = await userRepository.findManyWithFilters(
        { page: 1, limit: 10 },
        { isActive: true }
      );

      const inactiveUsers = await userRepository.findManyWithFilters(
        { page: 1, limit: 10 },
        { isActive: false }
      );

      expect(activeUsers.length).toBeGreaterThan(0);
      expect(inactiveUsers).toHaveLength(1);
      expect(inactiveUsers[0].isActive).toBe(false);
    });

    it('should search by name and email', async () => {
      const searchResults = await userRepository.findManyWithFilters(
        { page: 1, limit: 10 },
        { search: 'admin' }
      );

      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].firstName).toBe('Admin');
    });

    it('should handle pagination correctly', async () => {
      const page1 = await userRepository.findManyWithFilters({
        page: 1,
        limit: 2,
      });

      const page2 = await userRepository.findManyWithFilters({
        page: 2,
        limit: 2,
      });

      expect(page1).toHaveLength(2);
      expect(page2.length).toBeGreaterThanOrEqual(0);
      
      // Ensure no duplicate records between pages
      const page1Ids = page1.map(u => u.id);
      const page2Ids = page2.map(u => u.id);
      const intersection = page1Ids.filter(id => page2Ids.includes(id));
      expect(intersection).toHaveLength(0);
    });
  });

  describe('Transaction Handling', () => {
    it('should rollback on error during transaction', async () => {
      const initialCount = await userRepository.count();

      try {
        await userRepository.transaction(async (client) => {
          // Create a user
          await client.query(
            'INSERT INTO users (email, password, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5)',
            ['transaction-test@example.com', 'password', 'Transaction', 'Test', 'user']
          );

          // Force an error
          throw new Error('Simulated error');
        });
      } catch (error) {
        // Expected error
      }

      const finalCount = await userRepository.count();
      expect(finalCount).toBe(initialCount);
    });

    it('should commit on successful transaction', async () => {
      const initialCount = await userRepository.count();

      await userRepository.transaction(async (client) => {
        await client.query(
          'INSERT INTO users (email, password, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5)',
          ['transaction-success@example.com', 'password', 'Transaction', 'Success', 'user']
        );
      });

      const finalCount = await userRepository.count();
      expect(finalCount).toBe(initialCount + 1);

      // Verify user exists
      const user = await userRepository.findByEmail('transaction-success@example.com');
      expect(user).toBeTruthy();
    });
  });
});
```

## Mock Strategies

### Service Mocking
```typescript
// tests/mocks/services.ts
import { EmailService } from '@services/emailService';
import { FileUploadService } from '@services/fileUploadService';

export const mockEmailService: jest.Mocked<EmailService> = {
  sendEmail: jest.fn(),
  sendWelcomeEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendVerificationEmail: jest.fn(),
} as any;

export const mockFileUploadService: jest.Mocked<FileUploadService> = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  getFileUrl: jest.fn(),
  validateFile: jest.fn(),
} as any;

// Mock implementations
mockEmailService.sendEmail.mockResolvedValue({ messageId: 'test-message-id' });
mockEmailService.sendWelcomeEmail.mockResolvedValue({ messageId: 'welcome-email-id' });

mockFileUploadService.uploadFile.mockResolvedValue({
  url: 'https://example.com/file.jpg',
  filename: 'file.jpg',
  size: 1024,
});
```

### Database Mocking for Unit Tests
```typescript
// tests/mocks/database.ts
export const mockDatabase = {
  query: jest.fn(),
  transaction: jest.fn(),
  getClient: jest.fn(),
  close: jest.fn(),
};

// Helper to mock successful queries
export const mockQuerySuccess = (returnValue: any) => {
  mockDatabase.query.mockResolvedValue({
    rows: Array.isArray(returnValue) ? returnValue : [returnValue],
    rowCount: Array.isArray(returnValue) ? returnValue.length : 1,
  });
};

// Helper to mock failed queries
export const mockQueryError = (error: Error) => {
  mockDatabase.query.mockRejectedValue(error);
};

// Helper to mock transactions
export const mockTransactionSuccess = (returnValue: any) => {
  mockDatabase.transaction.mockImplementation(async (callback) => {
    return callback(mockDatabase);
  });
};
```

## Test Data Factories

### User Factory
```typescript
// tests/factories/userFactory.ts
import { User, UserRole } from '@types/auth';
import { faker } from '@faker-js/faker';

interface UserFactoryOptions {
  role?: UserRole;
  isActive?: boolean;
  emailVerified?: boolean;
}

export class UserFactory {
  static create(overrides: Partial<User> = {}, options: UserFactoryOptions = {}): User {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      password: 'hashed_password',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      role: options.role || UserRole.USER,
      isActive: options.isActive ?? true,
      emailVerified: options.emailVerified ?? false,
      emailVerifiedAt: options.emailVerified ? faker.date.past() : null,
      lastLoginAt: faker.date.recent(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<User> = {}, options: UserFactoryOptions = {}): User[] {
    return Array.from({ length: count }, () => this.create(overrides, options));
  }

  static createAdmin(overrides: Partial<User> = {}): User {
    return this.create(overrides, { role: UserRole.ADMIN });
  }

  static createInactive(overrides: Partial<User> = {}): User {
    return this.create(overrides, { isActive: false });
  }
}
```

## Performance Testing

### Load Testing with Artillery
```yaml
# artillery.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
  defaults:
    headers:
      Content-Type: 'application/json'

scenarios:
  - name: 'User Registration and Login'
    weight: 50
    flow:
      - post:
          url: '/api/v1/auth/register'
          json:
            email: '{{ $randomEmail() }}'
            password: 'password123'
            firstName: '{{ $randomFirstName() }}'
            lastName: '{{ $randomLastName() }}'
          capture:
            - json: '$.data.token'
              as: 'authToken'
      - post:
          url: '/api/v1/auth/login'
          json:
            email: '{{ email }}'
            password: 'password123'

  - name: 'Protected Routes'
    weight: 50
    flow:
      - post:
          url: '/api/v1/auth/login'
          json:
            email: 'test@example.com'
            password: 'password123'
          capture:
            - json: '$.data.token'
              as: 'authToken'
      - get:
          url: '/api/v1/users/me'
          headers:
            Authorization: 'Bearer {{ authToken }}'
      - get:
          url: '/api/v1/users'
          headers:
            Authorization: 'Bearer {{ authToken }}'
```

### Memory Leak Testing
```typescript
// tests/performance/memoryLeak.test.ts
import { userService } from '@services/userService';
import { UserFactory } from '@tests/factories/userFactory';

describe('Memory Leak Tests', () => {
  it('should not leak memory during heavy user operations', async () => {
    const initialMemory = process.memoryUsage();
    
    // Perform many operations
    for (let i = 0; i < 1000; i++) {
      const userData = UserFactory.create();
      await userService.findById(userData.id).catch(() => {}); // Ignore not found errors
    }

    // Force garbage collection
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage();
    const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
    
    // Allow some memory growth but flag excessive growth
    expect(heapGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB threshold
  }, 30000);
});
```

This comprehensive testing guide covers unit testing, integration testing, mocking strategies, test data factories, and performance testing for Node.js applications using Jest and related testing tools.