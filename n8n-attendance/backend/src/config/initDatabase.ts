import pool from './database';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
/**
 * Initialize database with all required schemas
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('Initializing database schemas...');
    
    // Proactively create target DB if missing
    const dbName = process.env.DB_NAME!;
    const tmpPool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: 'postgres',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    });
    const exists = await tmpPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (exists.rowCount === 0) {
      await tmpPool.query(`CREATE DATABASE "${dbName}" OWNER "${process.env.DB_USER}"`);
      console.log(`✓ Created database ${dbName}`);
    }
    await tmpPool.end();

    // Define schema files in order of execution (dependencies first)
    const schemaFiles = [
      '00-init-user.sql',                // User setup.
      '01-schema.sql',                   // Base tables (users, devices, attendance)
      '02-automation-schema.sql',         // Automation features (creates offices table)
      '03-locations-schema.sql',          // Office locations (creates office_locations table)
      '04-security-schema.sql',           // Security features
      '05-gps-geofencing-migration.sql',  // GPS features
      '06-breaks-schema.sql',             // Break management (references office_locations)
      '07-overtime-schema.sql',           // Overtime tracking
      '08-timesheet-schema.sql',          // Weekly timesheets
      '09-daily-timesheet-schema.sql',    // Daily timesheets
      '10-projects-schema.sql',           // Project management
      '11-grace-period-schema.sql',       // Grace period rules
      '12-policy-templates-schema.sql',   // Policy templates
      '13-audit-trail-schema.sql',        // Audit logging
      '14-violation-detection-schema.sql', // Policy violations
      '15-escalation-rules-schema.sql',   // Escalation rules
      '16-leave-management-schema.sql',   // Leave requests
      '17-delegation-schema.sql',         // Leave delegation and approval
      '18-wifi-schema.sql',               // WiFi detection
      '19-notification-schema.sql',       // Notifications
      '20-monitoring-schema.sql',         // Error tracking and monitoring
      '21-holiday-schema.sql',            // Holiday management
      '22-scheduled-reports-schema.sql',  // Scheduled reports
      '23-manual-override-migration.sql', // Manual overrides
      '24-add-manager-id-migration.sql',  // Manager ID migration
      '25-fix-office-locations-migration.sql', // Office locations fix
      '26-remove-office-location-migration.sql', // Office location removal
      '27-location-transfer-notifications.sql', // Location transfer notifications
      '28-system-config-schema.sql',      // System configuration
      '29-rls-policies-schema-fixed.sql', // Row Level Security (fixed version)
      '30-update-rls-policies-migration-fixed.sql', // RLS policies migration (FIXED VERSION)
    ];
    
    // Use absolute path that works in both development and Docker container
    const schemaDir = process.env.NODE_ENV === 'production' 
      ? path.join(process.cwd(), 'src/database')
      : path.join(__dirname, '../database');
    
    console.log(`Looking for schema files in: ${schemaDir}`);
    
    for (const file of schemaFiles) {
      const filePath = path.join(schemaDir, file);
      
      if (fs.existsSync(filePath)) {
        console.log(`Executing schema: ${file}`);
        const sql = fs.readFileSync(filePath, 'utf8');
        await pool.query(sql);
        console.log(`✓ ${file} executed successfully`);
      } else {
        console.warn(`⚠ Schema file not found: ${file}`);
      }
    }
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

/**
 * Check if manual override schema is applied
 */
export async function checkManualOverrideSchema(): Promise<boolean> {
  try {
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'attendance' 
      AND column_name = 'is_manual_override'
    `);
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking manual override schema:', error);
    return false;
  }
}