const pidusage = require('pidusage');
const fs = require('fs');
const path = require('path');
const http = require('http');

class PerformanceMonitor {
  constructor(options = {}) {
    this.interval = options.interval || 5000; // 5 seconds
    this.duration = options.duration || 300000; // 5 minutes
    this.serverUrl = options.serverUrl || 'http://localhost:3001';
    this.metrics = [];
    this.isRunning = false;
  }
  
  async getSystemMetrics() {
    try {
      const stats = await pidusage(process.pid);
      return {
        timestamp: new Date().toISOString(),
        cpu: stats.cpu,
        memory: {
          rss: stats.memory,
          heapUsed: process.memoryUsage().heapUsed,
          heapTotal: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external
        },
        uptime: process.uptime()
      };
    } catch (error) {
      console.error('Error getting system metrics:', error);
      return null;
    }
  }
  
  async getServerHealth() {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const req = http.get(`${this.serverUrl}/health`, (res) => {
        const responseTime = Date.now() - startTime;
        let data = '';
        
        res.on('data', chunk => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            responseTime,
            healthy: res.statusCode === 200
          });
        });
      });
      
      req.on('error', (error) => {
        resolve({
          status: 0,
          responseTime: Date.now() - startTime,
          healthy: false,
          error: error.message
        });
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        resolve({
          status: 0,
          responseTime: 5000,
          healthy: false,
          error: 'Timeout'
        });
      });
    });
  }
  
  async collectMetrics() {
    const systemMetrics = await this.getSystemMetrics();
    const serverHealth = await this.getServerHealth();
    
    if (systemMetrics) {
      const metrics = {
        ...systemMetrics,
        server: serverHealth
      };
      
      this.metrics.push(metrics);
      
      console.log(`📊 [${metrics.timestamp}] CPU: ${metrics.cpu.toFixed(2)}% | Memory: ${(metrics.memory.rss / 1024 / 1024).toFixed(2)}MB | Response: ${serverHealth.responseTime}ms`);
    }
  }
  
  async start() {
    if (this.isRunning) {
      console.log('⚠️  Monitor is already running');
      return;
    }
    
    console.log('🚀 Starting Performance Monitor');
    console.log(`📊 Collecting metrics every ${this.interval}ms for ${this.duration}ms`);
    console.log('=' .repeat(80));
    
    this.isRunning = true;
    const startTime = Date.now();
    
    const intervalId = setInterval(async () => {
      if (Date.now() - startTime >= this.duration) {
        clearInterval(intervalId);
        await this.stop();
        return;
      }
      
      await this.collectMetrics();
    }, this.interval);
    
    // Initial collection
    await this.collectMetrics();
  }
  
  async stop() {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    console.log('\n🛑 Stopping Performance Monitor');
    
    // Save metrics
    const resultsDir = path.join(__dirname, '../results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const metricsFile = path.join(resultsDir, `performance-metrics-${timestamp}.json`);
    
    fs.writeFileSync(metricsFile, JSON.stringify(this.metrics, null, 2));
    
    console.log(`📊 Performance metrics saved to: ${metricsFile}`);
    
    // Generate summary
    this.generateSummary();
  }
  
  generateSummary() {
    if (this.metrics.length === 0) {
      console.log('❌ No metrics collected');
      return;
    }
    
    const cpuValues = this.metrics.map(m => m.cpu);
    const memoryValues = this.metrics.map(m => m.memory.rss);
    const responseTimeValues = this.metrics.map(m => m.server.responseTime).filter(rt => rt > 0);
    
    const summary = {
      duration: this.metrics.length * this.interval,
      samples: this.metrics.length,
      cpu: {
        avg: cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length,
        min: Math.min(...cpuValues),
        max: Math.max(...cpuValues)
      },
      memory: {
        avg: memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length,
        min: Math.min(...memoryValues),
        max: Math.max(...memoryValues)
      },
      responseTime: responseTimeValues.length > 0 ? {
        avg: responseTimeValues.reduce((a, b) => a + b, 0) / responseTimeValues.length,
        min: Math.min(...responseTimeValues),
        max: Math.max(...responseTimeValues)
      } : null,
      healthChecks: {
        total: this.metrics.length,
        successful: this.metrics.filter(m => m.server.healthy).length,
        failed: this.metrics.filter(m => !m.server.healthy).length
      }
    };
    
    console.log('\n📈 Performance Summary:');
    console.log('=' .repeat(50));
    console.log(`⏱️  Duration: ${(summary.duration / 1000).toFixed(2)}s`);
    console.log(`📊 Samples: ${summary.samples}`);
    console.log(`🖥️  CPU: ${summary.cpu.avg.toFixed(2)}% (${summary.cpu.min.toFixed(2)}% - ${summary.cpu.max.toFixed(2)}%)`);
    console.log(`💾 Memory: ${(summary.memory.avg / 1024 / 1024).toFixed(2)}MB (${(summary.memory.min / 1024 / 1024).toFixed(2)}MB - ${(summary.memory.max / 1024 / 1024).toFixed(2)}MB)`);
    
    if (summary.responseTime) {
      console.log(`⚡ Response Time: ${summary.responseTime.avg.toFixed(2)}ms (${summary.responseTime.min}ms - ${summary.responseTime.max}ms)`);
    }
    
    console.log(`✅ Health Checks: ${summary.healthChecks.successful}/${summary.healthChecks.total} successful`);
    
    if (summary.healthChecks.failed > 0) {
      console.log(`❌ Failed Health Checks: ${summary.healthChecks.failed}`);
    }
  }
}

if (require.main === module) {
  const monitor = new PerformanceMonitor({
    interval: 5000,
    duration: 300000 // 5 minutes
  });
  
  monitor.start().catch(console.error);
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, stopping monitor...');
    await monitor.stop();
    process.exit(0);
  });
}

module.exports = PerformanceMonitor;