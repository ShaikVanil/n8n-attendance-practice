-- Violation detection rules table
CREATE TABLE IF NOT EXISTS violation_detection_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    conditions JSONB NOT NULL DEFAULT '[]',
    actions JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Violation detection history
CREATE TABLE IF NOT EXISTS violation_detection_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES violation_detection_rules(id),
    audit_entry_id UUID NOT NULL,
    violation_id UUID REFERENCES compliance_violations(id),
    detection_result JSONB,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_violation_detection_rules_category ON violation_detection_rules(category);
CREATE INDEX IF NOT EXISTS idx_violation_detection_rules_active ON violation_detection_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_violation_detection_history_rule ON violation_detection_history(rule_id);
CREATE INDEX IF NOT EXISTS idx_violation_detection_history_created ON violation_detection_history(created_at);