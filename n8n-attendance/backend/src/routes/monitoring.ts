import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { monitoringService } from '../services/monitoringService';
import { errorTrackingService } from '../services/errorTrackingService';
import { healthCheck, metricsEndpoint } from '../middleware/monitoring';

const router = express.Router();

// Public health check endpoint
router.get('/health', healthCheck);

// Public metrics endpoint (for Prometheus)
router.get('/metrics', metricsEndpoint);

// Protected monitoring endpoints
router.use(authenticateToken);

// Get system metrics
router.get('/system-metrics', async (req, res) => {
  try {
    const { metric, since } = req.query;
    const sinceDate = since ? new Date(since as string) : undefined;
    
    if (metric) {
      const summary = monitoringService.getMetricSummary(metric as string, sinceDate);
      res.json({ metric, summary });
    } else {
      const metrics = monitoringService.getMetrics(undefined, sinceDate);
      res.json({ metrics });
    }
  } catch (error) {
    errorTrackingService.captureError(error as Error, {
      level: 'error',
      context: { endpoint: 'system-metrics' },
      userId: (req as any).user?.id
    });
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

// Get error logs
router.get('/errors', async (req, res) => {
  try {
    const { level, since, limit, fingerprint } = req.query;
    const options: any = {};
    
    if (level) options.level = level as string;
    if (since) options.since = new Date(since as string);
    if (limit) options.limit = parseInt(limit as string);
    if (fingerprint) options.fingerprint = fingerprint as string;
    
    const errors = await errorTrackingService.getErrors(options);
    res.json({ errors });
  } catch (error) {
    errorTrackingService.captureError(error as Error, {
      level: 'error',
      context: { endpoint: 'errors' },
      userId: (req as any).user?.id
    });
    res.status(500).json({ error: 'Failed to retrieve errors' });
  }
});

// Get error summaries
router.get('/error-summaries', async (req, res) => {
  try {
    const { since } = req.query;
    const sinceDate = since ? new Date(since as string) : undefined;
    
    const summaries = await errorTrackingService.getErrorSummaries(sinceDate);
    res.json({ summaries });
  } catch (error) {
    errorTrackingService.captureError(error as Error, {
      level: 'error',
      context: { endpoint: 'error-summaries' },
      userId: (req as any).user?.id
    });
    res.status(500).json({ error: 'Failed to retrieve error summaries' });
  }
});

// Dashboard data endpoint
router.get('/dashboard', async (req, res) => {
  try {
    const health = await monitoringService.getHealthStatus();
    const errorSummaries = await errorTrackingService.getErrorSummaries(
      new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    );
    
    const systemMetrics = {
      cpu: monitoringService.getMetricSummary('system.cpu.usage'),
      memory: monitoringService.getMetricSummary('system.memory.usage'),
      requests: monitoringService.getMetricSummary('http.requests.total'),
      errors: monitoringService.getMetricSummary('http.errors.total'),
      responseTime: monitoringService.getMetricSummary('http.request.duration')
    };
    
    res.json({
      health,
      systemMetrics,
      errorSummaries: errorSummaries.slice(0, 10), // Top 10 errors
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    errorTrackingService.captureError(error as Error, {
      level: 'error',
      context: { endpoint: 'dashboard' },
      userId: (req as any).user?.id
    });
    res.status(500).json({ error: 'Failed to retrieve dashboard data' });
  }
});

export default router;