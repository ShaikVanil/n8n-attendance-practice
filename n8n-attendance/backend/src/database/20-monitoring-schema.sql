-- Create app_user role if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user;
    END IF;
END
$$;

-- Error Logs Table
CREATE TABLE IF NOT EXISTS error_logs (
    id VARCHAR(255) PRIMARY KEY,
    message TEXT NOT NULL,
    stack TEXT,
    level VARCHAR(20) NOT NULL DEFAULT 'error',
    context JSONB,
    user_id VARCHAR(255),
    session_id VARCHAR(255),
    user_agent TEXT,
    ip INET,
    url TEXT,
    method VARCHAR(10),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fingerprint VARCHAR(255),
    tags JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for error logs
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_fingerprint ON error_logs(fingerprint);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);

-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(15,6) NOT NULL,
    metric_type VARCHAR(20) NOT NULL, -- counter, gauge, histogram, timer
    tags JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);

-- System Health Table
CREATE TABLE IF NOT EXISTS system_health (
    id SERIAL PRIMARY KEY,
    component VARCHAR(100) NOT NULL, -- database, api, cache, etc.
    status VARCHAR(20) NOT NULL, -- healthy, degraded, down
    response_time INTEGER, -- in milliseconds
    error_message TEXT,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for system health
CREATE INDEX IF NOT EXISTS idx_system_health_component ON system_health(component);
CREATE INDEX IF NOT EXISTS idx_system_health_status ON system_health(status);
CREATE INDEX IF NOT EXISTS idx_system_health_timestamp ON system_health(timestamp DESC);

-- Alert History Table
CREATE TABLE IF NOT EXISTS alert_history (
    id SERIAL PRIMARY KEY,
    alert_id VARCHAR(255) NOT NULL,
    alert_name VARCHAR(255) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL, -- triggered, resolved
    metric_name VARCHAR(255),
    metric_value DECIMAL(15,6),
    threshold_value DECIMAL(15,6),
    message TEXT,
    metadata JSONB,
    triggered_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for alert history
CREATE INDEX IF NOT EXISTS idx_alert_history_alert_id ON alert_history(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_severity ON alert_history(severity);
CREATE INDEX IF NOT EXISTS idx_alert_history_status ON alert_history(status);
CREATE INDEX IF NOT EXISTS idx_alert_history_triggered_at ON alert_history(triggered_at DESC);

-- Business Metrics Table
CREATE TABLE IF NOT EXISTS business_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(15,6) NOT NULL,
    dimensions JSONB, -- user_id, department, etc.
    aggregation_period VARCHAR(20), -- hourly, daily, weekly, monthly
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for business metrics
CREATE INDEX IF NOT EXISTS idx_business_metrics_name ON business_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_business_metrics_period ON business_metrics(aggregation_period, period_start);
CREATE INDEX IF NOT EXISTS idx_business_metrics_timestamp ON business_metrics(timestamp DESC);

-- Cleanup Functions
CREATE OR REPLACE FUNCTION cleanup_old_monitoring_data()
RETURNS void AS $$
BEGIN
    -- Clean up error logs older than 90 days
    DELETE FROM error_logs 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
    
    -- Clean up performance metrics older than 30 days
    DELETE FROM performance_metrics 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    -- Clean up system health records older than 7 days
    DELETE FROM system_health 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '7 days';
    
    -- Clean up resolved alerts older than 30 days
    DELETE FROM alert_history 
    WHERE status = 'resolved' 
    AND resolved_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    -- Clean up business metrics older than 1 year
    DELETE FROM business_metrics 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 year';
    
    RAISE NOTICE 'Monitoring data cleanup completed';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run daily
-- Note: This requires pg_cron extension or external scheduler
-- SELECT cron.schedule('cleanup-monitoring-data', '0 2 * * *', 'SELECT cleanup_old_monitoring_data();');

-- Views for common queries
CREATE OR REPLACE VIEW error_summary AS
SELECT 
    fingerprint,
    message,
    level,
    COUNT(*) as error_count,
    MIN(timestamp) as first_seen,
    MAX(timestamp) as last_seen,
    COUNT(DISTINCT user_id) as affected_users
FROM error_logs 
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY fingerprint, message, level
ORDER BY error_count DESC;

CREATE OR REPLACE VIEW system_health_summary AS
SELECT 
    component,
    status,
    AVG(response_time) as avg_response_time,
    COUNT(*) as check_count,
    MAX(timestamp) as last_check
FROM system_health 
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
GROUP BY component, status
ORDER BY component, status;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON error_logs TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON performance_metrics TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON system_health TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON alert_history TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON business_metrics TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;