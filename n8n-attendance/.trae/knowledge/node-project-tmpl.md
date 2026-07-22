# Node.js Project Template

## Project Structure
```
backend/
├── src/
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── userController.ts
│   │   └── index.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   └── index.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── errorHandler.ts
│   │   ├── requestLogger.ts
│   │   └── validation.ts
│   ├── models/
│   │   ├── userRepository.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── authService.ts
│   │   ├── userService.ts
│   │   ├── emailService.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── password.ts
│   │   ├── jwt.ts
│   │   ├── validation.ts
│   │   └── ApiError.ts
│   ├── config/
│   │   ├── database.ts
│   │   ├── environment.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── auth.ts
│   │   ├── common.ts
│   │   └── database.ts
│   ├── validators/
│   │   ├── authValidators.ts
│   │   ├── userValidators.ts
│   │   └── index.ts
│   ├── database/
│   │   ├── migrations/
│   │   ├── seeds/
│   │   └── connection.ts
│   ├── app.ts
│   └── server.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── fixtures/
│   └── setup.ts
├── logs/
├── dist/
├── docs/
├── scripts/
│   ├── build.sh
│   ├── deploy.sh
│   └── seed.ts
├── .env.example
├── .gitignore
├── .eslintrc.js
├── .prettierrc
├── package.json
├── tsconfig.json
├── jest.config.js
├── ecosystem.config.js
├── Dockerfile
└── docker-compose.yml
```

## Configuration Files

### package.json
```json
{
  "name": "node-typescript-api",
  "version": "1.0.0",
  "description": "Node.js API with TypeScript, Express, and PostgreSQL",
  "main": "dist/server.js",
  "scripts": {
    "start": "node dist/server.js",
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "build:watch": "tsc --watch",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "type-check": "tsc --noEmit",
    "db:migrate": "ts-node scripts/migrate.ts",
    "db:seed": "ts-node scripts/seed.ts",
    "prepare": "husky install"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "compression": "^1.7.4",
    "express-rate-limit": "^6.10.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "joi": "^17.9.2",
    "pg": "^8.11.3",
    "winston": "^3.10.0",
    "dotenv": "^16.3.1",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.5.0",
    "@types/express": "^4.17.17",
    "@types/cors": "^2.8.13",
    "@types/compression": "^1.7.2",
    "@types/bcryptjs": "^2.4.2",
    "@types/jsonwebtoken": "^9.0.2",
    "@types/pg": "^8.10.2",
    "@types/uuid": "^9.0.2",
    "@types/jest": "^29.5.4",
    "@types/supertest": "^2.0.12",
    "typescript": "^5.1.6",
    "nodemon": "^3.0.1",
    "ts-node": "^10.9.1",
    "jest": "^29.6.2",
    "ts-jest": "^29.1.1",
    "supertest": "^6.3.3",
    "@typescript-eslint/eslint-plugin": "^6.4.0",
    "@typescript-eslint/parser": "^6.4.0",
    "eslint": "^8.47.0",
    "prettier": "^3.0.1",
    "husky": "^8.0.3",
    "lint-staged": "^13.2.3"
  },
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

### tsconfig.json
```json
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
      "@types/*": ["types/*"],
      "@validators/*": ["validators/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### jest.config.js
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/types/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@models/(.*)$': '<rootDir>/src/models/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@validators/(.*)$': '<rootDir>/src/validators/$1',
  },
};
```

### ecosystem.config.js (PM2)
```javascript
module.exports = {
  apps: [
    {
      name: 'api-prod',
      script: 'dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      merge_logs: true,
      max_memory_restart: '2G',
      node_args: '--max_old_space_size=4096',
      kill_timeout: 5000,
    },
    {
      name: 'api-dev',
      script: 'ts-node',
      args: 'src/server.ts',
      instances: 1,
      exec_mode: 'fork',
      watch: true,
      ignore_watch: ['node_modules', 'logs', 'dist'],
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
    },
  ],
};
```

## Core Application Files

### src/server.ts
```typescript
import dotenv from 'dotenv';
import { logger } from '@utils/logger';

// Load environment variables
dotenv.config();

import App from './app';
import { connectDatabase } from '@config/database';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    // Start Express server
    const app = new App();
    app.listen(Number(PORT));
    
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

startServer();
```

### src/app.ts
```typescript
import express, { Application } from 'express';
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
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }));

    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 100 : 1000,
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Body parsing and compression
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(compression());

    // Logging
    this.app.use(requestLogger);

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      });
    });
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api/v1/auth', authRoutes);
    this.app.use('/api/v1/users', userRoutes);

    // API documentation
    this.app.get('/api/docs', (req, res) => {
      res.json({
        success: true,
        message: 'API Documentation',
        version: '1.0.0',
        endpoints: {
          auth: '/api/v1/auth',
          users: '/api/v1/users',
        },
      });
    });

    // Handle 404 for API routes
    this.app.use('/api/*', (req, res) => {
      throw new ApiError(404, `API route ${req.originalUrl} not found`);
    });

    // Handle 404 for all other routes
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public listen(port: number): void {
    this.app.listen(port, () => {
      logger.info(`🚀 Server running on port ${port} in ${process.env.NODE_ENV} mode`);
    });
  }
}

export default App;
```

### src/config/environment.ts
```typescript
import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  database: {
    host: string;
    port: number;
    name: string;
    username: string;
    password: string;
    maxConnections: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  bcrypt: {
    saltRounds: number;
  };
  email: {
    host: string;
    port: number;
    user: string;
    password: string;
  };
  cors: {
    allowedOrigins: string[];
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'myapp',
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  },
  
  email: {
    host: process.env.EMAIL_HOST || '',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
  },
  
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'DB_HOST',
  'DB_NAME',
  'DB_USERNAME',
  'DB_PASSWORD',
];

if (config.nodeEnv === 'production') {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}

export default config;
```

### src/config/database.ts
```typescript
import { Pool, PoolConfig } from 'pg';
import { logger } from '@utils/logger';
import config from './environment';

class Database {
  private pool: Pool;
  private static instance: Database;

  private constructor() {
    const poolConfig: PoolConfig = {
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.username,
      password: config.database.password,
      max: config.database.maxConnections,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    this.pool = new Pool(poolConfig);

    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });

    // Handle pool connection
    this.pool.on('connect', () => {
      logger.debug('New database connection established');
    });

    // Handle pool remove
    this.pool.on('remove', () => {
      logger.debug('Database connection removed');
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async testConnection(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      logger.info('Database connection test successful');
    } catch (error) {
      logger.error('Database connection test failed:', error);
      throw error;
    }
  }

  public async close(): Promise<void> {
    try {
      await this.pool.end();
      logger.info('Database connection pool closed');
    } catch (error) {
      logger.error('Error closing database connection pool:', error);
      throw error;
    }
  }
}

export const database = Database.getInstance();

export const connectDatabase = async (): Promise<void> => {
  await database.testConnection();
};
```

### src/routes/auth.ts
```typescript
import { Router } from 'express';
import { authController } from '@controllers/authController';
import { validate } from '@middleware/validation';
import { authenticate } from '@middleware/auth';
import { loginSchema, registerSchema, changePasswordSchema } from '@validators/authValidators';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

export { router as authRoutes };
```

### .env.example
```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp_dev
DB_USERNAME=postgres
DB_PASSWORD=password
DB_MAX_CONNECTIONS=20

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_REFRESH_EXPIRES_IN=7d

# Security Configuration
BCRYPT_SALT_ROUNDS=12
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Email Configuration (optional)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-email-password

# Logging
LOG_LEVEL=info
```

### Dockerfile
```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src ./src

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Create logs directory
RUN mkdir logs && chown nodejs:nodejs logs

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

This template provides a solid foundation for Node.js applications with TypeScript, Express.js, PostgreSQL, and modern development practices including security, testing, and deployment configurations.