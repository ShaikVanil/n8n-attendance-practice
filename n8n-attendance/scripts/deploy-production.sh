#!/bin/bash

# Production Deployment Script
# This script handles zero-downtime deployment to production

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_USER="${PRODUCTION_USER:-deploy}"
DEPLOY_HOST="${PRODUCTION_HOST:-production.yourdomain.com}"
APP_NAME="attendance-app"
DEPLOY_PATH="/opt/${APP_NAME}"
BACKUP_PATH="/opt/backups/${APP_NAME}"
LOG_FILE="/var/log/${APP_NAME}/deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗${NC} $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log_error "$1"
    exit 1
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    # Add cleanup commands here
}

# Set trap for cleanup
trap cleanup EXIT

# Validate environment
validate_environment() {
    log "Validating deployment environment..."
    
    # Check required environment variables
    local required_vars=("PRODUCTION_HOST" "PRODUCTION_USER" "BACKEND_IMAGE" "FRONTEND_IMAGE")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error_exit "Required environment variable $var is not set"
        fi
    done
    
    # Check SSH connectivity
    if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$DEPLOY_USER@$DEPLOY_HOST" 'exit 0' 2>/dev/null; then
        error_exit "Cannot connect to production server via SSH"
    fi
    
    log_success "Environment validation passed"
}

# Create database backup
create_backup() {
    log "Creating database backup..."
    
    local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
    
    ssh "$DEPLOY_USER@$DEPLOY_HOST" << EOF
        set -e
        mkdir -p "$BACKUP_PATH"
        cd "$DEPLOY_PATH"
        
        # Create database backup
        docker-compose exec -T postgres pg_dump -U \$POSTGRES_USER \$POSTGRES_DB > "$BACKUP_PATH/${backup_name}.sql"
        
        # Create application backup
        tar -czf "$BACKUP_PATH/${backup_name}_app.tar.gz" -C "$DEPLOY_PATH" .
        
        # Keep only last 5 backups
        cd "$BACKUP_PATH"
        ls -t *.sql | tail -n +6 | xargs -r rm
        ls -t *_app.tar.gz | tail -n +6 | xargs -r rm
        
        echo "Backup created: ${backup_name}"
EOF
    
    log_success "Database backup completed"
}

# Deploy application
deploy_application() {
    log "Deploying application..."
    
    # Copy deployment files
    scp -r "$PROJECT_ROOT/docker-compose.production.yml" "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/docker-compose.yml"
    scp -r "$PROJECT_ROOT/backend/.env.production" "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/backend/.env"
    scp -r "$PROJECT_ROOT/scripts/health-check.sh" "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/"
    
    # Deploy with zero downtime
    ssh "$DEPLOY_USER@$DEPLOY_HOST" << EOF
        set -e
        cd "$DEPLOY_PATH"
        
        # Set image versions
        export BACKEND_IMAGE="$BACKEND_IMAGE"
        export FRONTEND_IMAGE="$FRONTEND_IMAGE"
        
        # Pull new images
        docker-compose pull
        
        # Run database migrations
        docker-compose run --rm backend npm run db:migrate
        
        # Rolling update with health checks
        docker-compose up -d --no-deps backend
        
        # Wait for backend to be healthy
        timeout 60 bash -c 'until docker-compose exec backend curl -f http://localhost:3001/health; do sleep 2; done'
        
        # Update frontend
        docker-compose up -d --no-deps frontend
        
        # Wait for frontend to be healthy
        timeout 60 bash -c 'until docker-compose exec frontend curl -f http://localhost:80/health; do sleep 2; done'
        
        # Clean up old images
        docker image prune -f
        
        echo "Deployment completed successfully"
EOF
    
    log_success "Application deployment completed"
}

# Run health checks
run_health_checks() {
    log "Running post-deployment health checks..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if ssh "$DEPLOY_USER@$DEPLOY_HOST" "cd $DEPLOY_PATH && ./health-check.sh"; then
            log_success "Health checks passed"
            return 0
        fi
        
        log_warning "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 10
        ((attempt++))
    done
    
    error_exit "Health checks failed after $max_attempts attempts"
}

# Rollback function
rollback() {
    log_error "Deployment failed, initiating rollback..."
    
    ssh "$DEPLOY_USER@$DEPLOY_HOST" << EOF
        set -e
        cd "$DEPLOY_PATH"
        
        # Get the latest backup
        latest_backup=\$(ls -t "$BACKUP_PATH"/*_app.tar.gz | head -n1)
        
        if [[ -n "\$latest_backup" ]]; then
            echo "Rolling back to: \$latest_backup"
            
            # Stop current services
            docker-compose down
            
            # Restore from backup
            tar -xzf "\$latest_backup" -C "$DEPLOY_PATH"
            
            # Start services
            docker-compose up -d
            
            echo "Rollback completed"
        else
            echo "No backup found for rollback"
            exit 1
        fi
EOF
    
    log_success "Rollback completed"
}

# Send deployment notification
send_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK_URL" || true
    fi
    
    if [[ -n "${DISCORD_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"content\":\"$message\"}" \
            "$DISCORD_WEBHOOK_URL" || true
    fi
}

# Main deployment function
main() {
    log "Starting production deployment..."
    
    # Validate environment
    validate_environment
    
    # Create backup
    create_backup
    
    # Deploy application
    if deploy_application; then
        # Run health checks
        if run_health_checks; then
            log_success "Production deployment completed successfully! 🚀"
            send_notification "success" "✅ Production deployment successful! Version: ${BACKEND_IMAGE##*:}"
        else
            rollback
            send_notification "failure" "❌ Production deployment failed during health checks. Rollback completed."
            exit 1
        fi
    else
        rollback
        send_notification "failure" "❌ Production deployment failed. Rollback completed."
        exit 1
    fi
}

# Run main function
main "$@"