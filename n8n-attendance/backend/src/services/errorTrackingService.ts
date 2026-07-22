import { EventEmitter } from 'events';
import pool from '../config/database';
import { monitoringService } from './monitoringService';

export interface ErrorEvent {
  id?: string;
  message: string;
  stack?: string;
  level: 'error' | 'warning' | 'info' | 'debug';
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
  url?: string;
  method?: string;
  timestamp: Date;
  fingerprint?: string;
  tags?: Record<string, string>;
}

export interface ErrorSummary {
  fingerprint: string;
  message: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  level: string;
  resolved: boolean;
}

export class ErrorTrackingService extends EventEmitter {
  private errorBuffer: ErrorEvent[] = [];
  private bufferSize = 100;
  private flushInterval = 10000; // 10 seconds
  private errorPatterns: Map<string, ErrorSummary> = new Map();

  constructor() {
    super();
    this.startErrorProcessing();
  }

  // Error Capture
  captureError(error: Error | string, context?: Partial<ErrorEvent>): string {
    const errorEvent: ErrorEvent = {
      id: this.generateId(),
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      level: context?.level || 'error',
      context: context?.context,
      userId: context?.userId,
      sessionId: context?.sessionId,
      userAgent: context?.userAgent,
      ip: context?.ip,
      url: context?.url,
      method: context?.method,
      timestamp: new Date(),
      tags: context?.tags
    };

    // Generate fingerprint for grouping similar errors
    errorEvent.fingerprint = this.generateFingerprint(errorEvent);

    // Add to buffer
    this.errorBuffer.push(errorEvent);

    // Update error patterns
    this.updateErrorPattern(errorEvent);

    // Record metric
    monitoringService.recordMetric({
      name: 'errors.total',
      value: 1,
      type: 'counter',
      tags: {
        level: errorEvent.level,
        fingerprint: errorEvent.fingerprint
      }
    });

    // Emit event
    this.emit('error', errorEvent);

    // Flush if buffer is full
    if (this.errorBuffer.length >= this.bufferSize) {
      this.flushErrors();
    }

    return errorEvent.id!;
  }

  // Error Processing
  private generateFingerprint(error: ErrorEvent): string {
    // Create a fingerprint based on error message and stack trace
    const content = `${error.message}${error.stack || ''}`;
    return this.simpleHash(content);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private updateErrorPattern(error: ErrorEvent): void {
    const existing = this.errorPatterns.get(error.fingerprint!);
    
    if (existing) {
      existing.count++;
      existing.lastSeen = error.timestamp;
    } else {
      this.errorPatterns.set(error.fingerprint!, {
        fingerprint: error.fingerprint!,
        message: error.message,
        count: 1,
        firstSeen: error.timestamp,
        lastSeen: error.timestamp,
        level: error.level,
        resolved: false
      });
    }
  }

  // Database Operations
  private async flushErrors(): Promise<void> {
    if (this.errorBuffer.length === 0) return;

    const errors = [...this.errorBuffer];
    this.errorBuffer = [];

    try {
      const query = `
        INSERT INTO error_logs (
          id, message, stack, level, context, user_id, session_id,
          user_agent, ip, url, method, timestamp, fingerprint, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `;

      for (const error of errors) {
        await pool.query(query, [
          error.id,
          error.message,
          error.stack,
          error.level,
          JSON.stringify(error.context),
          error.userId,
          error.sessionId,
          error.userAgent,
          error.ip,
          error.url,
          error.method,
          error.timestamp,
          error.fingerprint,
          JSON.stringify(error.tags)
        ]);
      }

      console.log(`✅ Flushed ${errors.length} errors to database`);
    } catch (dbError) {
      console.error('Failed to flush errors to database:', dbError);
      // Re-add errors to buffer for retry
      this.errorBuffer.unshift(...errors);
    }
  }

  // Error Retrieval
  async getErrors(options: {
    level?: string;
    since?: Date;
    limit?: number;
    fingerprint?: string;
  } = {}): Promise<ErrorEvent[]> {
    let query = 'SELECT * FROM error_logs WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (options.level) {
      query += ` AND level = $${paramIndex++}`;
      params.push(options.level);
    }

    if (options.since) {
      query += ` AND timestamp >= $${paramIndex++}`;
      params.push(options.since);
    }

    if (options.fingerprint) {
      query += ` AND fingerprint = $${paramIndex++}`;
      params.push(options.fingerprint);
    }

    query += ' ORDER BY timestamp DESC';

    if (options.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(options.limit);
    }

    try {
      const result = await pool.query(query, params);
      return result.rows.map(row => ({
        ...row,
        context: row.context ? JSON.parse(row.context) : undefined,
        tags: row.tags ? JSON.parse(row.tags) : undefined
      }));
    } catch (error) {
      console.error('Failed to retrieve errors:', error);
      return [];
    }
  }

  async getErrorSummaries(since?: Date): Promise<ErrorSummary[]> {
    let query = `
      SELECT 
        fingerprint,
        message,
        COUNT(*) as count,
        MIN(timestamp) as first_seen,
        MAX(timestamp) as last_seen,
        level,
        false as resolved
      FROM error_logs
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (since) {
      query += ' AND timestamp >= $1';
      params.push(since);
    }
    
    query += `
      GROUP BY fingerprint, message, level
      ORDER BY count DESC, last_seen DESC
    `;

    try {
      const result = await pool.query(query, params);
      return result.rows.map(row => ({
        fingerprint: row.fingerprint,
        message: row.message,
        count: parseInt(row.count),
        firstSeen: row.first_seen,
        lastSeen: row.last_seen,
        level: row.level,
        resolved: row.resolved
      }));
    } catch (error) {
      console.error('Failed to retrieve error summaries:', error);
      return [];
    }
  }

  // Utility Methods
  private generateId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startErrorProcessing(): void {
    // Flush errors periodically
    setInterval(() => {
      this.flushErrors();
    }, this.flushInterval);

    // Clean up old error patterns from memory
    setInterval(() => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
      for (const [fingerprint, summary] of this.errorPatterns) {
        if (summary.lastSeen < cutoff) {
          this.errorPatterns.delete(fingerprint);
        }
      }
    }, 60 * 60 * 1000); // Every hour
  }

  // Express Error Handler
  expressErrorHandler() {
    return (error: Error, req: any, res: any, next: any) => {
      this.captureError(error, {
        level: 'error',
        context: {
          body: req.body,
          params: req.params,
          query: req.query
        },
        userId: req.user?.id,
        sessionId: req.sessionID,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        url: req.originalUrl,
        method: req.method
      });

      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production') {
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.status(500).json({ error: error.message, stack: error.stack });
      }
    };
  }
}

// Singleton instance
export const errorTrackingService = new ErrorTrackingService();