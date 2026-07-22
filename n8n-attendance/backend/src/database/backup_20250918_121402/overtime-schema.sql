-- Overtime Records Schema
-- This table tracks overtime hours and pay for attendance records

CREATE TABLE IF NOT EXISTS overtime_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    overtime_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
    overtime_pay DECIMAL(10,2) DEFAULT 0,
    overtime_rate DECIMAL(5,2) DEFAULT 1.5, -- overtime multiplier
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(attendance_id) -- One overtime record per attendance record
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_overtime_records_attendance_id ON overtime_records(attendance_id);
CREATE INDEX IF NOT EXISTS idx_overtime_records_user_id ON overtime_records(user_id);
CREATE INDEX IF NOT EXISTS idx_overtime_records_status ON overtime_records(status);
CREATE INDEX IF NOT EXISTS idx_overtime_records_created_at ON overtime_records(created_at DESC);

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_overtime_records_updated_at ON overtime_records;
CREATE TRIGGER update_overtime_records_updated_at 
    BEFORE UPDATE ON overtime_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();