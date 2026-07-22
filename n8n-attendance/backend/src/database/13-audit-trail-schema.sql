-- Comprehensive Audit Trail Schema for US-015: Compliance Dashboard
-- This schema tracks all system changes and activities for regulatory compliance

-- Main audit trail table for tracking all system activities
CREATE TABLE IF NOT EXISTS audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'user', 'attendance', 'device', 'leave_request', 'policy', etc.
    entity_id UUID NOT NULL, -- ID of the affected entity
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'approve', 'reject', 'login', 'logout'
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Who performed the action
    performed_by_role VARCHAR(20), -- Role at time of action
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET, -- IP address of the user
    user_agent TEXT, -- Browser/device information
    old_values JSONB, -- Previous state of the entity
    new_values JSONB, -- New state of the entity
    changes_summary TEXT, -- Human-readable summary of changes
    reason TEXT, -- Reason for the change (if provided)
    session_id VARCHAR(255), -- Session identifier
    request_id VARCHAR(255), -- Request tracking ID
    compliance_category VARCHAR(50), -- 'attendance', 'leave', 'security', 'data_access'
    risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    metadata JSONB DEFAULT '{}', -- Additional context data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- System access logs for security compliance
CREATE TABLE IF NOT EXISTS access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    access_type VARCHAR(30) NOT NULL, -- 'login', 'logout', 'failed_login', 'password_reset', 'mfa_challenge'
    ip_address INET NOT NULL,
    user_agent TEXT,
    location_info JSONB, -- Geolocation data if available
    success BOOLEAN NOT NULL,
    failure_reason TEXT, -- Reason for failed access attempts
    session_duration INTEGER, -- Duration in seconds (for logout events)
    mfa_used BOOLEAN DEFAULT false,
    device_fingerprint TEXT, -- Device identification
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Data access logs for privacy compliance
CREATE TABLE IF NOT EXISTS data_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    accessed_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Whose data was accessed
    data_type VARCHAR(50) NOT NULL, -- 'attendance', 'personal_info', 'leave_records', 'reports'
    access_method VARCHAR(30) NOT NULL, -- 'view', 'export', 'download', 'print', 'api_call'
    data_scope TEXT, -- Description of what data was accessed
    justification TEXT, -- Business justification for access
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Compliance violations tracking
CREATE TABLE IF NOT EXISTS compliance_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    violation_type VARCHAR(50) NOT NULL, -- 'data_retention', 'unauthorized_access', 'policy_breach'
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    entity_type VARCHAR(50), -- What entity was involved
    entity_id UUID, -- ID of the affected entity
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- User involved (if applicable)
    description TEXT NOT NULL,
    detection_method VARCHAR(50), -- 'automated', 'manual_review', 'user_report'
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
    impact_assessment TEXT,
    corrective_actions TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Data retention tracking
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_type VARCHAR(50) NOT NULL, -- 'attendance_records', 'audit_logs', 'user_data'
    retention_period_days INTEGER NOT NULL,
    description TEXT,
    legal_basis TEXT, -- Legal requirement for retention
    auto_delete BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Data retention execution log
CREATE TABLE IF NOT EXISTS data_retention_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES data_retention_policies(id) ON DELETE CASCADE,
    execution_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    records_processed INTEGER DEFAULT 0,
    records_deleted INTEGER DEFAULT 0,
    execution_status VARCHAR(20) DEFAULT 'running' CHECK (execution_status IN ('running', 'completed', 'failed', 'cancelled')),
    error_message TEXT,
    execution_duration_seconds INTEGER,
    executed_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for automated executions
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Compliance reports metadata
CREATE TABLE IF NOT EXISTS compliance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(50) NOT NULL, -- 'audit_summary', 'data_access', 'violations', 'retention'
    report_name VARCHAR(255) NOT NULL,
    generated_by UUID NOT NULL REFERENCES users(id),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    period_start DATE,
    period_end DATE,
    filters JSONB DEFAULT '{}', -- Report filters applied
    file_path TEXT, -- Path to generated report file
    file_format VARCHAR(10), -- 'pdf', 'csv', 'xlsx'
    file_size_bytes BIGINT,
    download_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE, -- When report file expires
    status VARCHAR(20) DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'expired', 'error')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Report download tracking
CREATE TABLE IF NOT EXISTS report_downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES compliance_reports(id) ON DELETE CASCADE,
    downloaded_by UUID NOT NULL REFERENCES users(id),
    download_method VARCHAR(20) NOT NULL, -- 'web', 'api', 'email'
    ip_address INET,
    user_agent TEXT,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by ON audit_trail(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_at ON audit_trail(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON audit_trail(action);
CREATE INDEX IF NOT EXISTS idx_audit_trail_compliance_category ON audit_trail(compliance_category);
CREATE INDEX IF NOT EXISTS idx_audit_trail_risk_level ON audit_trail(risk_level);

CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_access_type ON access_logs(access_type);
CREATE INDEX IF NOT EXISTS idx_access_logs_ip_address ON access_logs(ip_address);

CREATE INDEX IF NOT EXISTS idx_data_access_logs_user_id ON data_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_accessed_user_id ON data_access_logs(accessed_user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_timestamp ON data_access_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_data_type ON data_access_logs(data_type);

CREATE INDEX IF NOT EXISTS idx_compliance_violations_status ON compliance_violations(status);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_severity ON compliance_violations(severity);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_detected_at ON compliance_violations(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_user_id ON compliance_violations(user_id);

CREATE INDEX IF NOT EXISTS idx_data_retention_policies_data_type ON data_retention_policies(data_type);
CREATE INDEX IF NOT EXISTS idx_data_retention_policies_active ON data_retention_policies(is_active);

CREATE INDEX IF NOT EXISTS idx_compliance_reports_generated_by ON compliance_reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_generated_at ON compliance_reports(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_status ON compliance_reports(status);

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_compliance_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to automatically log audit trail entries
CREATE OR REPLACE FUNCTION log_audit_trail(
    p_entity_type VARCHAR(50),
    p_entity_id UUID,
    p_action VARCHAR(50),
    p_performed_by UUID,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_compliance_category VARCHAR(50) DEFAULT 'general',
    p_risk_level VARCHAR(20) DEFAULT 'low'
) RETURNS UUID AS $$
DECLARE
    audit_id UUID;
    user_role VARCHAR(20);
BEGIN
    -- Get user role
    SELECT role INTO user_role FROM users WHERE id = p_performed_by;
    
    -- Insert audit trail entry
    INSERT INTO audit_trail (
        entity_type, entity_id, action, performed_by, performed_by_role,
        old_values, new_values, reason, compliance_category, risk_level
    ) VALUES (
        p_entity_type, p_entity_id, p_action, p_performed_by, user_role,
        p_old_values, p_new_values, p_reason, p_compliance_category, p_risk_level
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql;