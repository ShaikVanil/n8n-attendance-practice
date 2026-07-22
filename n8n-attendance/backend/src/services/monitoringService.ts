import { EventEmitter } from 'events';
import os from 'os';
import process from 'process';
import pool from '../config/database';
import { DatabaseHealthMonitor } from '../database/monitoring/healthMonitor';

export interface MetricData {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
}

export interface AlertRule {
  id: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number; // seconds
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export class MonitoringService extends EventEmitter {
  private metrics: Map<string, MetricData[]> = new Map();
  private alerts: Map<string, AlertRule> = new Map();
  private dbHealthMonitor: DatabaseHealthMonitor;
  private metricsRetentionDays = 7;
  private alertStates: Map<string, { triggered: boolean; since: Date }> = new Map();

  constructor() {
    super();
    this.dbHealthMonitor = new DatabaseHealthMonitor();
    this.initializeDefaultAlerts();
    this.startMetricsCollection();
  }

  // Metrics Collection
  recordMetric(metric: Omit<MetricData, 'timestamp'>): void {
    const metricData: MetricData = {
      ...metric,
      timestamp: new Date()
    };

    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }

    const metricArray = this.metrics.get(metric.name)!;
    metricArray.push(metricData);

    // Keep only recent metrics
    const cutoff = new Date(Date.now() - this.metricsRetentionDays * 24 * 60 * 60 * 1000);
    this.metrics.set(
      metric.name,
      metricArray.filter(m => m.timestamp > cutoff)
    );

    // Check alerts
    this.checkAlerts(metric.name, metric.value);

    // Emit metric event
    this.emit('metric', metricData);
  }

  // System Metrics
  private collectSystemMetrics(): void {
    // CPU Usage
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    const cpuUsage = 100 - (totalIdle / totalTick) * 100;
    this.recordMetric({
      name: 'system.cpu.usage',
      value: cpuUsage,
      type: 'gauge',
      tags: { unit: 'percent' }
    });

    // Memory Usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = (usedMem / totalMem) * 100;

    this.recordMetric({
      name: 'system.memory.usage',
      value: memUsagePercent,
      type: 'gauge',
      tags: { unit: 'percent' }
    });

    this.recordMetric({
      name: 'system.memory.used',
      value: usedMem,
      type: 'gauge',
      tags: { unit: 'bytes' }
    });

    // Process Memory
    const processMemory = process.memoryUsage();
    this.recordMetric({
      name: 'process.memory.heap.used',
      value: processMemory.heapUsed,
      type: 'gauge',
      tags: { unit: 'bytes' }
    });

    this.recordMetric({
      name: 'process.memory.heap.total',
      value: processMemory.heapTotal,
      type: 'gauge',
      tags: { unit: 'bytes' }
    });

    // Load Average (Unix systems)
    if (os.platform() !== 'win32') {
      const loadAvg = os.loadavg();
      this.recordMetric({
        name: 'system.load.1m',
        value: loadAvg[0],
        type: 'gauge'
      });
    }
  }

  // Database Metrics
  private async collectDatabaseMetrics(): Promise<void> {
    try {
      const connectionStats = await this.dbHealthMonitor.getConnectionStats();
      if (connectionStats) {
        this.recordMetric({
          name: 'database.connections.total',
          value: parseInt(connectionStats.total_connections),
          type: 'gauge'
        });

        this.recordMetric({
          name: 'database.connections.active',
          value: parseInt(connectionStats.active_connections),
          type: 'gauge'
        });
      }

      // Database size
      const result = await pool.query(`
        SELECT pg_database_size(current_database()) as size
      `);
      
      if (result.rows[0]) {
        this.recordMetric({
          name: 'database.size',
          value: parseInt(result.rows[0].size),
          type: 'gauge',
          tags: { unit: 'bytes' }
        });
      }
    } catch (error) {
      console.error('Failed to collect database metrics:', error);
    }
  }

  // Application Metrics
  recordRequestMetric(method: string, route: string, statusCode: number, duration: number): void {
    this.recordMetric({
      name: 'http.requests.total',
      value: 1,
      type: 'counter',
      tags: { method, route, status: statusCode.toString() }
    });

    this.recordMetric({
      name: 'http.request.duration',
      value: duration,
      type: 'histogram',
      tags: { method, route }
    });

    // Track error rates
    if (statusCode >= 400) {
      this.recordMetric({
        name: 'http.errors.total',
        value: 1,
        type: 'counter',
        tags: { method, route, status: statusCode.toString() }
      });
    }
  }

  recordBusinessMetric(name: string, value: number, tags?: Record<string, string>): void {
    this.recordMetric({
      name: `business.${name}`,
      value,
      type: 'gauge',
      tags
    });
  }

  // Alert Management
  private initializeDefaultAlerts(): void {
    const defaultAlerts: AlertRule[] = [
      {
        id: 'high-cpu-usage',
        metric: 'system.cpu.usage',
        condition: 'gt',
        threshold: 80,
        duration: 300, // 5 minutes
        severity: 'high',
        enabled: true
      },
      {
        id: 'high-memory-usage',
        metric: 'system.memory.usage',
        condition: 'gt',
        threshold: 85,
        duration: 300,
        severity: 'high',
        enabled: true
      },
      {
        id: 'high-error-rate',
        metric: 'http.errors.total',
        condition: 'gt',
        threshold: 10,
        duration: 60,
        severity: 'critical',
        enabled: true
      },
      {
        id: 'slow-response-time',
        metric: 'http.request.duration',
        condition: 'gt',
        threshold: 5000, // 5 seconds
        duration: 120,
        severity: 'medium',
        enabled: true
      }
    ];

    defaultAlerts.forEach(alert => {
      this.alerts.set(alert.id, alert);
    });
  }

  private checkAlerts(metricName: string, value: number): void {
    for (const [alertId, alert] of this.alerts) {
      if (!alert.enabled || alert.metric !== metricName) continue;

      const shouldTrigger = this.evaluateCondition(value, alert.condition, alert.threshold);
      const currentState = this.alertStates.get(alertId);

      if (shouldTrigger && !currentState?.triggered) {
        // Alert triggered
        this.alertStates.set(alertId, { triggered: true, since: new Date() });
        this.emit('alert', {
          id: alertId,
          rule: alert,
          value,
          triggered: true,
          timestamp: new Date()
        });
      } else if (!shouldTrigger && currentState?.triggered) {
        // Alert resolved
        this.alertStates.set(alertId, { triggered: false, since: new Date() });
        this.emit('alert', {
          id: alertId,
          rule: alert,
          value,
          triggered: false,
          timestamp: new Date()
        });
      }
    }
  }

  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  // Metrics Retrieval
  getMetrics(name?: string, since?: Date): MetricData[] {
    if (name) {
      const metrics = this.metrics.get(name) || [];
      return since ? metrics.filter(m => m.timestamp >= since) : metrics;
    }

    const allMetrics: MetricData[] = [];
    for (const metricArray of this.metrics.values()) {
      allMetrics.push(...metricArray);
    }

    return since ? allMetrics.filter(m => m.timestamp >= since) : allMetrics;
  }

  getMetricSummary(name: string, since?: Date): any {
    const metrics = this.getMetrics(name, since);
    if (metrics.length === 0) return null;

    const values = metrics.map(m => m.value);
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      latest: values[values.length - 1],
      timestamp: metrics[metrics.length - 1].timestamp
    };
  }

  // Health Check
  async getHealthStatus(): Promise<any> {
    const dbHealth = await this.dbHealthMonitor.generateHealthReport();
    const systemMetrics = {
      cpu: this.getMetricSummary('system.cpu.usage'),
      memory: this.getMetricSummary('system.memory.usage'),
      load: this.getMetricSummary('system.load.1m')
    };

    const activeAlerts = Array.from(this.alertStates.entries())
      .filter(([_, state]) => state.triggered)
      .map(([id, state]) => ({ id, since: state.since }));

    return {
      status: activeAlerts.length === 0 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      system: systemMetrics,
      alerts: activeAlerts,
      uptime: process.uptime()
    };
  }

  // Start/Stop
  private startMetricsCollection(): void {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Collect database metrics every minute
    setInterval(() => {
      this.collectDatabaseMetrics();
    }, 60000);

    // Initial collection
    this.collectSystemMetrics();
    this.collectDatabaseMetrics();
  }

  // Export metrics for external systems (Prometheus format)
  exportPrometheusMetrics(): string {
    let output = '';
    
    for (const [name, metricArray] of this.metrics) {
      if (metricArray.length === 0) continue;
      
      const latest = metricArray[metricArray.length - 1];
      const metricName = name.replace(/\./g, '_');
      
      output += `# TYPE ${metricName} ${latest.type}\n`;
      
      if (latest.tags) {
        const labels = Object.entries(latest.tags)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        output += `${metricName}{${labels}} ${latest.value}\n`;
      } else {
        output += `${metricName} ${latest.value}\n`;
      }
    }
    
    return output;
  }
}

// Singleton instance
export const monitoringService = new MonitoringService();