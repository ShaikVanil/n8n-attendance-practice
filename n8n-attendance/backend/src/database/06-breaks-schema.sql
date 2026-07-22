-- Breaks table for tracking employee break periods
CREATE TABLE IF NOT EXISTS breaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
    break_type VARCHAR(20) NOT NULL CHECK (break_type IN ('lunch', 'short', 'personal')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER, -- Calculated when break ends
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    notes TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Break policies table for configuring break time limits
CREATE TABLE IF NOT EXISTS break_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID REFERENCES office_locations(id) ON DELETE CASCADE,
    break_type VARCHAR(20) NOT NULL CHECK (break_type IN ('lunch', 'short', 'personal')),
    max_duration_minutes INTEGER NOT NULL,
    max_breaks_per_day INTEGER DEFAULT 1,
    is_mandatory BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(office_id, break_type)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_breaks_user_id ON breaks(user_id);
CREATE INDEX IF NOT EXISTS idx_breaks_attendance_id ON breaks(attendance_id);
CREATE INDEX IF NOT EXISTS idx_breaks_date ON breaks(date);
CREATE INDEX IF NOT EXISTS idx_breaks_status ON breaks(status);
CREATE INDEX IF NOT EXISTS idx_breaks_user_date ON breaks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_break_policies_office ON break_policies(office_id);

-- Function to calculate break duration
CREATE OR REPLACE FUNCTION calculate_break_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
        NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
        NEW.status = 'completed';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update attendance total hours excluding breaks
CREATE OR REPLACE FUNCTION update_attendance_hours_with_breaks()
RETURNS TRIGGER AS $$
DECLARE
    total_break_minutes INTEGER;
    attendance_record RECORD;
BEGIN
    -- Get the attendance record
    SELECT * INTO attendance_record FROM attendance WHERE id = NEW.attendance_id;
    
    -- Calculate total break time for this attendance session
    SELECT COALESCE(SUM(duration_minutes), 0) INTO total_break_minutes
    FROM breaks 
    WHERE attendance_id = NEW.attendance_id AND status = 'completed';
    
    -- Update attendance total_hours excluding break time
    IF attendance_record.check_in_time IS NOT NULL AND attendance_record.check_out_time IS NOT NULL THEN
        UPDATE attendance 
        SET total_hours = GREATEST(0, 
            EXTRACT(EPOCH FROM (attendance_record.check_out_time - attendance_record.check_in_time)) / 3600 - (total_break_minutes / 60.0)
        )
        WHERE id = NEW.attendance_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DO $$
BEGIN
    -- Drop existing triggers if they exist
    DROP TRIGGER IF EXISTS calculate_break_duration_trigger ON breaks;
    DROP TRIGGER IF EXISTS update_attendance_hours_trigger ON breaks;
    DROP TRIGGER IF EXISTS update_breaks_updated_at ON breaks;
    DROP TRIGGER IF EXISTS update_break_policies_updated_at ON break_policies;
    
    -- Create triggers
    CREATE TRIGGER calculate_break_duration_trigger 
        BEFORE INSERT OR UPDATE ON breaks
        FOR EACH ROW EXECUTE FUNCTION calculate_break_duration();
        
    CREATE TRIGGER update_attendance_hours_trigger 
        AFTER INSERT OR UPDATE ON breaks
        FOR EACH ROW EXECUTE FUNCTION update_attendance_hours_with_breaks();
        
    CREATE TRIGGER update_breaks_updated_at 
        BEFORE UPDATE ON breaks
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
    CREATE TRIGGER update_break_policies_updated_at 
        BEFORE UPDATE ON break_policies
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- Insert default break policies
INSERT INTO break_policies (office_id, break_type, max_duration_minutes, max_breaks_per_day, is_mandatory)
VALUES 
    (NULL, 'lunch', 60, 1, true),
    (NULL, 'short', 15, 3, false),
    (NULL, 'personal', 30, 2, false)
ON CONFLICT (office_id, break_type) DO NOTHING;