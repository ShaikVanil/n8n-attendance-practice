import { Request, Response, NextFunction } from 'express';
import { monitoringService } from '../services/monitoringService';
import { errorTrackingService } from '../services/errorTrackingService';

// Request monitoring middleware
export const requestMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Capture original end method
  const originalEnd = res.end;
  
  res.end = function(chunk?: any, encoding?: any, cb?: any): Response {
    const duration = Date.now() - startTime;
    
    // Record request metrics
    monitoringService.recordRequestMetric(
      req.method,
      req.route?.path || req.path,
      res.statusCode,
      duration
    );
    
    // Log slow requests
    if (duration > 5000) {
      errorTrackingService.captureError(`Slow request: ${req.method} ${req.path}`, {
        level: 'warning',
        context: {
          duration,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode
        },
        userId: (req as any).user?.id,
        ip: req.ip,
        url: req.originalUrl,
        method: req.method
      });
    }
    
    // Call original end method with proper argument handling
    if (typeof encoding === 'function') {
      // encoding is actually the callback
      return originalEnd.call(this, chunk, encoding);
    } else {
      // normal case with chunk, encoding, and callback
      return originalEnd.call(this, chunk, encoding, cb);
    }
  };
  
  next();
};

// Business metrics middleware
export const businessMetrics = {
  // Track user activities
  trackUserActivity: (activity: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      res.on('finish', () => {
        if (res.statusCode < 400) {
          monitoringService.recordBusinessMetric('user_activities', 1, {
            activity,
            userId: (req as any).user?.id || 'anonymous'
          });
        }
      });
      next();
    };
  },

  // Track API usage
  trackApiUsage: (endpoint: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      res.on('finish', () => {
        monitoringService.recordBusinessMetric('api_usage', 1, {
          endpoint,
          method: req.method,
          status: res.statusCode.toString()
        });
      });
      next();
    };
  }
};

// Health check endpoint
export const healthCheck = async (req: Request, res: Response) => {
  try {
    const health = await monitoringService.getHealthStatus();
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    errorTrackingService.captureError(error as Error, {
      level: 'error',
      context: { endpoint: 'health-check' }
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Health check failed'
    });
  }
};

// Metrics endpoint (Prometheus format)
export const metricsEndpoint = (req: Request, res: Response) => {
  try {
    const metrics = monitoringService.exportPrometheusMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    errorTrackingService.captureError(error as Error, {
      level: 'error',
      context: { endpoint: 'metrics' }
    });
    
    res.status(500).json({ error: 'Failed to export metrics' });
  }
};