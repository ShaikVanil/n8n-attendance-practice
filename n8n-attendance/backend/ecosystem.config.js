module.exports = {
  apps: [{
    name: 'n8n-attendance-api',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001,
      NODE_OPTIONS: '--max-old-space-size=4096'
    },
    // Performance optimizations
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=4096',
    
    // Logging
    log_file: 'logs/combined.log',
    out_file: 'logs/out.log',
    error_file: 'logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Auto-restart configuration
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Health monitoring
    health_check_grace_period: 3000,
    health_check_fatal_exceptions: true
  }]
};