-- Add missing system configuration categories
INSERT INTO system_config (category, key, value, description) VALUES
-- Break Policies
('break_policies', 'max_break_duration_minutes', '60', 'Maximum break duration in minutes'),
('break_policies', 'max_breaks_per_day', '3', 'Maximum number of breaks per day'),
('break_policies', 'mandatory_break_duration', '30', 'Mandatory break duration for long shifts (minutes)'),

-- Overtime Policies
('overtime_policies', 'overtime_threshold_hours', '8', 'Hours after which overtime applies'),
('overtime_policies', 'overtime_multiplier', '1.5', 'Overtime pay multiplier'),
('overtime_policies', 'max_overtime_hours', '4', 'Maximum overtime hours per day'),

-- Notification Settings
('notifications', 'email_enabled', 'true', 'Enable email notifications'),
('notifications', 'sms_enabled', 'false', 'Enable SMS notifications'),
('notifications', 'realtime_enabled', 'true', 'Enable real-time notifications'),
('notifications', 'retry_attempts', '3', 'Number of notification retry attempts'),
('notifications', 'retry_delay_minutes', '5', 'Delay between notification retries (minutes)')
ON CONFLICT (category, key) DO NOTHING;

-- Add missing columns to offices table if they don't exist
ALTER TABLE offices 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add missing columns to wifi_networks table if they don't exist
ALTER TABLE wifi_networks 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Fix foreign key constraint to reference correct table
ALTER TABLE wifi_networks DROP CONSTRAINT IF EXISTS wifi_networks_office_id_fkey;
ALTER TABLE wifi_networks ADD CONSTRAINT wifi_networks_office_id_fkey 
    FOREIGN KEY (office_id) REFERENCES office_locations(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_offices_active ON offices(is_active);
CREATE INDEX IF NOT EXISTS idx_wifi_networks_active ON wifi_networks(is_active);
CREATE INDEX IF NOT EXISTS idx_wifi_networks_office ON wifi_networks(office_id);