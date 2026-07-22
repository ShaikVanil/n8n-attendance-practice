const fs = require('fs');
const path = require('path');

class PerformanceReportGenerator {
  constructor(resultsDir) {
    this.resultsDir = resultsDir || path.join(__dirname, '../results');
  }
  
  getLatestResults() {
    if (!fs.existsSync(this.resultsDir)) {
      throw new Error(`Results directory not found: ${this.resultsDir}`);
    }
    
    const files = fs.readdirSync(this.resultsDir);
    const benchmarkFiles = files.filter(f => f.startsWith('benchmark-') && f.endsWith('.json'));
    const metricsFiles = files.filter(f => f.startsWith('performance-metrics-') && f.endsWith('.json'));
    
    const latestBenchmark = benchmarkFiles.sort().pop();
    const latestMetrics = metricsFiles.sort().pop();
    
    return {
      benchmark: latestBenchmark ? JSON.parse(fs.readFileSync(path.join(this.resultsDir, latestBenchmark), 'utf8')) : null,
      metrics: latestMetrics ? JSON.parse(fs.readFileSync(path.join(this.resultsDir, latestMetrics), 'utf8')) : null
    };
  }
  
  generateHTMLReport(data) {
    const { benchmark, metrics } = data;
    
    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
        .metric-card { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff; }
        .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .metric-label { color: #666; font-size: 14px; }
        .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .table th, .table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        .table th { background-color: #f8f9fa; font-weight: bold; }
        .status-good { color: #28a745; }
        .status-warning { color: #ffc107; }
        .status-error { color: #dc3545; }
        .chart-placeholder { background: #f8f9fa; height: 200px; display: flex; align-items: center; justify-content: center; border-radius: 6px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Performance Test Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
`;
    
    if (benchmark) {
      html += `
        <div class="section">
            <h2>📊 Benchmark Results</h2>
            <div class="metric-grid">
`;
      
      benchmark.forEach(result => {
        const status = result.errors > 0 ? 'status-error' : 
                      result.latency.p95 > 1000 ? 'status-warning' : 'status-good';
        
        html += `
                <div class="metric-card">
                    <div class="metric-label">${result.endpoint}</div>
                    <div class="metric-value ${status}">${result.requests.average.toFixed(2)} req/s</div>
                    <div style="margin-top: 10px; font-size: 12px;">
                        <div>Avg Latency: ${result.latency.average.toFixed(2)}ms</div>
                        <div>P95 Latency: ${result.latency.p95.toFixed(2)}ms</div>
                        <div>Errors: ${result.errors}</div>
                    </div>
                </div>
`;
      });
      
      html += `
            </div>
            
            <table class="table">
                <thead>
                    <tr>
                        <th>Endpoint</th>
                        <th>Requests/sec</th>
                        <th>Avg Latency (ms)</th>
                        <th>P95 Latency (ms)</th>
                        <th>P99 Latency (ms)</th>
                        <th>Errors</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
`;
      
      benchmark.forEach(result => {
        const status = result.errors > 0 ? 'status-error' : 
                      result.latency.p95 > 1000 ? 'status-warning' : 'status-good';
        const statusText = result.errors > 0 ? '❌ Error' : 
                          result.latency.p95 > 1000 ? '⚠️ Warning' : '✅ Good';
        
        html += `
                    <tr>
                        <td>${result.endpoint}</td>
                        <td>${result.requests.average.toFixed(2)}</td>
                        <td>${result.latency.average.toFixed(2)}</td>
                        <td>${result.latency.p95.toFixed(2)}</td>
                        <td>${result.latency.p99.toFixed(2)}</td>
                        <td>${result.errors}</td>
                        <td class="${status}">${statusText}</td>
                    </tr>
`;
      });
      
      html += `
                </tbody>
            </table>
        </div>
`;
    }
    
    if (metrics && metrics.length > 0) {
      const cpuValues = metrics.map(m => m.cpu);
      const memoryValues = metrics.map(m => m.memory.rss / 1024 / 1024); // Convert to MB
      const responseTimeValues = metrics.map(m => m.server.responseTime).filter(rt => rt > 0);
      
      const summary = {
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
          total: metrics.length,
          successful: metrics.filter(m => m.server.healthy).length
        }
      };
      
      html += `
        <div class="section">
            <h2>📈 System Performance Metrics</h2>
            <div class="metric-grid">
                <div class="metric-card">
                    <div class="metric-label">Average CPU Usage</div>
                    <div class="metric-value">${summary.cpu.avg.toFixed(2)}%</div>
                    <div style="margin-top: 5px; font-size: 12px; color: #666;">
                        Range: ${summary.cpu.min.toFixed(2)}% - ${summary.cpu.max.toFixed(2)}%
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Average Memory Usage</div>
                    <div class="metric-value">${summary.memory.avg.toFixed(2)} MB</div>
                    <div style="margin-top: 5px; font-size: 12px; color: #666;">
                        Range: ${summary.memory.min.toFixed(2)}MB - ${summary.memory.max.toFixed(2)}MB
                    </div>
                </div>
`;
      
      if (summary.responseTime) {
        html += `
                <div class="metric-card">
                    <div class="metric-label">Average Response Time</div>
                    <div class="metric-value">${summary.responseTime.avg.toFixed(2)} ms</div>
                    <div style="margin-top: 5px; font-size: 12px; color: #666;">
                        Range: ${summary.responseTime.min}ms - ${summary.responseTime.max}ms
                    </div>
                </div>
`;
      }
      
      const healthPercentage = (summary.healthChecks.successful / summary.healthChecks.total * 100).toFixed(2);
      const healthStatus = healthPercentage === '100.00' ? 'status-good' : 
                          healthPercentage >= '95.00' ? 'status-warning' : 'status-error';
      
      html += `
                <div class="metric-card">
                    <div class="metric-label">Health Check Success Rate</div>
                    <div class="metric-value ${healthStatus}">${healthPercentage}%</div>
                    <div style="margin-top: 5px; font-size: 12px; color: #666;">
                        ${summary.healthChecks.successful}/${summary.healthChecks.total} successful
                    </div>
                </div>
            </div>
        </div>
`;
    }
    
    html += `
        <div class="section">
            <h2>📋 Performance Recommendations</h2>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 6px;">
`;
    
    // Generate recommendations based on results
    const recommendations = this.generateRecommendations({ benchmark, metrics });
    recommendations.forEach(rec => {
      html += `<div style="margin-bottom: 10px;">• ${rec}</div>`;
    });
    
    html += `
            </div>
        </div>
    </div>
</body>
</html>
`;
    
    return html;
  }
  
  generateRecommendations(data) {
    const recommendations = [];
    const { benchmark, metrics } = data;
    
    if (benchmark) {
      const highLatencyEndpoints = benchmark.filter(r => r.latency.p95 > 1000);
      const errorEndpoints = benchmark.filter(r => r.errors > 0);
      const lowThroughputEndpoints = benchmark.filter(r => r.requests.average < 10);
      
      if (errorEndpoints.length > 0) {
        recommendations.push(`🔴 <strong>Critical:</strong> ${errorEndpoints.length} endpoint(s) have errors: ${errorEndpoints.map(e => e.endpoint).join(', ')}`);
      }
      
      if (highLatencyEndpoints.length > 0) {
        recommendations.push(`🟡 <strong>Warning:</strong> High latency detected on ${highLatencyEndpoints.length} endpoint(s): ${highLatencyEndpoints.map(e => e.endpoint).join(', ')}`);
      }
      
      if (lowThroughputEndpoints.length > 0) {
        recommendations.push(`🟡 <strong>Performance:</strong> Low throughput on ${lowThroughputEndpoints.length} endpoint(s): ${lowThroughputEndpoints.map(e => e.endpoint).join(', ')}`);
      }
    }
    
    if (metrics && metrics.length > 0) {
      const cpuValues = metrics.map(m => m.cpu);
      const memoryValues = metrics.map(m => m.memory.rss / 1024 / 1024);
      const avgCpu = cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length;
      const avgMemory = memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length;
      
      if (avgCpu > 80) {
        recommendations.push(`🔴 <strong>Critical:</strong> High CPU usage detected (${avgCpu.toFixed(2)}%). Consider scaling or optimization.`);
      } else if (avgCpu > 60) {
        recommendations.push(`🟡 <strong>Warning:</strong> Moderate CPU usage (${avgCpu.toFixed(2)}%). Monitor for scaling needs.`);
      }
      
      if (avgMemory > 512) {
        recommendations.push(`🔴 <strong>Critical:</strong> High memory usage detected (${avgMemory.toFixed(2)}MB). Check for memory leaks.`);
      } else if (avgMemory > 256) {
        recommendations.push(`🟡 <strong>Warning:</strong> Moderate memory usage (${avgMemory.toFixed(2)}MB). Monitor memory growth.`);
      }
      
      const failedHealthChecks = metrics.filter(m => !m.server.healthy).length;
      if (failedHealthChecks > 0) {
        const failureRate = (failedHealthChecks / metrics.length * 100).toFixed(2);
        recommendations.push(`🔴 <strong>Critical:</strong> ${failureRate}% of health checks failed. Investigate server stability.`);
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ <strong>Good:</strong> All performance metrics are within acceptable ranges.');
      recommendations.push('💡 <strong>Tip:</strong> Continue monitoring performance regularly and consider setting up automated alerts.');
    }
    
    return recommendations;
  }
  
  async generateReport() {
    try {
      console.log('📊 Generating Performance Report...');
      
      const data = this.getLatestResults();
      
      if (!data.benchmark && !data.metrics) {
        throw new Error('No performance data found. Run benchmarks and monitoring first.');
      }
      
      const html = this.generateHTMLReport(data);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportFile = path.join(this.resultsDir, `performance-report-${timestamp}.html`);
      
      fs.writeFileSync(reportFile, html);
      
      console.log(`✅ Performance report generated: ${reportFile}`);
      console.log(`🌐 Open in browser: file://${reportFile}`);
      
      return reportFile;
    } catch (error) {
      console.error('❌ Error generating report:', error.message);
      throw error;
    }
  }
}

if (require.main === module) {
  const generator = new PerformanceReportGenerator();
  generator.generateReport().catch(console.error);
}

module.exports = PerformanceReportGenerator;