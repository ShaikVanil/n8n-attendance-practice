const autocannon = require('autocannon');
const fs = require('fs');
const path = require('path');

const BENCHMARK_CONFIG = {
  url: 'http://localhost:3001',
  connections: 10,
  pipelining: 1,
  duration: 60,
  headers: {
    'Content-Type': 'application/json'
  }
};

const ENDPOINTS = [
  {
    name: 'Health Check',
    path: '/health',
    method: 'GET'
  },
  {
    name: 'Authentication',
    path: '/api/auth/login',
    method: 'POST',
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'TestPassword123!'
    })
  },
  {
    name: 'User Profile',
    path: '/api/auth/profile',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer test-token'
    }
  }
];

async function runBenchmark(endpoint) {
  console.log(`\n🚀 Running benchmark for: ${endpoint.name}`);
  console.log('=' .repeat(50));
  
  const config = {
    ...BENCHMARK_CONFIG,
    url: `${BENCHMARK_CONFIG.url}${endpoint.path}`,
    method: endpoint.method,
    body: endpoint.body,
    headers: {
      ...BENCHMARK_CONFIG.headers,
      ...endpoint.headers
    }
  };
  
  try {
    const result = await autocannon(config);
    
    const summary = {
      endpoint: endpoint.name,
      timestamp: new Date().toISOString(),
      duration: result.duration,
      requests: {
        total: result.requests.total,
        average: result.requests.average,
        mean: result.requests.mean,
        stddev: result.requests.stddev,
        min: result.requests.min,
        max: result.requests.max
      },
      latency: {
        average: result.latency.average,
        mean: result.latency.mean,
        stddev: result.latency.stddev,
        min: result.latency.min,
        max: result.latency.max,
        p50: result.latency.p50,
        p90: result.latency.p90,
        p95: result.latency.p95,
        p99: result.latency.p99
      },
      throughput: {
        average: result.throughput.average,
        mean: result.throughput.mean,
        stddev: result.throughput.stddev,
        min: result.throughput.min,
        max: result.throughput.max
      },
      errors: result.errors,
      timeouts: result.timeouts
    };
    
    console.log(`✅ Requests/sec: ${result.requests.average}`);
    console.log(`⚡ Latency (avg): ${result.latency.average}ms`);
    console.log(`📊 Throughput: ${result.throughput.average} bytes/sec`);
    console.log(`❌ Errors: ${result.errors}`);
    
    return summary;
  } catch (error) {
    console.error(`❌ Benchmark failed for ${endpoint.name}:`, error.message);
    return null;
  }
}

async function runAllBenchmarks() {
  console.log('🎯 Starting Performance Benchmarks');
  console.log('=' .repeat(50));
  
  const results = [];
  
  for (const endpoint of ENDPOINTS) {
    const result = await runBenchmark(endpoint);
    if (result) {
      results.push(result);
    }
    
    // Wait between benchmarks
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Save results
  const resultsDir = path.join(__dirname, '../results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = path.join(resultsDir, `benchmark-${timestamp}.json`);
  
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  
  console.log(`\n📊 Benchmark results saved to: ${resultsFile}`);
  console.log('\n📈 Summary:');
  console.log('=' .repeat(50));
  
  results.forEach(result => {
    console.log(`${result.endpoint}:`);
    console.log(`  - Requests/sec: ${result.requests.average}`);
    console.log(`  - Avg Latency: ${result.latency.average}ms`);
    console.log(`  - P95 Latency: ${result.latency.p95}ms`);
    console.log(`  - Errors: ${result.errors}`);
    console.log('');
  });
}

if (require.main === module) {
  runAllBenchmarks().catch(console.error);
}

module.exports = { runBenchmark, runAllBenchmarks };