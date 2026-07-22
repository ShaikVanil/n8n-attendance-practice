#!/bin/bash

# Setup monitoring infrastructure
echo "🔧 Setting up production monitoring..."

# Create monitoring database schema
echo "📊 Creating monitoring database schema..."
psql $DATABASE_URL -f backend/src/database/monitoring-schema.sql

# Install monitoring dependencies
echo "📦 Installing monitoring dependencies..."
cd backend && npm install

# Setup log directories
echo "📁 Creating log directories..."
mkdir -p logs/application
mkdir -p logs/security
mkdir -p logs/performance
mkdir -p logs/errors

# Setup monitoring configuration
echo "⚙️ Setting up monitoring configuration..."
cp .env.production.example .env.monitoring

# Add monitoring-specific environment variables
cat >> .env.monitoring << EOF

# Monitoring Configuration
MONITORING_ENABLED=true
METRICS_RETENTION_DAYS=7
ERROR_BUFFER_SIZE=100
ERROR_FLUSH_INTERVAL=10000
ALERT_WEBHOOK_URL=
SLACK_WEBHOOK_URL=
DISCORD_WEBHOOK_URL=

# Prometheus Configuration
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090

# Grafana Configuration
GRAFANA_ENABLED=true
GRAFANA_PORT=3000
GRAFANA_ADMIN_PASSWORD=

EOF

echo "✅ Monitoring setup completed!"
echo "📋 Next steps:"
echo "   1. Configure alert webhooks in .env.monitoring"
echo "   2. Set up Grafana dashboards"
echo "   3. Configure Prometheus scraping"
echo "   4. Test monitoring endpoints"