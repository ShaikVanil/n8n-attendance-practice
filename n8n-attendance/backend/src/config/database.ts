import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Determine SSL configuration
const sslConfig = process.env.DB_SSL === 'false' ? false : {
  rejectUnauthorized: false
};

const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // SSL configuration - conditional based on environment
  ssl: sslConfig,
  // Connection pool settings
  max: 20,
  min: 2,
  // Increased timeouts for large schema operations
  idleTimeoutMillis: 300000,        // 5 minutes
  connectionTimeoutMillis: 120000,   // 2 minutes
  statement_timeout: 300000,         // 5 minutes for schema operations
  query_timeout: 300000,             // 5 minutes for schema operations
});

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('PostgreSQL database connection error:', err);
});

// Test connection on startup with better error handling
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring client:', err.stack);
    return;
  }
  console.log('Database connection test successful');
  if (client) {
    release();
  }
});

export default pool;