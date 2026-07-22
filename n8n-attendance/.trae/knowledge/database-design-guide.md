# Database Design Guide for Node.js

## PostgreSQL Schema Design

### Database Connection and Configuration
```typescript
// src/config/database.ts
import { Pool, PoolConfig } from 'pg';
import { logger } from '@utils/logger';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

class Database {
  private pool: Pool;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.pool = new Pool({
      ...config,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.pool.on('connect', (client) => {
      logger.debug('New database connection established');
    });

    this.pool.on('error', (err, client) => {
      logger.error('Unexpected error on idle client', err);
    });

    this.pool.on('remove', (client) => {
      logger.debug('Database connection removed');
    });
  }

  public async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug(`Query executed in ${duration}ms`);
      return result;
    } catch (error) {
      logger.error('Database query error:', { text, params, error });
      throw error;
    }
  }

  public async getClient() {
    return this.pool.connect();
  }

  public async transaction(callback: (client: any) => Promise<any>): Promise<any> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

export const database = new Database({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'myapp',
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Database Schema Design

### Entity Relationship Design
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'moderator')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- User profiles table (one-to-one relationship)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    avatar_url VARCHAR(500),
    bio TEXT,
    phone VARCHAR(20),
    date_of_birth DATE,
    address JSONB,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Posts table (many-to-one with users, many-to-many with categories)
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    featured_image VARCHAR(500),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMP WITH TIME ZONE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    view_count INTEGER DEFAULT 0,
    meta_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Post categories junction table (many-to-many)
CREATE TABLE post_categories (
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, category_id)
);

-- Comments table (hierarchical structure with parent_id)
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'spam')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Audit log table for tracking changes
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes for Performance
```sql
-- User indexes
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_active ON users(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at);

-- Post indexes
CREATE INDEX idx_posts_author ON posts(author_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_status ON posts(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_published_at ON posts(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX idx_posts_slug ON posts(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_title_search ON posts USING gin(to_tsvector('english', title));
CREATE INDEX idx_posts_content_search ON posts USING gin(to_tsvector('english', content));

-- Comment indexes
CREATE INDEX idx_comments_post ON comments(post_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_author ON comments(author_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_parent ON comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_comments_status ON comments(status) WHERE deleted_at IS NULL;

-- Category indexes
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_active ON categories(is_active);

-- Composite indexes for common queries
CREATE INDEX idx_posts_author_status ON posts(author_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_post_status ON comments(post_id, status) WHERE deleted_at IS NULL;
```

## Database Migrations

### Migration System
```typescript
// src/database/migrationRunner.ts
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { database } from '@config/database';
import { logger } from '@utils/logger';

export interface Migration {
  id: string;
  filename: string;
  up: string;
  down: string;
  createdAt: Date;
}

export class MigrationRunner {
  private migrationTable = 'migrations';

  async initialize(): Promise<void> {
    await this.createMigrationTable();
  }

  private async createMigrationTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS ${this.migrationTable} (
        id VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await database.query(query);
  }

  async runMigrations(): Promise<void> {
    const migrationFiles = await this.getMigrationFiles();
    const appliedMigrations = await this.getAppliedMigrations();
    
    const pendingMigrations = migrationFiles.filter(
      file => !appliedMigrations.includes(file.id)
    );

    if (pendingMigrations.length === 0) {
      logger.info('No pending migrations');
      return;
    }

    logger.info(`Running ${pendingMigrations.length} migrations`);

    for (const migration of pendingMigrations) {
      await this.runMigration(migration);
    }
  }

  private async getMigrationFiles(): Promise<Migration[]> {
    const migrationDir = path.join(__dirname, 'migrations');
    const files = await readdir(migrationDir);
    
    const migrations: Migration[] = [];
    
    for (const file of files.filter(f => f.endsWith('.sql'))) {
      const content = await readFile(path.join(migrationDir, file), 'utf-8');
      const [upSection, downSection] = content.split('-- DOWN');
      
      migrations.push({
        id: file.replace('.sql', ''),
        filename: file,
        up: upSection.replace('-- UP', '').trim(),
        down: downSection ? downSection.trim() : '',
        createdAt: new Date(),
      });
    }
    
    return migrations.sort((a, b) => a.id.localeCompare(b.id));
  }

  private async getAppliedMigrations(): Promise<string[]> {
    const result = await database.query(
      `SELECT id FROM ${this.migrationTable} ORDER BY applied_at`
    );
    return result.rows.map((row: any) => row.id);
  }

  private async runMigration(migration: Migration): Promise<void> {
    logger.info(`Running migration: ${migration.filename}`);
    
    await database.transaction(async (client) => {
      await client.query(migration.up);
      await client.query(
        `INSERT INTO ${this.migrationTable} (id, filename) VALUES ($1, $2)`,
        [migration.id, migration.filename]
      );
    });
    
    logger.info(`Migration completed: ${migration.filename}`);
  }

  async rollback(steps: number = 1): Promise<void> {
    const appliedMigrations = await this.getAppliedMigrations();
    const toRollback = appliedMigrations.slice(-steps).reverse();
    
    for (const migrationId of toRollback) {
      await this.rollbackMigration(migrationId);
    }
  }

  private async rollbackMigration(migrationId: string): Promise<void> {
    const migrationFiles = await this.getMigrationFiles();
    const migration = migrationFiles.find(m => m.id === migrationId);
    
    if (!migration || !migration.down) {
      throw new Error(`Cannot rollback migration ${migrationId}: no down migration found`);
    }
    
    logger.info(`Rolling back migration: ${migration.filename}`);
    
    await database.transaction(async (client) => {
      await client.query(migration.down);
      await client.query(
        `DELETE FROM ${this.migrationTable} WHERE id = $1`,
        [migrationId]
      );
    });
    
    logger.info(`Migration rolled back: ${migration.filename}`);
  }
}
```

### Example Migration Files
```sql
-- migrations/001_create_users_table.sql
-- UP
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'moderator')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- DOWN
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS users;
```

## Repository Pattern Implementation

### Base Repository Class
```typescript
// src/models/BaseRepository.ts
import { Pool, PoolClient } from 'pg';
import { database } from '@config/database';
import { logger } from '@utils/logger';

export interface QueryOptions {
  offset?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface FilterOptions {
  [key: string]: any;
}

export abstract class BaseRepository<T> {
  protected db: Pool;
  protected tableName: string;

  constructor(tableName: string) {
    this.db = database.getPool();
    this.tableName = tableName;
  }

  protected abstract mapRowToEntity(row: any): T;
  protected abstract mapEntityToRow(entity: Partial<T>): any;

  async findById(id: string): Promise<T | null> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE id = $1 AND deleted_at IS NULL
    `;
    
    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.mapRowToEntity(result.rows[0]) : null;
  }

  async findMany(options: QueryOptions = {}, filters: FilterOptions = {}): Promise<T[]> {
    const { offset = 0, limit = 10, sortBy = 'created_at', sortOrder = 'DESC' } = options;
    
    let query = `SELECT * FROM ${this.tableName} WHERE deleted_at IS NULL`;
    const params: any[] = [];
    let paramCount = 0;

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        paramCount++;
        if (Array.isArray(value)) {
          query += ` AND ${key} = ANY($${paramCount})`;
        } else {
          query += ` AND ${key} = $${paramCount}`;
        }
        params.push(value);
      }
    });

    // Add sorting and pagination
    query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await this.db.query(query, params);
    return result.rows.map(row => this.mapRowToEntity(row));
  }

  async count(filters: FilterOptions = {}): Promise<number> {
    let query = `SELECT COUNT(*) FROM ${this.tableName} WHERE deleted_at IS NULL`;
    const params: any[] = [];
    let paramCount = 0;

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        paramCount++;
        query += ` AND ${key} = $${paramCount}`;
        params.push(value);
      }
    });

    const result = await this.db.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async create(data: Partial<T>): Promise<T> {
    const rowData = this.mapEntityToRow(data);
    const columns = Object.keys(rowData);
    const values = Object.values(rowData);
    const placeholders = values.map((_, index) => `$${index + 1}`);

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return this.mapRowToEntity(result.rows[0]);
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const rowData = this.mapEntityToRow(data);
    const entries = Object.entries(rowData);
    const setClause = entries.map(([key], index) => `${key} = $${index + 1}`);
    const values = entries.map(([, value]) => value);

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length + 1} AND deleted_at IS NULL
      RETURNING *
    `;

    values.push(id);
    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error(`${this.tableName} with id ${id} not found`);
    }

    return this.mapRowToEntity(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND deleted_at IS NULL
    `;

    const result = await this.db.query(query, [id]);
    
    if (result.rowCount === 0) {
      throw new Error(`${this.tableName} with id ${id} not found`);
    }
  }

  async hardDelete(id: string): Promise<void> {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
    await this.db.query(query, [id]);
  }

  async exists(id: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM ${this.tableName} 
      WHERE id = $1 AND deleted_at IS NULL
    `;
    
    const result = await this.db.query(query, [id]);
    return result.rows.length > 0;
  }

  async transaction<R>(callback: (client: PoolClient) => Promise<R>): Promise<R> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
```

### Specific Repository Implementation
```typescript
// src/models/userRepository.ts
import { BaseRepository } from './BaseRepository';
import { User, UserRole } from '@types/auth';

interface UserFilters {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
}

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  protected mapRowToEntity(row: any): User {
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role as UserRole,
      isActive: row.is_active,
      emailVerified: row.email_verified,
      emailVerifiedAt: row.email_verified_at,
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  protected mapEntityToRow(entity: Partial<User>): any {
    const row: any = {};
    
    if (entity.email !== undefined) row.email = entity.email;
    if (entity.password !== undefined) row.password = entity.password;
    if (entity.firstName !== undefined) row.first_name = entity.firstName;
    if (entity.lastName !== undefined) row.last_name = entity.lastName;
    if (entity.role !== undefined) row.role = entity.role;
    if (entity.isActive !== undefined) row.is_active = entity.isActive;
    if (entity.emailVerified !== undefined) row.email_verified = entity.emailVerified;
    if (entity.emailVerifiedAt !== undefined) row.email_verified_at = entity.emailVerifiedAt;
    if (entity.lastLoginAt !== undefined) row.last_login_at = entity.lastLoginAt;

    return row;
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE email = $1 AND deleted_at IS NULL
    `;
    
    const result = await this.db.query(query, [email]);
    return result.rows[0] ? this.mapRowToEntity(result.rows[0]) : null;
  }

  async findManyWithFilters(options: any = {}, filters: UserFilters = {}): Promise<User[]> {
    const { offset = 0, limit = 10, sortBy = 'created_at', sortOrder = 'DESC' } = options;
    
    let query = `SELECT * FROM ${this.tableName} WHERE deleted_at IS NULL`;
    const params: any[] = [];
    let paramCount = 0;

    // Role filter
    if (filters.role) {
      paramCount++;
      query += ` AND role = $${paramCount}`;
      params.push(filters.role);
    }

    // Active status filter
    if (filters.isActive !== undefined) {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      params.push(filters.isActive);
    }

    // Search filter (name or email)
    if (filters.search) {
      paramCount++;
      query += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }

    // Add sorting and pagination
    query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await this.db.query(query, params);
    return result.rows.map(row => this.mapRowToEntity(row));
  }

  async updateLastLogin(id: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND deleted_at IS NULL
    `;
    
    await this.db.query(query, [id]);
  }

  async verifyEmail(id: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET email_verified = true, email_verified_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND deleted_at IS NULL
    `;
    
    await this.db.query(query, [id]);
  }
}

export const userRepository = new UserRepository();
```

## Advanced Database Features

### Full-Text Search
```typescript
// src/models/searchRepository.ts
import { database } from '@config/database';

export interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  type: 'post' | 'user' | 'comment';
  rank: number;
}

export class SearchRepository {
  async searchContent(query: string, filters: any = {}): Promise<SearchResult[]> {
    const searchQuery = `
      SELECT 
        id,
        title,
        excerpt,
        'post' as type,
        ts_rank(search_vector, plainto_tsquery('english', $1)) as rank
      FROM posts 
      WHERE search_vector @@ plainto_tsquery('english', $1)
        AND status = 'published'
        AND deleted_at IS NULL
      
      UNION ALL
      
      SELECT 
        id,
        CONCAT(first_name, ' ', last_name) as title,
        email as excerpt,
        'user' as type,
        ts_rank(to_tsvector('english', CONCAT(first_name, ' ', last_name, ' ', email)), plainto_tsquery('english', $1)) as rank
      FROM users
      WHERE to_tsvector('english', CONCAT(first_name, ' ', last_name, ' ', email)) @@ plainto_tsquery('english', $1)
        AND is_active = true
        AND deleted_at IS NULL
      
      ORDER BY rank DESC, type
      LIMIT 50
    `;

    const result = await database.query(searchQuery, [query]);
    return result.rows;
  }

  async createSearchIndex(): Promise<void> {
    // Add search vector column to posts
    await database.query(`
      ALTER TABLE posts 
      ADD COLUMN IF NOT EXISTS search_vector tsvector
    `);

    // Update search vector for existing posts
    await database.query(`
      UPDATE posts 
      SET search_vector = to_tsvector('english', title || ' ' || content)
      WHERE search_vector IS NULL
    `);

    // Create trigger to automatically update search vector
    await database.query(`
      CREATE OR REPLACE FUNCTION update_post_search_vector()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.search_vector = to_tsvector('english', NEW.title || ' ' || NEW.content);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await database.query(`
      CREATE TRIGGER update_post_search_vector_trigger
        BEFORE INSERT OR UPDATE ON posts
        FOR EACH ROW EXECUTE FUNCTION update_post_search_vector();
    `);

    // Create GIN index for fast full-text search
    await database.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_search_vector 
      ON posts USING gin(search_vector)
    `);
  }
}
```

### Database Seeding
```typescript
// src/database/seedRunner.ts
import { userRepository } from '@models/userRepository';
import { hashPassword } from '@utils/password';
import { UserRole } from '@types/auth';
import { logger } from '@utils/logger';

export class SeedRunner {
  async runSeeds(): Promise<void> {
    logger.info('Starting database seeding...');

    await this.seedUsers();
    await this.seedCategories();
    await this.seedPosts();

    logger.info('Database seeding completed');
  }

  private async seedUsers(): Promise<void> {
    const adminExists = await userRepository.findByEmail('admin@example.com');
    
    if (!adminExists) {
      await userRepository.create({
        email: 'admin@example.com',
        password: await hashPassword('admin123'),
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      });
      
      logger.info('Admin user created');
    }

    // Create test users
    for (let i = 1; i <= 10; i++) {
      const email = `user${i}@example.com`;
      const exists = await userRepository.findByEmail(email);
      
      if (!exists) {
        await userRepository.create({
          email,
          password: await hashPassword('password123'),
          firstName: `User`,
          lastName: `${i}`,
          role: UserRole.USER,
          isActive: true,
        });
      }
    }
    
    logger.info('Test users created');
  }

  private async seedCategories(): Promise<void> {
    const categories = [
      { name: 'Technology', slug: 'technology' },
      { name: 'Programming', slug: 'programming' },
      { name: 'Web Development', slug: 'web-development' },
      { name: 'Mobile Development', slug: 'mobile-development' },
      { name: 'DevOps', slug: 'devops' },
    ];

    for (const category of categories) {
      const query = `
        INSERT INTO categories (name, slug, is_active)
        VALUES ($1, $2, true)
        ON CONFLICT (slug) DO NOTHING
      `;
      
      await database.query(query, [category.name, category.slug]);
    }
    
    logger.info('Categories seeded');
  }

  private async seedPosts(): Promise<void> {
    const users = await userRepository.findMany({ limit: 5 });
    const categories = await database.query('SELECT id FROM categories LIMIT 3');
    
    for (let i = 1; i <= 20; i++) {
      const author = users[Math.floor(Math.random() * users.length)];
      const category = categories.rows[Math.floor(Math.random() * categories.rows.length)];
      
      const query = `
        INSERT INTO posts (title, slug, content, excerpt, status, author_id, published_at)
        VALUES ($1, $2, $3, $4, 'published', $5, CURRENT_TIMESTAMP)
        ON CONFLICT (slug) DO NOTHING
      `;
      
      const title = `Sample Post ${i}`;
      const slug = `sample-post-${i}`;
      const content = `This is the content for sample post ${i}. It contains detailed information about the topic.`;
      const excerpt = `This is a brief excerpt for post ${i}`;
      
      await database.query(query, [title, slug, content, excerpt, author.id]);
    }
    
    logger.info('Posts seeded');
  }
}
```

This comprehensive database guide covers PostgreSQL schema design, migrations, repository patterns, and advanced features for building scalable Node.js applications with proper data management and performance optimization.