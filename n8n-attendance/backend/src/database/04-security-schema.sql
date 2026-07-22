-- Security logs table
CREATE TABLE IF NOT EXISTS security_logs (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    user_id UUID REFERENCES users(id),  -- Changed from INTEGER to UUID
    path VARCHAR(500),
    method VARCHAR(10),
    status_code INTEGER,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Failed login attempts tracking
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id SERIAL PRIMARY KEY,
    ip_address INET NOT NULL,
    email VARCHAR(255),
    attempts INTEGER DEFAULT 1,
    last_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blocked IPs table
CREATE TABLE IF NOT EXISTS blocked_ips (
    id SERIAL PRIMARY KEY,
    ip_address INET UNIQUE NOT NULL,
    blocked_until TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Active sessions table
CREATE TABLE IF NOT EXISTS active_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(64) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),  -- Changed from INTEGER to UUID
    ip_address INET NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security configuration table
CREATE TABLE IF NOT EXISTS security_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_ip_address ON security_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_ip ON failed_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_email ON failed_login_attempts(email);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip_address ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_blocked_until ON blocked_ips(blocked_until);

CREATE INDEX IF NOT EXISTS idx_active_sessions_session_id ON active_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_expires_at ON active_sessions(expires_at);

-- Functions for cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM active_sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_security_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM security_logs WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_expired_blocks()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM blocked_ips WHERE blocked_until < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get current user ID for RLS policies
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
    -- Get user ID from current session context
    -- This assumes the application sets the user ID in the session
    RETURN COALESCE(
        current_setting('app.current_user_id', true)::UUID,
        '00000000-0000-0000-0000-000000000000'::UUID
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Return null UUID if no user context is set
        RETURN '00000000-0000-0000-0000-000000000000'::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user role for RLS policies
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
BEGIN
    -- Get user role from current session context
    -- This assumes the application sets the user role in the session
    RETURN COALESCE(
        current_setting('app.current_user_role', true),
        'employee'
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Return default role if no user context is set
        RETURN 'employee';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default security configuration
INSERT INTO security_config (config_key, config_value, description) VALUES
('max_login_attempts', '5', 'Maximum failed login attempts before IP block'),
('block_duration_minutes', '15', 'Duration to block IP after max failed attempts'),
('session_timeout_hours', '24', 'Session timeout in hours'),
('rate_limit_requests_per_window', '100', 'API rate limit requests per window'),
('rate_limit_window_minutes', '15', 'API rate limit window in minutes'),
('security_log_retention_days', '90', 'Days to retain security logs')
ON CONFLICT (config_key) DO NOTHING;