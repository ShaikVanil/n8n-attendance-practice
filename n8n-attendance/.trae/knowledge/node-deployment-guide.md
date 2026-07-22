# Node.js Deployment Guide

## PM2 Process Management

### PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'api-production',
      script: 'dist/server.js',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Memory and performance
      max_memory_restart: '2G',
      node_args: '--max_old_space_size=4096',
      
      // Restart policies
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Health monitoring
      health_check_grace_period: 3000,
      
      // Advanced options
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      
      // Source map support
      source_map_support: true,
      
      // Interpreter options
      interpreter_args: '--harmony',
    },
    {
      name: 'api-staging',
      script: 'dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'staging',
        PORT: 3001,
      },
      log_file: './logs/staging-combined.log',
      out_file: './logs/staging-out.log',
      error_file: './logs/staging-error.log',
      max_memory_restart: '1G',
    },
    {
      name: 'api-development',
      script: 'ts-node',
      args: 'src/server.ts',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      watch: true,
      ignore_watch: ['node_modules', 'logs', 'dist', 'uploads'],
      watch_options: {
        followSymlinks: false,
      },
    },
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['server1.example.com', 'server2.example.com'],
      ref: 'origin/main',
      repo: 'git@github.com:username/repo.git',
      path: '/var/www/api',
      'pre-setup': 'apt update -y && apt install nodejs npm -y',
      'post-setup': 'ls -la',
      'pre-deploy': 'git fetch --all',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production',
      },
    },
    staging: {
      user: 'deploy',
      host: 'staging.example.com',
      ref: 'origin/develop',
      repo: 'git@github.com:username/repo.git',
      path: '/var/www/api-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging',
      },
    },
  },
};
```

### PM2 Management Commands
```bash
# Start applications
pm2 start ecosystem.config.js --env production
pm2 start ecosystem.config.js --env staging
pm2 start ecosystem.config.js --env development

# Management commands
pm2 list                    # List all processes
pm2 show api-production     # Show detailed process info
pm2 logs api-production     # Show logs
pm2 logs --lines 100        # Show last 100 lines

# Restart and reload
pm2 restart api-production  # Hard restart
pm2 reload api-production   # Graceful reload
pm2 gracefulReload all      # Graceful reload all

# Stop and delete
pm2 stop api-production     # Stop process
pm2 delete api-production   # Delete process

# Monitoring
pm2 monit                   # Real-time monitoring
pm2 status                  # Process status

# Clustering
pm2 scale api-production 4  # Scale to 4 instances
pm2 scale api-production +2 # Add 2 more instances

# Log management
pm2 flush                   # Clear logs
pm2 reloadLogs             # Reload log files

# Save and resurrect
pm2 save                    # Save current process list
pm2 resurrect              # Restore saved processes
pm2 startup                # Generate startup script

# Deployment
pm2 deploy production setup     # Initial deployment setup
pm2 deploy production          # Deploy to production
pm2 deploy production revert 1 # Revert last deployment
```

## Docker Containerization

### Dockerfile
```dockerfile
# Multi-stage build for optimization
FROM node:18-alpine AS base

# Install dependencies needed for building
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

FROM base AS deps
# Install dependencies
RUN npm ci --only=production && npm cache clean --force

FROM base AS builder
# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY src ./src

# Build application
RUN npm run build

# Production image
FROM node:18-alpine AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Create necessary directories
RUN mkdir -p logs uploads && chown -R nodejs:nodejs logs uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["node", "dist/server.js"]
```

### Docker Compose
```yaml
# docker-compose.yml

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    networks:
      - app-network
    restart: unless-stopped
    
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - app-network
    restart: unless-stopped
    
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - app-network
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - app-network
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

### Nginx Configuration
```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream api {
        server app:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    server {
        listen 80;
        server_name api.example.com;
        
        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name api.example.com;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

        # Rate limiting
        location /api/v1/auth {
            limit_req zone=auth burst=10 nodelay;
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Health check endpoint
        location /health {
            access_log off;
            proxy_pass http://api;
        }

        # File uploads
        location /uploads {
            client_max_body_size 10M;
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

## CI/CD Pipeline

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run type checking
        run: npm run type-check

      - name: Run tests
        run: npm run test:coverage
        env:
          NODE_ENV: test
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: test_db
          DB_USERNAME: postgres
          DB_PASSWORD: postgres
          REDIS_HOST: localhost
          REDIS_PORT: 6379

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  build:
    name: Build Application
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/

  security:
    name: Security Scan
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Run security audit
        run: npm audit --audit-level=high

      - name: Run Snyk vulnerability scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [test, build, security]
    if: github.ref == 'refs/heads/develop'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Deploy to staging
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /var/www/api-staging
            git pull origin develop
            npm install
            npm run build
            pm2 reload ecosystem.config.js --env staging

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [test, build, security]
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Build Docker image
        run: |
          docker build -t api:${{ github.sha }} .
          docker tag api:${{ github.sha }} api:latest

      - name: Deploy to production
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /var/www/api
            git pull origin main
            npm install --production
            npm run build
            pm2 reload ecosystem.config.js --env production

      - name: Health check
        run: |
          sleep 30
          curl -f https://api.example.com/health || exit 1

      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: "Deployment to production completed"
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## Environment Configuration

### Environment Variables Management
```bash
# .env.production
NODE_ENV=production
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp_prod
DB_USERNAME=postgres
DB_PASSWORD=secure_password
DB_MAX_CONNECTIONS=20
DB_SSL_MODE=require

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# JWT
JWT_SECRET=super_secure_jwt_secret_key_here
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=super_secure_refresh_secret_key_here
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_SALT_ROUNDS=12
ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Email
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=noreply@example.com
EMAIL_PASSWORD=email_password

# File Upload
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=https://sentry.io/dsn

# External Services
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-app-uploads
```

### Secret Management
```bash
# Use environment variable injection
# Docker secrets
echo "db_password" | docker secret create db_password -

# Kubernetes secrets
kubectl create secret generic api-secrets \
  --from-literal=jwt-secret=your_jwt_secret \
  --from-literal=db-password=your_db_password

# Vault integration example
vault kv put secret/api \
  jwt_secret=your_jwt_secret \
  db_password=your_db_password
```

## Monitoring and Logging

### Application Monitoring Setup
```typescript
// src/utils/monitoring.ts
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

export const initializeMonitoring = () => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      integrations: [
        new ProfilingIntegration(),
      ],
      tracesSampleRate: 0.1,
      profilesSampleRate: 0.1,
    });
  }
};

// Performance monitoring
export const performanceMonitor = {
  startTransaction: (name: string) => {
    return Sentry.startTransaction({ name });
  },
  
  recordMetric: (name: string, value: number, tags?: Record<string, string>) => {
    // Send to monitoring service
    console.log(`Metric: ${name} = ${value}`, tags);
  },
};
```

### Health Check Implementation
```typescript
// src/routes/health.ts
import { Router, Request, Response } from 'express';
import { database } from '@config/database';
import { redisClient } from '@config/redis';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    database: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy';
    memory: {
      used: number;
      free: number;
      percentage: number;
    };
    uptime: number;
  };
}

router.get('/health', async (req: Request, res: Response) => {
  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: 'healthy',
      redis: 'healthy',
      memory: {
        used: 0,
        free: 0,
        percentage: 0,
      },
      uptime: process.uptime(),
    },
  };

  // Check database
  try {
    await database.query('SELECT 1');
  } catch (error) {
    healthStatus.services.database = 'unhealthy';
    healthStatus.status = 'unhealthy';
  }

  // Check Redis
  try {
    await redisClient.ping();
  } catch (error) {
    healthStatus.services.redis = 'unhealthy';
    healthStatus.status = 'unhealthy';
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  healthStatus.services.memory = {
    used: memUsage.heapUsed,
    free: memUsage.heapTotal - memUsage.heapUsed,
    percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
  };

  const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});

router.get('/readiness', async (req: Request, res: Response) => {
  // More comprehensive readiness check
  try {
    await database.query('SELECT 1');
    await redisClient.ping();
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready', 
      error: error.message, 
      timestamp: new Date().toISOString() 
    });
  }
});

export { router as healthRoutes };
```

## Backup and Recovery

### Database Backup Script
```bash
#!/bin/bash
# scripts/backup.sh

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-myapp}
DB_USER=${DB_USER:-postgres}
BACKUP_DIR="/var/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_backup_$DATE.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
echo "Starting backup of $DB_NAME..."
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "Backup completed successfully: $BACKUP_FILE"
    
    # Compress backup
    gzip $BACKUP_FILE
    echo "Backup compressed: $BACKUP_FILE.gz"
    
    # Upload to S3 (optional)
    if [ ! -z "$AWS_S3_BUCKET" ]; then
        aws s3 cp "$BACKUP_FILE.gz" "s3://$AWS_S3_BUCKET/backups/"
        echo "Backup uploaded to S3"
    fi
    
    # Clean old backups (keep last 7 days)
    find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
    
else
    echo "Backup failed!"
    exit 1
fi
```

### Automated Backup with Cron
```bash
# Add to crontab
# Backup database daily at 2 AM
0 2 * * * /var/www/api/scripts/backup.sh >> /var/log/backup.log 2>&1

# Backup database every 6 hours
0 */6 * * * /var/www/api/scripts/backup.sh >> /var/log/backup.log 2>&1
```

This comprehensive deployment guide covers PM2 process management, Docker containerization, CI/CD pipelines, environment configuration, monitoring, and backup strategies for production Node.js applications.