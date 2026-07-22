# Node.js Best Practices Guide

## Project Structure & Organization

### Recommended Folder Structure
```
backend/
├── src/
│   ├── controllers/        # Request handlers and business logic
│   ├── routes/            # API route definitions
│   ├── middleware/        # Custom middleware functions
│   ├── models/            # Database models and schemas
│   ├── services/          # Business logic and external integrations
│   ├── utils/             # Utility functions and helpers
│   ├── config/            # Configuration files
│   ├── types/             # TypeScript type definitions
│   ├── validators/        # Input validation schemas
│   ├── database/          # Database migrations and seeds
│   └── app.ts             # Express app configuration
├── tests/                 # Test files
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── dist/                  # Compiled JavaScript output
├── docs/                  # API documentation
├── scripts/               # Build and deployment scripts
├── .env.example           # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
├── jest.config.js
├── ecosystem.config.js    # PM2 configuration
└── Dockerfile
```

## TypeScript Configuration

### Strict TypeScript Setup
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@controllers/*": ["controllers/*"],
      "@routes/*": ["routes/*"],
      "@middleware/*": ["middleware/*"],
      "@models/*": ["models/*"],
      "@services/*": ["services/*"],
      "@utils/*": ["utils/*"],
      "@config/*": ["config/*"],
      "@types/*": ["types/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Type Definitions
```typescript
// src/types/common.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  errors?: string[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DatabaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// src/types/auth.ts
export interface User extends DatabaseEntity {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface AuthRequest extends Request {
  user?: User;
}
```

## Express.js Best Practices

### Application Setup
```typescript
// src/app.ts
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { errorHandler } from '@middleware/errorHandler';
import { requestLogger } from '@middleware/requestLogger';
import { authRoutes } from '@routes/auth';
import { userRoutes } from '@routes/users';
import { ApiError } from '@utils/ApiError';
import { logger } from '@utils/logger';

class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Body parsing and compression
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(compression());

    // Logging
    this.app.use(requestLogger);

    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });
  }

  private initializeRoutes(): void {
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', userRoutes);

    // Handle 404
    this.app.use('*', (req: Request, res: Response) => {
      throw new ApiError(404, `Route ${req.originalUrl} not found`);
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public listen(port: number): void {
    this.app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });
  }
}

export default App;
```

### Error Handling
```typescript
// src/utils/ApiError.ts
export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@utils/ApiError';
import { logger } from '@utils/logger';
import { ApiResponse } from '@types/common';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  const errors: string[] = [];

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    // Handle validation errors from libraries like Joi or Yup
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Log error
  logger.error({
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(statusCode).json({
    success: false,
    message,
    errors: errors.length > 0 ? errors : undefined,
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

### Middleware Patterns
```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JwtPayload, UserRole } from '@types/auth';
import { ApiError } from '@utils/ApiError';
import { userService } from '@services/userService';

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new ApiError(401, 'Access token is required');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    const user = await userService.findById(decoded.userId);

    if (!user || !user.isActive) {
      throw new ApiError(401, 'Invalid token');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, 'Insufficient permissions');
    }

    next();
  };
};

// src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '@utils/ApiError';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => detail.message);
      throw new ApiError(400, 'Validation Error', errors);
    }

    next();
  };
};

// src/middleware/requestLogger.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '@utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  });

  next();
};
```

## Controller Patterns
```typescript
// src/controllers/userController.ts
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '@types/auth';
import { ApiResponse, PaginationParams } from '@types/common';
import { userService } from '@services/userService';
import { asyncHandler } from '@middleware/errorHandler';

class UserController {
  public getUsers = asyncHandler(
    async (req: Request, res: Response<ApiResponse>): Promise<void> => {
      const { page = 1, limit = 10, sortBy = 'createdAt' } = req.query as any;
      const pagination: PaginationParams = { page, limit, sortBy };

      const result = await userService.findAll(pagination);

      res.json({
        success: true,
        message: 'Users retrieved successfully',
        data: result.users,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    }
  );

  public getUserById = asyncHandler(
    async (req: Request, res: Response<ApiResponse>): Promise<void> => {
      const { id } = req.params;
      const user = await userService.findById(id);

      res.json({
        success: true,
        message: 'User retrieved successfully',
        data: user,
      });
    }
  );

  public updateUser = asyncHandler(
    async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
      const { id } = req.params;
      const updateData = req.body;

      const user = await userService.update(id, updateData);

      res.json({
        success: true,
        message: 'User updated successfully',
        data: user,
      });
    }
  );

  public deleteUser = asyncHandler(
    async (req: Request, res: Response<ApiResponse>): Promise<void> => {
      const { id } = req.params;
      await userService.delete(id);

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    }
  );

  public getCurrentUser = asyncHandler(
    async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
      res.json({
        success: true,
        message: 'Current user retrieved successfully',
        data: req.user,
      });
    }
  );
}

export const userController = new UserController();
```

## Service Layer Patterns
```typescript
// src/services/userService.ts
import { User, UserRole } from '@types/auth';
import { PaginationParams } from '@types/common';
import { ApiError } from '@utils/ApiError';
import { userRepository } from '@models/userRepository';
import { hashPassword, comparePassword } from '@utils/password';
import { validateEmail } from '@utils/validation';

interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}

interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class UserService {
  async findAll(pagination: PaginationParams): Promise<PaginatedUsers> {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const offset = (page - 1) * limit;

    const [users, total] = await Promise.all([
      userRepository.findMany({
        offset,
        limit,
        sortBy,
        sortOrder,
      }),
      userRepository.count(),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<User> {
    const user = await userRepository.findById(id);
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return userRepository.findByEmail(email);
  }

  async create(userData: CreateUserData): Promise<User> {
    const { email, password, firstName, lastName, role = UserRole.USER } = userData;

    // Validation
    if (!validateEmail(email)) {
      throw new ApiError(400, 'Invalid email format');
    }

    // Check if user exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ApiError(409, 'User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    const user = await userRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      isActive: true,
    });

    return user;
  }

  async update(id: string, updateData: UpdateUserData): Promise<User> {
    const user = await this.findById(id);

    // Email uniqueness check
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await this.findByEmail(updateData.email);
      if (existingUser) {
        throw new ApiError(409, 'Email already in use');
      }
    }

    const updatedUser = await userRepository.update(id, updateData);
    return updatedUser;
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    await userRepository.delete(id);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.findById(id);

    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new ApiError(400, 'Current password is incorrect');
    }

    const hashedNewPassword = await hashPassword(newPassword);
    await userRepository.update(id, { password: hashedNewPassword });
  }

  async toggleUserStatus(id: string): Promise<User> {
    const user = await this.findById(id);
    return this.update(id, { isActive: !user.isActive });
  }
}

export const userService = new UserService();
```

## Database Patterns

### Repository Pattern
```typescript
// src/models/userRepository.ts
import { Pool } from 'pg';
import { User, UserRole } from '@types/auth';
import { database } from '@config/database';

interface FindManyOptions {
  offset: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

class UserRepository {
  private db: Pool;

  constructor() {
    this.db = database.getPool();
  }

  async findMany(options: FindManyOptions): Promise<User[]> {
    const { offset, limit, sortBy, sortOrder } = options;
    
    const query = `
      SELECT id, email, first_name, last_name, role, is_active, created_at, updated_at, last_login_at
      FROM users
      WHERE deleted_at IS NULL
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $1 OFFSET $2
    `;

    const result = await this.db.query(query, [limit, offset]);
    return result.rows.map(this.mapRowToUser);
  }

  async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, email, password, first_name, last_name, role, is_active, created_at, updated_at, last_login_at
      FROM users
      WHERE id = $1 AND deleted_at IS NULL
    `;

    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.mapRowToUser(result.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, password, first_name, last_name, role, is_active, created_at, updated_at, last_login_at
      FROM users
      WHERE email = $1 AND deleted_at IS NULL
    `;

    const result = await this.db.query(query, [email]);
    return result.rows[0] ? this.mapRowToUser(result.rows[0]) : null;
  }

  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const query = `
      INSERT INTO users (email, password, first_name, last_name, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, first_name, last_name, role, is_active, created_at, updated_at
    `;

    const values = [
      userData.email,
      userData.password,
      userData.firstName,
      userData.lastName,
      userData.role,
      userData.isActive,
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToUser(result.rows[0]);
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    const setParts: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        const columnName = this.camelToSnake(key);
        setParts.push(`${columnName} = $${paramCounter}`);
        values.push(value);
        paramCounter++;
      }
    });

    if (setParts.length === 0) {
      throw new Error('No fields to update');
    }

    setParts.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE users
      SET ${setParts.join(', ')}
      WHERE id = $${paramCounter} AND deleted_at IS NULL
      RETURNING id, email, first_name, last_name, role, is_active, created_at, updated_at, last_login_at
    `;

    const result = await this.db.query(query, values);
    return this.mapRowToUser(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    const query = `
      UPDATE users
      SET deleted_at = NOW()
      WHERE id = $1
    `;

    await this.db.query(query, [id]);
  }

  async count(): Promise<number> {
    const query = 'SELECT COUNT(*) FROM users WHERE deleted_at IS NULL';
    const result = await this.db.query(query);
    return parseInt(result.rows[0].count);
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role as UserRole,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at,
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

export const userRepository = new UserRepository();
```

## Security Best Practices

### Password Hashing
```typescript
// src/utils/password.ts
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateSecurePassword = (length = 16): string => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
};
```

### Input Validation
```typescript
// src/validators/userValidators.ts
import Joi from 'joi';
import { UserRole } from '@types/auth';

export const createUserSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character',
    'any.required': 'Password is required',
  }),
  firstName: Joi.string().min(1).max(50).required().messages({
    'string.min': 'First name cannot be empty',
    'string.max': 'First name cannot exceed 50 characters',
    'any.required': 'First name is required',
  }),
  lastName: Joi.string().min(1).max(50).required().messages({
    'string.min': 'Last name cannot be empty',
    'string.max': 'Last name cannot exceed 50 characters',
    'any.required': 'Last name is required',
  }),
  role: Joi.string().valid(...Object.values(UserRole)).optional(),
});

export const updateUserSchema = Joi.object({
  email: Joi.string().email().optional(),
  firstName: Joi.string().min(1).max(50).optional(),
  lastName: Joi.string().min(1).max(50).optional(),
  role: Joi.string().valid(...Object.values(UserRole)).optional(),
  isActive: Joi.boolean().optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});
```

## Logging and Monitoring
```typescript
// src/utils/logger.ts
import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'api' },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

// Performance monitoring
export const performanceLogger = {
  logDuration: (operation: string, startTime: number) => {
    const duration = Date.now() - startTime;
    logger.info(`${operation} completed in ${duration}ms`);
  },
};
```

This comprehensive guide covers the essential patterns and practices for building robust, scalable Node.js applications with TypeScript, Express.js, and modern development practices.