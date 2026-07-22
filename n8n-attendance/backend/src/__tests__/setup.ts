import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Global test database pool
let testDb: Pool;

// Setup before all tests
beforeAll(async () => {
  // Create test database connection
  testDb = new Pool({
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'attendance_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'password',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  });

  // Wait for database connection
  await testDb.query('SELECT 1');
  
  // Run test migrations
  await runTestMigrations();
});

// Cleanup after each test
afterEach(async () => {
  if (testDb) {
    // Clean up test data
    await testDb.query('TRUNCATE TABLE attendance_records, devices, users RESTART IDENTITY CASCADE');
  }
});

// Cleanup after all tests
afterAll(async () => {
  if (testDb) {
    await testDb.end();
  }
});

// Helper function to run test migrations
async function runTestMigrations() {
  const migrations = [
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'employee',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS devices (
      id SERIAL PRIMARY KEY,
      device_id VARCHAR(255) UNIQUE NOT NULL,
      device_name VARCHAR(255) NOT NULL,
      location VARCHAR(255),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS attendance_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      device_id INTEGER REFERENCES devices(id),
      check_in_time TIMESTAMP,
      check_out_time TIMESTAMP,
      status VARCHAR(50) DEFAULT 'present',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const migration of migrations) {
    await testDb.query(migration);
  }
}

// Export test database for use in tests
export { testDb };

// Test utilities
export const testUtils = {
  createTestUser: async (userData: any = {}) => {
    const defaultUser = {
      email: 'test@example.com',
      password_hash: '$2a$10$test.hash',
      name: 'Test User',
      role: 'employee'
    };
    
    const user = { ...defaultUser, ...userData };
    const result = await testDb.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [user.email, user.password_hash, user.name, user.role]
    );
    return result.rows[0];
  },

  createTestDevice: async (deviceData: any = {}) => {
    const defaultDevice = {
      device_id: 'TEST_DEVICE_001',
      device_name: 'Test Device',
      location: 'Test Location'
    };
    
    const device = { ...defaultDevice, ...deviceData };
    const result = await testDb.query(
      'INSERT INTO devices (device_id, device_name, location) VALUES ($1, $2, $3) RETURNING *',
      [device.device_id, device.device_name, device.location]
    );
    return result.rows[0];
  },

  createTestAttendance: async (attendanceData: any = {}) => {
    const defaultAttendance = {
      user_id: 1,
      device_id: 1,
      check_in_time: new Date(),
      status: 'present'
    };
    
    const attendance = { ...defaultAttendance, ...attendanceData };
    const result = await testDb.query(
      'INSERT INTO attendance_records (user_id, device_id, check_in_time, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [attendance.user_id, attendance.device_id, attendance.check_in_time, attendance.status]
    );
    return result.rows[0];
  }
};