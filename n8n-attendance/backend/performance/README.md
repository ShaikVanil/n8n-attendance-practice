# Performance Testing Suite

This directory contains comprehensive performance and load testing tools for the N8N Attendance System backend.

## 🚀 Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure the server is running
npm run dev
```

### Running Tests

```bash
# Run all performance tests
npm run test:performance

# Run individual test types
npm run perf:load        # Load testing with Artillery
npm run perf:stress      # Stress testing
npm run perf:benchmark   # Benchmark individual endpoints
npm run perf:monitor     # Monitor system performance
npm run perf:report      # Generate HTML report
```

## 📊 Test Types

### 1. Load Testing (Artillery)

**Purpose:** Test system behavior under expected load conditions

**Configuration:** `load-tests/api-load-test.yml`

**Scenarios:**
- Authentication Flow (30% of traffic)
- Attendance Operations (40% of traffic)
- User Management (20% of traffic)
- Reports Generation (10% of traffic)

**Load Phases:**
1. Warm-up: 5 users/sec for 60s
2. Ramp-up: 5→50 users/sec over 120s
3. Sustained: 50 users/sec for 300s
4. Peak: 50→100 users/sec over 120s
5. Cool-down: 100→5 users/sec over 60s

### 2. Stress Testing

**Purpose:** Find system breaking points and resource limits

**Configuration:** `stress-tests/stress-test.yml`

**Test Areas:**
- Database stress (rapid CRUD operations)
- Memory stress (large data operations)
- Concurrent operations (parallel requests)

**Load Phases:**
1. Gradual increase: 10→100 users/sec over 60s
2. High stress: 100→200 users/sec over 180s
3. Extreme stress: 200→500 users/sec over 120s
4. Recovery: 500→10 users/sec over 60s

### 3. Benchmark Testing

**Purpose:** Establish performance baselines for individual endpoints

**Tool:** Autocannon

**Endpoints Tested:**
- Health check
- Authentication
- User profile
- Attendance operations

**Metrics Collected:**
- Requests per second
- Latency (average, P50, P90, P95, P99)
- Throughput
- Error rates

### 4. Performance Monitoring

**Purpose:** Real-time system resource monitoring during tests

**Metrics Tracked:**
- CPU usage
- Memory consumption (RSS, Heap)
- Response times
- Health check success rates

**Duration:** Configurable (default: 5 minutes)
**Interval:** Configurable (default: 5 seconds)

## 📈 Performance Targets

### Response Time Targets
- Health check: < 50ms
- Authentication: < 200ms
- CRUD operations: < 300ms
- Reports generation: < 2000ms

### Throughput Targets
- Authentication: > 100 req/sec
- Attendance operations: > 200 req/sec
- User management: > 150 req/sec

### Resource Limits
- CPU usage: < 70% under normal load
- Memory usage: < 256MB under normal load
- Error rate: < 0.1%

### Availability Targets
- Health check success rate: > 99.9%
- API availability: > 99.5%

## 🔧 Configuration

### Environment Variables

```bash
# Test configuration
TEST_TARGET_URL=http://localhost:3001
TEST_DURATION=300000  # 5 minutes
TEST_INTERVAL=5000    # 5 seconds

# Authentication
JWT_SECRET=your-test-secret
TEST_USER_EMAIL=test@example.com
TEST_ADMIN_EMAIL=admin@example.com
```

### Artillery Configuration

Edit `load-tests/api-load-test.yml` to customize:
- Target URL
- Load phases (duration, arrival rate)
- Test scenarios and weights
- Request payloads

### Stress Test Configuration

Edit `stress-tests/stress-test.yml` to customize:
- Stress levels
- Test duration
- Concurrent operation types

## 📊 Results and Reporting

### Result Files

All test results are saved in the `results/` directory:
results/
├── benchmark-2024-01-15T10-30-00.json
├── performance-metrics-2024-01-15T10-30-00.json
├── performance-report-2024-01-15T10-35-00.html
└── artillery-reports/
├── load-test-2024-01-15T10-30-00.json
└── stress-test-2024-01-15T10-32-00.json


### HTML Reports

Generate comprehensive HTML reports with:

```bash
npm run perf:report
```

Reports include:
- Benchmark results with status indicators
- System performance metrics
- Performance recommendations
- Trend analysis (if multiple reports exist)

### Interpreting Results

#### Good Performance Indicators
- ✅ Response times within targets
- ✅ Zero or minimal errors
- ✅ Stable resource usage
- ✅ High health check success rate

#### Warning Signs
- ⚠️ Response times approaching limits
- ⚠️ Increasing error rates
- ⚠️ High resource usage (>60% CPU, >200MB memory)
- ⚠️ Occasional health check failures

#### Critical Issues
- ❌ Response times exceeding targets
- ❌ High error rates (>1%)
- ❌ Resource exhaustion
- ❌ Frequent health check failures

## 🛠️ Troubleshooting

### Common Issues

#### High Latency
- Check database query performance
- Review middleware processing time
- Analyze network conditions
- Consider caching strategies

#### Memory Leaks
- Monitor heap growth over time
- Check for unclosed database connections
- Review event listener cleanup
- Analyze object retention

#### High Error Rates
- Check server logs for error details
- Verify database connectivity
- Review rate limiting configuration
- Analyze request validation failures

#### Resource Exhaustion
- Scale server resources
- Optimize database queries
- Implement connection pooling
- Add caching layers

### Performance Optimization Tips

1. **Database Optimization**
   - Add appropriate indexes
   - Optimize query patterns
   - Use connection pooling
   - Implement query caching

2. **API Optimization**
   - Implement response caching
   - Use compression middleware
   - Optimize JSON serialization
   - Implement pagination

3. **Resource Management**
   - Monitor memory usage
   - Implement graceful shutdowns
   - Use clustering for CPU-bound tasks
   - Optimize garbage collection

4. **Monitoring and Alerting**
   - Set up performance alerts
   - Monitor key metrics continuously
   - Implement health checks
   - Use APM tools in production

## 🔄 Continuous Performance Testing

### CI/CD Integration

Add performance tests to your CI/CD pipeline:

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run test:performance
      - uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: backend/performance/results/
```

### Automated Monitoring

Set up automated performance monitoring:

```bash
# Run daily performance checks
0 2 * * * cd /path/to/project && npm run perf:benchmark
0 3 * * * cd /path/to/project && npm run perf:report
```

## 📚 Additional Resources

- [Artillery Documentation](https://artillery.io/docs/)
- [Autocannon Documentation](https://github.com/mcollina/autocannon)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Express.js Performance Tips](https://expressjs.com/en/advanced/best-practice-performance.html)