import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';

interface SecurityLogEntry {
  eventType: string;
  ipAddress: string;
  userAgent: string;
  userId?: string;
  path: string;
  method: string;
  statusCode?: number;
  details: any;
  timestamp: Date;
}

class SecurityLogger {
  private logQueue: SecurityLogEntry[] = [];
  private batchSize = 50;
  private flushInterval = 30000; // 30 seconds
  private isProcessing = false;
  
  constructor() {
    // Start periodic flush
    setInterval(() => {
      this.flushLogs();
    }, this.flushInterval);
    
    // Flush on process exit
    process.on('SIGINT', () => {
      this.flushLogs();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      this.flushLogs();
      process.exit(0);
    });
  }
  
  addLog(entry: SecurityLogEntry): void {
    this.logQueue.push(entry);
    
    if (this.logQueue.length >= this.batchSize) {
      this.flushLogs();
    }
  }
  
  private async flushLogs(): Promise<void> {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    const logsToProcess = [...this.logQueue];
    this.logQueue = [];
    
    try {
      const values = logsToProcess.map((log, index) => {
        const baseIndex = index * 8;
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8})`;
      }).join(', ');
      
      const params = logsToProcess.flatMap(log => [
        log.eventType,
        log.ipAddress,
        log.userAgent,
        log.userId,
        log.path,
        log.method,
        log.statusCode,
        JSON.stringify(log.details)
      ]);
      
      const query = `
        INSERT INTO security_logs (event_type, ip_address, user_agent, user_id, path, method, status_code, details)
        VALUES ${values}
      `;
      
      await pool.query(query, params);
      console.log(`Flushed ${logsToProcess.length} security logs`);
    } catch (error) {
      console.error('Failed to flush security logs:', error);
      // Re-add failed logs to queue for retry
      this.logQueue.unshift(...logsToProcess);
    } finally {
      this.isProcessing = false;
    }
  }
}

const securityLogger = new SecurityLogger();

export const securityLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//,  // Path traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
    /eval\(/i, // Code injection
    /javascript:/i // JavaScript injection
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(req.url) || 
    pattern.test(JSON.stringify(req.body)) ||
    pattern.test(JSON.stringify(req.query))
  );
  
  if (isSuspicious) {
    securityLogger.addLog({
      eventType: 'SUSPICIOUS_REQUEST',
      ipAddress: ip,
      userAgent,
      userId: (req as any).user?.id,
      path: req.path,
      method: req.method,
      details: {
        url: req.url,
        body: req.body,
        query: req.query,
        headers: req.headers
      },
      timestamp: new Date()
    });
  }
  
  // Override res.end to capture response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: () => void): Response {
    const responseTime = Date.now() - startTime;
    
    // Log security-relevant events
    if (res.statusCode >= 400 || req.path.includes('/auth') || isSuspicious) {
      let eventType = 'REQUEST';
      
      if (res.statusCode === 401) eventType = 'UNAUTHORIZED_ACCESS';
      else if (res.statusCode === 403) eventType = 'FORBIDDEN_ACCESS';
      else if (res.statusCode === 429) eventType = 'RATE_LIMIT_EXCEEDED';
      else if (res.statusCode >= 500) eventType = 'SERVER_ERROR';
      else if (req.path.includes('/auth')) eventType = 'AUTH_REQUEST';
      
      securityLogger.addLog({
        eventType,
        ipAddress: ip,
        userAgent,
        userId: (req as any).user?.id,
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        details: {
          responseTime,
          contentLength: res.get('content-length'),
          referer: req.get('referer')
        },
        timestamp: new Date()
      });
    }
    
    return originalEnd.call(this, chunk, encoding, cb);
  };
  
  next();
};

export { securityLogger };