#!/bin/bash

# Health Check Script

set -euo pipefail

BASE_URL="${1:-http://localhost}"
MAX_RETRIES=5
RETRY_DELAY=5

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

check_endpoint() {
    local endpoint="$1"
    local expected_status="${2:-200}"
    local retries=0
    
    while [[ $retries -lt $MAX_RETRIES ]]; do
        log "Checking $endpoint (attempt $((retries + 1))/$MAX_RETRIES)..."
        
        if response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL$endpoint"); then
            if [[ "$response" == "$expected_status" ]]; then
                log "✓ $endpoint is healthy (HTTP $response)"
                return 0
            else
                log "✗ $endpoint returned HTTP $response, expected $expected_status"
            fi
        else
            log "✗ Failed to connect to $endpoint"
        fi
        
        ((retries++))
        if [[ $retries -lt $MAX_RETRIES ]]; then
            log "Retrying in $RETRY_DELAY seconds..."
            sleep $RETRY_DELAY
        fi
    done
    
    return 1
}

log "Starting health checks for $BASE_URL..."

# Check backend health
check_endpoint "/api/health" 200

# Check frontend
check_endpoint "/" 200

# Check database connectivity
check_endpoint "/api/health/db" 200

# Check authentication endpoint
check_endpoint "/api/auth/health" 200

log "All health checks passed! ✅"