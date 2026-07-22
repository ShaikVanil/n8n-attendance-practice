-- Automation logs table for tracking automatic check-in events
CREATE TABLE IF NOT EXISTS automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL, -- 'auto_checkin', 'auto_checkin_failed', 'auto_checkin_error'
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System configuration table for attendance automation settings
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category, key)
);

-- Offices table (if not exists) for location tracking
CREATE TABLE IF NOT EXISTS offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_automation_logs_user_timestamp ON automation_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_action_type ON automation_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category);

INSERT INTO system_config (category, key, value, description) VALUES
('attendance_automation', 'working_hours_start', '08:00', 'Start of working hours (HH:MM format)'),
('attendance_automation', 'working_hours_end', '18:00', 'End of working hours (HH:MM format)'),
('attendance_automation', 'grace_period_minutes', '30', 'Grace period in minutes before/after working hours'),
('attendance_automation', 'allow_weekend_checkin', 'false', 'Allow automatic check-in on weekends'),
('attendance_automation', 'max_checkins_per_day', '1', 'Maximum automatic check-ins per day')
ON CONFLICT (category, key) DO NOTHING;
