#!/bin/bash

# Smoke Tests Script

set -euo pipefail

BASE_URL="$1"
TEST_EMAIL="test@example.com"
TEST_PASSWORD="testpassword123"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    log "Running test: $test_name"
    
    if eval "$test_command"; then
        log "✓ $test_name passed"
        return 0
    else
        log "✗ $test_name failed"
        return 1
    fi
}

log "Starting smoke tests for $BASE_URL..."

# Test 1: Basic connectivity
run_test "Basic connectivity" \
    "curl -f -s '$BASE_URL/api/health' > /dev/null"

# Test 2: Frontend loads
run_test "Frontend loads" \
    "curl -f -s '$BASE_URL/' | grep -q 'Attendance'"

# Test 3: API responds
run_test "API responds" \
    "curl -f -s '$BASE_URL/api/health' | grep -q 'status'"

# Test 4: Database connectivity
run_test "Database connectivity" \
    "curl -f -s '$BASE_URL/api/health/db' | grep -q 'healthy'"

# Test 5: Authentication endpoint
run_test "Authentication endpoint" \
    "curl -f -s -X POST '$BASE_URL/api/auth/login' -H 'Content-Type: application/json' -d '{}' | grep -q 'error'"

log "All smoke tests passed! ✅"