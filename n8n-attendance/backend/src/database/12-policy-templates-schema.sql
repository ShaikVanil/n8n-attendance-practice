-- Policy Templates Schema
-- This schema supports US-011: Policy Template Creation

-- Policy templates table
CREATE TABLE IF NOT EXISTS policy_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    employee_type VARCHAR(50) NOT NULL CHECK (employee_type IN ('full_time', 'part_time', 'contractor', 'intern', 'custom')),
    rules JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, version)
);

-- Policy rules table for structured rule storage
CREATE TABLE IF NOT EXISTS policy_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_template_id UUID NOT NULL REFERENCES policy_templates(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('grace_period', 'overtime', 'break_time', 'working_hours', 'location_specific')),
    rule_name VARCHAR(100) NOT NULL,
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Policy assignments table to link users with policy templates
CREATE TABLE IF NOT EXISTS policy_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    policy_template_id UUID NOT NULL REFERENCES policy_templates(id) ON DELETE CASCADE,
    office_id UUID REFERENCES office_locations(id) ON DELETE SET NULL,
    assigned_by UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, policy_template_id, effective_from)
);

-- Policy template versions table for version control
CREATE TABLE IF NOT EXISTS policy_template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_template_id UUID NOT NULL REFERENCES policy_templates(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL,
    changes_summary TEXT,
    rules_snapshot JSONB NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Policy violations table to track policy enforcement
CREATE TABLE IF NOT EXISTS policy_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    policy_template_id UUID NOT NULL REFERENCES policy_templates(id),
    policy_rule_id UUID NOT NULL REFERENCES policy_rules(id),
    attendance_id UUID REFERENCES attendance(id) ON DELETE SET NULL,
    violation_type VARCHAR(50) NOT NULL,
    violation_details JSONB NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved', 'dismissed')),
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_policy_templates_name ON policy_templates(name);
CREATE INDEX IF NOT EXISTS idx_policy_templates_employee_type ON policy_templates(employee_type);
CREATE INDEX IF NOT EXISTS idx_policy_templates_is_active ON policy_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_policy_templates_created_by ON policy_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_policy_rules_template_id ON policy_rules(policy_template_id);
CREATE INDEX IF NOT EXISTS idx_policy_rules_type ON policy_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_policy_rules_priority ON policy_rules(priority);

CREATE INDEX IF NOT EXISTS idx_policy_assignments_user_id ON policy_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_policy_assignments_template_id ON policy_assignments(policy_template_id);
CREATE INDEX IF NOT EXISTS idx_policy_assignments_effective_dates ON policy_assignments(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_policy_assignments_is_active ON policy_assignments(is_active);

CREATE INDEX IF NOT EXISTS idx_policy_violations_user_id ON policy_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_policy_violations_template_id ON policy_violations(policy_template_id);
CREATE INDEX IF NOT EXISTS idx_policy_violations_status ON policy_violations(status);
CREATE INDEX IF NOT EXISTS idx_policy_violations_severity ON policy_violations(severity);
CREATE INDEX IF NOT EXISTS idx_policy_violations_created_at ON policy_violations(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
DROP TRIGGER IF EXISTS update_policy_templates_updated_at ON policy_templates;
CREATE TRIGGER update_policy_templates_updated_at 
    BEFORE UPDATE ON policy_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_policy_rules_updated_at ON policy_rules;
CREATE TRIGGER update_policy_rules_updated_at 
    BEFORE UPDATE ON policy_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_policy_violations_updated_at ON policy_violations;
CREATE TRIGGER update_policy_violations_updated_at 
    BEFORE UPDATE ON policy_violations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create policy template version on update
CREATE OR REPLACE FUNCTION create_policy_template_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create version if rules have changed
    IF OLD.rules IS DISTINCT FROM NEW.rules THEN
        INSERT INTO policy_template_versions (
            policy_template_id,
            version,
            changes_summary,
            rules_snapshot,
            created_by
        ) VALUES (
            NEW.id,
            NEW.version,
            'Automated version created on policy update',
            OLD.rules,
            NEW.created_by
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for automatic versioning
DROP TRIGGER IF EXISTS create_policy_template_version_trigger ON policy_templates;
CREATE TRIGGER create_policy_template_version_trigger
    AFTER UPDATE ON policy_templates
    FOR EACH ROW EXECUTE FUNCTION create_policy_template_version();

-- Insert default policy templates
-- First, ensure we have a system user for created_by
DO $$
DECLARE
    system_user_id UUID;
BEGIN
    -- Create or get system user for default templates
    INSERT INTO users (id, email, first_name, last_name, password_hash, role, is_active)
    VALUES (
        '00000000-0000-0000-0000-000000000001',
        'system@company.com',
        'System',
        'User',
        '$2b$10$dummy.hash.for.system.user',
        'admin',
        false
    )
    ON CONFLICT (email) DO NOTHING;
    
    system_user_id := '00000000-0000-0000-0000-000000000001';
    
    -- Insert default policy templates within the same block
    INSERT INTO policy_templates (name, description, employee_type, rules, is_default, created_by)
    SELECT 
        'Standard Full-Time Policy',
        'Default policy template for full-time employees with standard working hours',
        'full_time',
        '{
            "working_hours": {
                "start_time": "09:00",
                "end_time": "17:00",
                "total_hours_per_day": 8,
                "days_per_week": 5
            },
            "grace_periods": {
                "check_in_grace_minutes": 15,
                "check_out_grace_minutes": 15,
                "break_grace_minutes": 5
            },
            "overtime": {
                "threshold_hours": 8,
                "max_daily_hours": 12,
                "requires_approval": true
            },
            "breaks": {
                "lunch_break": {
                    "duration_minutes": 60,
                    "is_mandatory": true,
                    "max_per_day": 1
                },
                "short_break": {
                    "duration_minutes": 15,
                    "is_mandatory": false,
                    "max_per_day": 2
                }
            }
        }'::jsonb,
        true,
        system_user_id
    WHERE NOT EXISTS (SELECT 1 FROM policy_templates WHERE name = 'Standard Full-Time Policy');

    INSERT INTO policy_templates (name, description, employee_type, rules, is_default, created_by)
    SELECT 
        'Part-Time Policy',
        'Default policy template for part-time employees with flexible working hours',
        'part_time',
        '{
            "working_hours": {
                "start_time": "09:00",
                "end_time": "13:00",
                "total_hours_per_day": 4,
                "days_per_week": 5
            },
            "grace_periods": {
                "check_in_grace_minutes": 10,
                "check_out_grace_minutes": 10,
                "break_grace_minutes": 5
            },
            "overtime": {
                "threshold_hours": 4,
                "max_daily_hours": 8,
                "requires_approval": true
            },
            "breaks": {
                "lunch_break": {
                    "duration_minutes": 30,
                    "is_mandatory": false,
                    "max_per_day": 1
                },
                "short_break": {
                    "duration_minutes": 15,
                    "is_mandatory": false,
                    "max_per_day": 1
                }
            }
        }'::jsonb,
        true,
        system_user_id
    WHERE NOT EXISTS (SELECT 1 FROM policy_templates WHERE name = 'Part-Time Policy');

    INSERT INTO policy_templates (name, description, employee_type, rules, is_default, created_by)
    SELECT 
        'Contractor Policy',
        'Default policy template for contractors with flexible working arrangements',
        'contractor',
        '{
            "working_hours": {
                "flexible": true,
                "min_hours_per_day": 2,
                "max_hours_per_day": 10,
                "days_per_week": 7
            },
            "grace_periods": {
                "check_in_grace_minutes": 30,
                "check_out_grace_minutes": 30,
                "break_grace_minutes": 10
            },
            "overtime": {
                "threshold_hours": 8,
                "max_daily_hours": 12,
                "requires_approval": false
            },
            "breaks": {
                "lunch_break": {
                    "duration_minutes": 30,
                    "is_mandatory": false,
                    "max_per_day": 1
                },
                "short_break": {
                    "duration_minutes": 15,
                    "is_mandatory": false,
                    "max_per_day": 3
                }
            }
        }'::jsonb,
        true,
        system_user_id
    WHERE NOT EXISTS (SELECT 1 FROM policy_templates WHERE name = 'Contractor Policy');
END $$;