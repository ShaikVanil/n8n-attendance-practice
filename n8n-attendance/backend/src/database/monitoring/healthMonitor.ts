import pool from '../../config/database';

export class DatabaseHealthMonitor {
  async checkConnection(): Promise<boolean> {
    try {
      const result = await pool.query('SELECT 1');
      return result.rows.length > 0;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  }

  async getConnectionStats(): Promise<any> {
    try {
      const result = await pool.query(`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);
      return result.rows[0];
    } catch (error) {
      console.error('Failed to get connection stats:', error);
      return null;
    }
  }

  async getTableSizes(): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);
      return result.rows;
    } catch (error) {
      console.error('Failed to get table sizes:', error);
      return [];
    }
  }

  async getSlowQueries(): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT 
          query,
          mean_exec_time,
          calls,
          total_exec_time,
          rows,
          100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements 
        ORDER BY mean_exec_time DESC 
        LIMIT 10
      `);
      return result.rows;
    } catch (error) {
      // pg_stat_statements might not be enabled
      return [];
    }
  }

  async generateHealthReport(): Promise<any> {
    const report = {
      timestamp: new Date().toISOString(),
      connection_healthy: await this.checkConnection(),
      connection_stats: await this.getConnectionStats(),
      table_sizes: await this.getTableSizes(),
      slow_queries: await this.getSlowQueries()
    };
    
    console.log('📊 Database Health Report:', JSON.stringify(report, null, 2));
    return report;
  }
}