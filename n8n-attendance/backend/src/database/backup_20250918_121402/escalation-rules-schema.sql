-- Escalation Rules Schema
-- This schema supports US-012: Policy Enforcement with escalation rules for repeated violations

-- Escalation rules table for defining escalation policies
CREATE TABLE IF NOT EXISTS escalation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_template_id UUID NOT NULL REFERENCES policy_templates(id) ON DELETE CASCADE,
    violation_type VARCHAR(50) NOT NULL,
    occurrence_threshold INTEGER NOT NULL CHECK (occurrence_threshold > 0),
    time_window_days INTEGER NOT NULL CHECK (time_window_days > 0),
    escalation_level INTEGER NOT NULL CHECK (escalation_level > 0),
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('warning', 'notification', 'manager_alert', 'hr_alert', 'disciplinary')),
    action_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(policy_template_id, violation_type, escalation_level)
);

-- Escalation actions table to track executed escalations
CREATE TABLE IF NOT EXISTS escalation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    violation_id UUID NOT NULL REFERENCES policy_violations(id) ON DELETE CASCADE,
    escalation_rule_id UUID NOT NULL REFERENCES escalation_rules(id),
    escalation_level INTEGER NOT NULL,
    action_type VARCHAR(20) NOT NULL,
    action_details JSONB NOT NULL DEFAULT '{}',
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    executed_at TIMESTAMP WITH TIME ZONE,
    executed_by UUID REFERENCES users(id),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Disciplinary actions table for formal disciplinary processes
CREATE TABLE IF NOT EXISTS disciplinary_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    escalation_action_id UUID REFERENCES escalation_actions(id),
    violation_type VARCHAR(50) NOT NULL,
    escalation_level INTEGER NOT NULL,
    action_type VARCHAR(30) NOT NULL CHECK (action_type IN ('verbal_warning', 'written_warning', 'final_warning', 'suspension', 'termination')),
    description TEXT NOT NULL,
    initiated_by UUID NOT NULL REFERENCES users(id),
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'appealed', 'overturned')),
    effective_date DATE,
    expiry_date DATE,
    appeal_deadline DATE,
    appeal_submitted_at TIMESTAMP WITH TIME ZONE,
    appeal_reason TEXT,
    appeal_status VARCHAR(20) CHECK (appeal_status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Escalation notifications table to track notification history
CREATE TABLE IF NOT EXISTS escalation_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escalation_action_id UUID NOT NULL REFERENCES escalation_actions(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id),
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('employee', 'manager', 'hr', 'admin')),
    notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('email', 'sms', 'realtime', 'system')),
    subject VARCHAR(255),
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_escalation_rules_policy_template ON escalation_rules(policy_template_id);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_violation_type ON escalation_rules(violation_type);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_active ON escalation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_level ON escalation_rules(escalation_level);

CREATE INDEX IF NOT EXISTS idx_escalation_actions_user ON escalation_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_escalation_actions_violation ON escalation_actions(violation_id);
CREATE INDEX IF NOT EXISTS idx_escalation_actions_rule ON escalation_actions(escalation_rule_id);
CREATE INDEX IF NOT EXISTS idx_escalation_actions_status ON escalation_actions(status);
CREATE INDEX IF NOT EXISTS idx_escalation_actions_triggered ON escalation_actions(triggered_at);

CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_employee ON disciplinary_actions(employee_id);
CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_escalation ON disciplinary_actions(escalation_action_id);
CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_status ON disciplinary_actions(status);
CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_type ON disciplinary_actions(action_type);

CREATE INDEX IF NOT EXISTS idx_escalation_notifications_action ON escalation_notifications(escalation_action_id);
CREATE INDEX IF NOT EXISTS idx_escalation_notifications_recipient ON escalation_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_escalation_notifications_status ON escalation_notifications(status);

-- Update timestamp triggers
DROP TRIGGER IF EXISTS update_escalation_rules_updated_at ON escalation_rules;
CREATE TRIGGER update_escalation_rules_updated_at 
    BEFORE UPDATE ON escalation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_escalation_actions_updated_at ON escalation_actions;
CREATE TRIGGER update_escalation_actions_updated_at 
    BEFORE UPDATE ON escalation_actions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_disciplinary_actions_updated_at ON disciplinary_actions;
CREATE TRIGGER update_disciplinary_actions_updated_at 
    BEFORE UPDATE ON disciplinary_actions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default escalation rules for standard policy templates
INSERT INTO escalation_rules (policy_template_id, violation_type, occurrence_threshold, time_window_days, escalation_level, action_type, action_config, created_by)
SELECT 
    pt.id,
    'late_checkin',
    3,
    7,
    1,
    'warning',
    '{"message": "You have been late for check-in 3 times in the past week. Please ensure punctual attendance.", "severity": "low"}',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
FROM policy_templates pt
WHERE pt.name = 'Standard Full-Time Policy'
ON CONFLICT (policy_template_id, violation_type, escalation_level) DO NOTHING;

INSERT INTO escalation_rules (policy_template_id, violation_type, occurrence_threshold, time_window_days, escalation_level, action_type, action_config, created_by)
SELECT 
    pt.id,
    'late_checkin',
    5,
    7,
    2,
    'manager_alert',
    '{"message": "Employee has been late for check-in 5 times in the past week. Manager intervention required.", "severity": "medium", "requires_response": true}',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
FROM policy_templates pt
WHERE pt.name = 'Standard Full-Time Policy'
ON CONFLICT (policy_template_id, violation_type, escalation_level) DO NOTHING;

INSERT INTO escalation_rules (policy_template_id, violation_type, occurrence_threshold, time_window_days, escalation_level, action_type, action_config, created_by)
SELECT 
    pt.id,
    'late_checkin',
    8,
    14,
    3,
    'hr_alert',
    '{"message": "Employee has persistent attendance issues. HR review required.", "severity": "high", "requires_action": true, "suggested_actions": ["formal_warning", "attendance_improvement_plan"]}',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
FROM policy_templates pt
WHERE pt.name = 'Standard Full-Time Policy'
ON CONFLICT (policy_template_id, violation_type, escalation_level) DO NOTHING;

INSERT INTO escalation_rules (policy_template_id, violation_type, occurrence_threshold, time_window_days, escalation_level, action_type, action_config, created_by)
SELECT 
    pt.id,
    'late_checkin',
    12,
    30,
    4,
    'disciplinary',
    '{"action_type": "written_warning", "message": "Formal disciplinary action for chronic attendance issues.", "severity": "high", "improvement_period_days": 30}',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
FROM policy_templates pt
WHERE pt.name = 'Standard Full-Time Policy'
ON CONFLICT (policy_template_id, violation_type, escalation_level) DO NOTHING;

-- Similar escalation rules for other violation types
INSERT INTO escalation_rules (policy_template_id, violation_type, occurrence_threshold, time_window_days, escalation_level, action_type, action_config, created_by)
SELECT 
    pt.id,
    'early_checkout',
    3,
    7,
    1,
    'warning',
    '{"message": "You have checked out early 3 times this week. Please complete your full working hours.", "severity": "low"}',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
FROM policy_templates pt
WHERE pt.name = 'Standard Full-Time Policy'
ON CONFLICT (policy_template_id, violation_type, escalation_level) DO NOTHING;

INSERT INTO escalation_rules (policy_template_id, violation_type, occurrence_threshold, time_window_days, escalation_level, action_type, action_config, created_by)
SELECT 
    pt.id,
    'break_violation',
    2,
    7,
    1,
    'notification',
    '{"message": "Please adhere to break policies. Extended or excessive breaks affect productivity.", "severity": "medium"}',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
FROM policy_templates pt
WHERE pt.name = 'Standard Full-Time Policy'
ON CONFLICT (policy_template_id, violation_type, escalation_level) DO NOTHING;

INSERT INTO escalation_rules (policy_template_id, violation_type, occurrence_threshold, time_window_days, escalation_level, action_type, action_config, created_by)
SELECT 
    pt.id,
    'overtime_violation',
    2,
    14,
    1,
    'manager_alert',
    '{"message": "Employee has unapproved overtime. Manager review required.", "severity": "medium", "requires_approval": true}',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
FROM policy_templates pt
WHERE pt.name = 'Standard Full-Time Policy'
ON CONFLICT (policy_template_id, violation_type, escalation_level) DO NOTHING;