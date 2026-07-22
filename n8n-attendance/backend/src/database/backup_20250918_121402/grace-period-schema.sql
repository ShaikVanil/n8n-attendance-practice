-- Grace period configurations table for office-specific settings
CREATE TABLE IF NOT EXISTS grace_period_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID NOT NULL REFERENCES office_locations(id) ON DELETE CASCADE,
    check_in_grace INTEGER NOT NULL DEFAULT 15, -- minutes
    check_out_grace INTEGER NOT NULL DEFAULT 15, -- minutes
    break_grace INTEGER NOT NULL DEFAULT 5, -- minutes
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(office_id)
);

-- Grace period exceptions table for user-specific overrides
CREATE TABLE IF NOT EXISTS grace_period_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    office_id UUID REFERENCES office_locations(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('temporary', 'permanent')),
    grace_type VARCHAR(20) NOT NULL CHECK (grace_type IN ('check_in', 'check_out', 'break', 'all')),
    grace_period INTEGER NOT NULL, -- minutes
    valid_from DATE NOT NULL,
    valid_to DATE, -- NULL for permanent exceptions
    reason TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_temporary_has_end_date CHECK (
        (type = 'permanent') OR (type = 'temporary' AND valid_to IS NOT NULL)
    )
);

-- Grace period applications table to track when grace periods are applied
CREATE TABLE IF NOT EXISTS grace_period_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attendance_id UUID REFERENCES attendance(id) ON DELETE CASCADE,
    break_id UUID REFERENCES breaks(id) ON DELETE CASCADE,
    application_type VARCHAR(20) NOT NULL CHECK (application_type IN ('check_in', 'check_out', 'break_start', 'break_end')),
    original_time TIMESTAMP WITH TIME ZONE NOT NULL,
    adjusted_time TIMESTAMP WITH TIME ZONE NOT NULL,
    grace_minutes INTEGER NOT NULL,
    grace_source VARCHAR(20) NOT NULL CHECK (grace_source IN ('config', 'exception')),
    grace_config_id UUID REFERENCES grace_period_configs(id),
    grace_exception_id UUID REFERENCES grace_period_exceptions(id),
    reason TEXT,
    applied_by VARCHAR(20) DEFAULT 'system' CHECK (applied_by IN ('system', 'manual')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_attendance_or_break CHECK (
        (attendance_id IS NOT NULL AND break_id IS NULL) OR 
        (attendance_id IS NULL AND break_id IS NOT NULL)
    ),
    CONSTRAINT check_grace_source_reference CHECK (
        (grace_source = 'config' AND grace_config_id IS NOT NULL AND grace_exception_id IS NULL) OR
        (grace_source = 'exception' AND grace_exception_id IS NOT NULL AND grace_config_id IS NULL)
    )
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_grace_period_configs_office ON grace_period_configs(office_id);
CREATE INDEX IF NOT EXISTS idx_grace_period_configs_active ON grace_period_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_grace_period_exceptions_user ON grace_period_exceptions(user_id);
CREATE INDEX IF NOT EXISTS idx_grace_period_exceptions_office ON grace_period_exceptions(office_id);
CREATE INDEX IF NOT EXISTS idx_grace_period_exceptions_active ON grace_period_exceptions(is_active);
CREATE INDEX IF NOT EXISTS idx_grace_period_exceptions_dates ON grace_period_exceptions(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_grace_period_applications_user ON grace_period_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_grace_period_applications_attendance ON grace_period_applications(attendance_id);
CREATE INDEX IF NOT EXISTS idx_grace_period_applications_break ON grace_period_applications(break_id);
CREATE INDEX IF NOT EXISTS idx_grace_period_applications_type ON grace_period_applications(application_type);
CREATE INDEX IF NOT EXISTS idx_grace_period_applications_date ON grace_period_applications(created_at);

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_grace_period_configs_updated_at ON grace_period_configs;
CREATE TRIGGER update_grace_period_configs_updated_at 
    BEFORE UPDATE ON grace_period_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_grace_period_exceptions_updated_at ON grace_period_exceptions;
CREATE TRIGGER update_grace_period_exceptions_updated_at 
    BEFORE UPDATE ON grace_period_exceptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default grace period configurations for existing offices
INSERT INTO grace_period_configs (office_id, check_in_grace, check_out_grace, break_grace)
SELECT id, 15, 15, 5 FROM office_locations
ON CONFLICT (office_id) DO NOTHING;