-- Manual Override System Migration for US-002.4
-- Add manual override fields to attendance table

ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS is_manual_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS override_reason VARCHAR(500),
ADD COLUMN IF NOT EXISTS auto_checkin_failed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_checkin_failure_reason TEXT;

-- Create manual override logs table for admin notifications
CREATE TABLE IF NOT EXISTS manual_override_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    override_reason VARCHAR(500) NOT NULL,
    auto_failure_reason TEXT,
    admin_notified BOOLEAN DEFAULT false,
    admin_notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_manual_override ON attendance(is_manual_override, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manual_override_logs_user ON manual_override_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manual_override_logs_admin_notified ON manual_override_logs(admin_notified, created_at DESC);

-- Add constraint to ensure override_reason is required when is_manual_override is true
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS check_manual_override_reason;
ALTER TABLE attendance 
ADD CONSTRAINT check_manual_override_reason 
CHECK (
    (is_manual_override = false) OR 
    (is_manual_override = true AND override_reason IS NOT NULL AND LENGTH(TRIM(override_reason)) > 0)
);