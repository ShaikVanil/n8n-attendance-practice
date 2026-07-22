import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export class DatabaseBackupManager {
  private backupDir: string;
  private dbConfig: any;

  constructor() {
    this.backupDir = process.env.BACKUP_DIR || './backups';
    this.dbConfig = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    };
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup(type: 'full' | 'schema-only' | 'data-only' = 'full'): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${type}-${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);
    
    let pgDumpOptions = '';
    switch (type) {
      case 'schema-only':
        pgDumpOptions = '--schema-only';
        break;
      case 'data-only':
        pgDumpOptions = '--data-only';
        break;
      default:
        pgDumpOptions = '--verbose';
    }
    
    const command = `PGPASSWORD="${this.dbConfig.password}" pg_dump ` +
      `--host=${this.dbConfig.host} ` +
      `--port=${this.dbConfig.port} ` +
      `--username=${this.dbConfig.username} ` +
      `--dbname=${this.dbConfig.database} ` +
      `${pgDumpOptions} ` +
      `--file="${filepath}"`;
    
    try {
      await execAsync(command);
      console.log(`✅ Database backup created: ${filename}`);
      return filepath;
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }

  async restoreBackup(backupFile: string): Promise<void> {
    const command = `PGPASSWORD="${this.dbConfig.password}" psql ` +
      `--host=${this.dbConfig.host} ` +
      `--port=${this.dbConfig.port} ` +
      `--username=${this.dbConfig.username} ` +
      `--dbname=${this.dbConfig.database} ` +
      `--file="${backupFile}"`;
    
    try {
      await execAsync(command);
      console.log(`✅ Database restored from: ${backupFile}`);
    } catch (error) {
      console.error('❌ Restore failed:', error);
      throw error;
    }
  }

  async cleanupOldBackups(retentionDays: number = 30): Promise<void> {
    const files = fs.readdirSync(this.backupDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    for (const file of files) {
      const filepath = path.join(this.backupDir, file);
      const stats = fs.statSync(filepath);
      
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filepath);
        console.log(`🗑️ Deleted old backup: ${file}`);
      }
    }
  }

  async scheduleBackups(): Promise<void> {
    // Daily full backup at 2 AM
    const cron = require('node-cron');
    
    cron.schedule('0 2 * * *', async () => {
      console.log('🕐 Running scheduled backup...');
      await this.createBackup('full');
      await this.cleanupOldBackups();
    });
    
    console.log('📅 Backup scheduler initialized');
  }
}