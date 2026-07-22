#!/bin/bash

# Staging Deployment Script

set -euo pipefail

# Configuration
STAGING_USER="${STAGING_USER:-deploy}"
STAGING_HOST="${STAGING_HOST:-staging.yourdomain.com}"
APP_NAME="attendance-app"
DEPLOY_PATH="/opt/${APP_NAME}-staging"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting staging deployment..."

# Deploy to staging
ssh "$STAGING_USER@$STAGING_HOST" << EOF
    set -e
    cd "$DEPLOY_PATH"
    
    # Set image versions
    export BACKEND_IMAGE="$BACKEND_IMAGE"
    export FRONTEND_IMAGE="$FRONTEND_IMAGE"
    
    # Pull and deploy
    docker-compose -f docker-compose.staging.yml pull
    docker-compose -f docker-compose.staging.yml up -d
    
    # Run migrations
    docker-compose -f docker-compose.staging.yml exec -T backend npm run db:migrate
    
    # Wait for services to be ready
    sleep 30
    
    echo "Staging deployment completed"
EOF

log "Staging deployment completed successfully!"