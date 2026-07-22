import pool from '../../config/database';
import fs from 'fs';
import path from 'path';

interface Migration {
  id: string;
  name: string;
  version: string;
  executed_at?: Date;
}

export class MigrationRunner {
  private migrationsTable = 'schema_migrations';

  async initMigrationsTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        version VARCHAR(50) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64) NOT NULL
      );
    `;
    await pool.query(createTableSQL);
  }

  async getExecutedMigrations(): Promise<Migration[]> {
    const result = await pool.query(
      `SELECT * FROM ${this.migrationsTable} ORDER BY executed_at ASC`
    );
    return result.rows;
  }

  async executeMigration(migrationFile: string): Promise<void> {
    const migrationPath = path.join(__dirname, 'files', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const checksum = this.calculateChecksum(sql);
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Execute migration
      await client.query(sql);
      
      // Record migration
      await client.query(
        `INSERT INTO ${this.migrationsTable} (id, name, version, checksum) VALUES ($1, $2, $3, $4)`,
        [migrationFile, migrationFile.replace('.sql', ''), '1.0.0', checksum]
      );
      
      await client.query('COMMIT');
      console.log(`✅ Migration ${migrationFile} executed successfully`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private calculateChecksum(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async runMigrations(): Promise<void> {
    await this.initMigrationsTable();
    
    const migrationFiles = [
      '001_initial_schema.sql',
      '002_locations_schema.sql',
      '003_breaks_schema.sql',
      '004_policy_templates.sql',
      '005_escalation_rules.sql',
      '006_leave_management.sql',
      '007_automation_schema.sql',
      '008_wifi_schema.sql',
      '009_notification_schema.sql',
      '010_rls_policies.sql',
      '011_manual_override.sql'
    ];
    
    const executed = await this.getExecutedMigrations();
    const executedIds = executed.map(m => m.id);
    
    for (const file of migrationFiles) {
      if (!executedIds.includes(file)) {
        await this.executeMigration(file);
      }
    }
  }
}