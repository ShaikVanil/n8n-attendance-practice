# Express.js API Development Guide

## RESTful API Design Principles

### HTTP Methods and Status Codes
```typescript
// GET - Retrieve resources
GET /api/v1/users          // 200 OK - List users
GET /api/v1/users/123      // 200 OK - Get user, 404 Not Found

// POST - Create resources
POST /api/v1/users         // 201 Created, 400 Bad Request, 409 Conflict

// PUT - Update entire resource
PUT /api/v1/users/123      // 200 OK, 404 Not Found, 400 Bad Request

// PATCH - Partial update
PATCH /api/v1/users/123    // 200 OK, 404 Not Found, 400 Bad Request

// DELETE - Remove resource
DELETE /api/v1/users/123   // 204 No Content, 404 Not Found
```

### API Response Standards
```typescript
// src/types/api.ts
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// Success Response
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}

// Error Response
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Email is required",
    "Password must be at least 8 characters"
  ]
}
```

## Advanced Express.js Patterns

### Route Organization
```typescript
// src/routes/users.ts
import { Router } from 'express';
import { userController } from '@controllers/userController';
import { authenticate, authorize } from '@middleware/auth';
import { validate } from '@middleware/validation';
import { UserRole } from '@types/auth';
import { createUserSchema, updateUserSchema } from '@validators/userValidators';

const router = Router();

// Public routes
router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);

// Protected routes
router.use(authenticate); // All routes below require authentication

router.get('/me', userController.getCurrentUser);
router.patch('/me', validate(updateUserSchema), userController.updateCurrentUser);
router.post('/me/change-password', userController.changePassword);

// Admin only routes
router.use(authorize(UserRole.ADMIN)); // Admin required for routes below

router.post('/', validate(createUserSchema), userController.createUser);
router.put('/:id', validate(updateUserSchema), userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.patch('/:id/toggle-status', userController.toggleUserStatus);

export { router as userRoutes };
```

### Advanced Middleware Patterns
```typescript
// src/middleware/asyncHandler.ts
import { Request, Response, NextFunction } from 'express';

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// src/middleware/cache.ts
import { Request, Response, NextFunction } from 'express';
import { redisClient } from '@config/redis';
import { logger } from '@utils/logger';

export const cache = (duration: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;

    try {
      const cached = await redisClient.get(key);
      if (cached) {
        logger.debug(`Cache hit for ${key}`);
        return res.json(JSON.parse(cached));
      }
    } catch (error) {
      logger.warn('Cache retrieval failed:', error);
    }

    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(body) {
      if (res.statusCode === 200) {
        redisClient.setex(key, duration, JSON.stringify(body)).catch(err => {
          logger.warn('Cache storage failed:', err);
        });
      }
      return originalJson.call(this, body);
    };

    next();
  };
};

// src/middleware/upload.ts
import multer from 'multer';
import path from 'path';
import { ApiError } from '@utils/ApiError';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
});
```

### Request Validation Middleware
```typescript
// src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '@utils/ApiError';

export const validate = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req[property], { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      const errors = error.details.map(detail => detail.message);
      throw new ApiError(400, 'Validation Error', errors);
    }

    next();
  };
};

// Advanced validation with custom messages
export const validateWithCustomMessages = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      errors: {
        wrap: {
          label: ''
        }
      }
    });

    if (error) {
      const errors = error.details.map(detail => {
        const field = detail.path.join('.');
        return `${field}: ${detail.message}`;
      });
      throw new ApiError(400, 'Validation failed', errors);
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};
```

## Advanced Controller Patterns

### Base Controller Class
```typescript
// src/controllers/BaseController.ts
import { Request, Response } from 'express';
import { ApiResponse, PaginationParams } from '@types/common';
import { asyncHandler } from '@middleware/asyncHandler';

export abstract class BaseController {
  protected sendSuccess<T>(
    res: Response,
    data: T,
    message: string = 'Operation successful',
    statusCode: number = 200,
    meta?: any
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      meta,
    };
    res.status(statusCode).json(response);
  }

  protected sendError(
    res: Response,
    message: string,
    statusCode: number = 500,
    errors?: string[]
  ): void {
    const response: ApiResponse = {
      success: false,
      message,
      errors,
    };
    res.status(statusCode).json(response);
  }

  protected getPaginationParams(req: Request): PaginationParams {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    return { page, limit, sortBy, sortOrder };
  }

  protected extractFilters(req: Request, allowedFilters: string[]): Record<string, any> {
    const filters: Record<string, any> = {};
    
    allowedFilters.forEach(filter => {
      if (req.query[filter] !== undefined) {
        filters[filter] = req.query[filter];
      }
    });

    return filters;
  }
}
```

### Resource Controller with CRUD Operations
```typescript
// src/controllers/userController.ts
import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { AuthRequest } from '@types/auth';
import { userService } from '@services/userService';
import { asyncHandler } from '@middleware/asyncHandler';

class UserController extends BaseController {
  public getUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const pagination = this.getPaginationParams(req);
    const filters = this.extractFilters(req, ['role', 'isActive', 'search']);
    
    const result = await userService.findAll(pagination, filters);
    
    this.sendSuccess(res, result.users, 'Users retrieved successfully', 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  });

  public getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const user = await userService.findById(id);
    
    this.sendSuccess(res, user, 'User retrieved successfully');
  });

  public createUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userData = req.body;
    const user = await userService.create(userData);
    
    this.sendSuccess(res, user, 'User created successfully', 201);
  });

  public updateUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const updateData = req.body;
    
    const user = await userService.update(id, updateData);
    
    this.sendSuccess(res, user, 'User updated successfully');
  });

  public deleteUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await userService.delete(id);
    
    res.status(204).send();
  });

  public getCurrentUser = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    this.sendSuccess(res, req.user, 'Current user retrieved successfully');
  });

  public updateCurrentUser = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const updateData = req.body;
    const user = await userService.update(req.user!.id, updateData);
    
    this.sendSuccess(res, user, 'Profile updated successfully');
  });

  public changePassword = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { currentPassword, newPassword } = req.body;
    
    await userService.changePassword(req.user!.id, currentPassword, newPassword);
    
    this.sendSuccess(res, null, 'Password changed successfully');
  });

  public uploadAvatar = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.file) {
      return this.sendError(res, 'No file uploaded', 400);
    }

    const avatarUrl = await userService.uploadAvatar(req.user!.id, req.file);
    
    this.sendSuccess(res, { avatarUrl }, 'Avatar uploaded successfully');
  });

  public toggleUserStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const user = await userService.toggleStatus(id);
    
    this.sendSuccess(res, user, 'User status updated successfully');
  });
}

export const userController = new UserController();
```

## API Security Best Practices

### Input Sanitization
```typescript
// src/utils/sanitization.ts
import validator from 'validator';
import { ApiError } from './ApiError';

export class Sanitizer {
  static sanitizeString(input: string, maxLength: number = 255): string {
    if (typeof input !== 'string') {
      throw new ApiError(400, 'Input must be a string');
    }
    
    // Remove HTML tags and trim whitespace
    let sanitized = validator.stripLow(validator.escape(input.trim()));
    
    // Truncate if too long
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  }

  static sanitizeEmail(email: string): string {
    if (!validator.isEmail(email)) {
      throw new ApiError(400, 'Invalid email format');
    }
    
    return validator.normalizeEmail(email) || email.toLowerCase();
  }

  static sanitizeUrl(url: string): string {
    if (!validator.isURL(url, { protocols: ['http', 'https'] })) {
      throw new ApiError(400, 'Invalid URL format');
    }
    
    return url;
  }

  static sanitizePhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    if (!validator.isMobilePhone(cleaned)) {
      throw new ApiError(400, 'Invalid phone number format');
    }
    
    return cleaned;
  }
}
```

### Rate Limiting Strategies
```typescript
// src/middleware/rateLimiting.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '@config/redis';

// General API rate limiting
export const generalLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for authentication endpoints
export const authLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
});

// File upload rate limiting
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 uploads per hour
  message: {
    success: false,
    message: 'Upload limit exceeded, please try again later.',
  },
});
```

## API Documentation with Swagger

### Swagger Configuration
```typescript
// src/config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Node.js API',
      version: '1.0.0',
      description: 'A comprehensive Node.js API with TypeScript and Express',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
            errors: {
              type: 'array',
              items: { type: 'string' },
            },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'user', 'moderator'] },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Application): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'API Documentation',
  }));
};
```

### Route Documentation Examples
```typescript
/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for user names or emails
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, user, moderator]
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 */
```

## Performance Optimization

### Database Query Optimization
```typescript
// src/utils/queryBuilder.ts
export class QueryBuilder {
  private query: string = '';
  private params: any[] = [];
  private paramCount: number = 0;

  select(fields: string[]): this {
    this.query += `SELECT ${fields.join(', ')} `;
    return this;
  }

  from(table: string): this {
    this.query += `FROM ${table} `;
    return this;
  }

  join(table: string, condition: string): this {
    this.query += `JOIN ${table} ON ${condition} `;
    return this;
  }

  leftJoin(table: string, condition: string): this {
    this.query += `LEFT JOIN ${table} ON ${condition} `;
    return this;
  }

  where(condition: string, value?: any): this {
    if (this.query.includes('WHERE')) {
      this.query += `AND ${condition} `;
    } else {
      this.query += `WHERE ${condition} `;
    }
    
    if (value !== undefined) {
      this.params.push(value);
    }
    
    return this;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.query += `ORDER BY ${field} ${direction} `;
    return this;
  }

  limit(limit: number): this {
    this.paramCount++;
    this.query += `LIMIT $${this.paramCount} `;
    this.params.push(limit);
    return this;
  }

  offset(offset: number): this {
    this.paramCount++;
    this.query += `OFFSET $${this.paramCount} `;
    this.params.push(offset);
    return this;
  }

  build(): { query: string; params: any[] } {
    return {
      query: this.query.trim(),
      params: this.params,
    };
  }
}
```

### Caching Strategies
```typescript
// src/utils/cache.ts
import { redisClient } from '@config/redis';
import { logger } from './logger';

export class CacheService {
  private defaultTTL: number = 300; // 5 minutes

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      logger.warn('Cache get failed:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      await redisClient.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.warn('Cache set failed:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.warn('Cache delete failed:', error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (error) {
      logger.warn('Cache pattern invalidation failed:', error);
    }
  }

  generateKey(...parts: string[]): string {
    return parts.join(':');
  }
}

export const cacheService = new CacheService();
```

This comprehensive Express.js guide covers advanced patterns for building scalable, secure, and maintainable APIs with proper documentation, caching, and performance optimization.