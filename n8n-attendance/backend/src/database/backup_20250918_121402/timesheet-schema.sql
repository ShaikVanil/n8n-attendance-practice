-- Timesheet Management Schema
-- This schema supports US-006: Weekly Timesheet Creation and related timesheet functionality

-- Timesheets table for weekly timesheet records
CREATE TABLE IF NOT EXISTS timesheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES users(id),
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    total_hours DECIMAL(5, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    manager_comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, week_start_date)
);

-- Timesheet entries table for daily work entries
CREATE TABLE IF NOT EXISTS timesheet_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timesheet_id UUID NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    break_duration INTEGER DEFAULT 0, -- minutes
    work_hours DECIMAL(4, 2) DEFAULT 0,
    description TEXT,
    project_code VARCHAR(50),
    location_id UUID REFERENCES office_locations(id),
    is_auto_populated BOOLEAN DEFAULT false,
    attendance_id UUID REFERENCES attendance(id), -- Link to original attendance record
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(timesheet_id, date)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_timesheets_user_week ON timesheets(user_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_timesheets_manager_status ON timesheets(manager_id, status);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_timesheet ON timesheet_entries(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_date ON timesheet_entries(date);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_attendance ON timesheet_entries(attendance_id);

-- Function to calculate total hours for a timesheet
CREATE OR REPLACE FUNCTION calculate_timesheet_total_hours()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the total hours in the parent timesheet
    UPDATE timesheets 
    SET total_hours = (
        SELECT COALESCE(SUM(work_hours), 0) 
        FROM timesheet_entries 
        WHERE timesheet_id = COALESCE(NEW.timesheet_id, OLD.timesheet_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.timesheet_id, OLD.timesheet_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Function to calculate work hours from start/end time
CREATE OR REPLACE FUNCTION calculate_entry_work_hours()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate if both start_time and end_time are provided
    IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
        -- Calculate work hours excluding break duration
        NEW.work_hours = GREATEST(0, 
            EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600 - (COALESCE(NEW.break_duration, 0) / 60.0)
        );
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Update timestamp trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DO $$
BEGIN
    -- Drop existing triggers if they exist
    DROP TRIGGER IF EXISTS update_timesheets_updated_at ON timesheets;
    DROP TRIGGER IF EXISTS calculate_timesheet_entry_hours ON timesheet_entries;
    DROP TRIGGER IF EXISTS update_timesheet_total_hours_insert ON timesheet_entries;
    DROP TRIGGER IF EXISTS update_timesheet_total_hours_update ON timesheet_entries;
    DROP TRIGGER IF EXISTS update_timesheet_total_hours_delete ON timesheet_entries;
    
    -- Create triggers
    CREATE TRIGGER update_timesheets_updated_at 
        BEFORE UPDATE ON timesheets
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    CREATE TRIGGER calculate_timesheet_entry_hours 
        BEFORE INSERT OR UPDATE ON timesheet_entries
        FOR EACH ROW EXECUTE FUNCTION calculate_entry_work_hours();
    
    CREATE TRIGGER update_timesheet_total_hours_insert 
        AFTER INSERT ON timesheet_entries
        FOR EACH ROW EXECUTE FUNCTION calculate_timesheet_total_hours();
    
    CREATE TRIGGER update_timesheet_total_hours_update 
        AFTER UPDATE ON timesheet_entries
        FOR EACH ROW EXECUTE FUNCTION calculate_timesheet_total_hours();
    
    CREATE TRIGGER update_timesheet_total_hours_delete 
        AFTER DELETE ON timesheet_entries
        FOR EACH ROW EXECUTE FUNCTION calculate_timesheet_total_hours();
END $$;

-- Remove these GRANT statements as 'app_user' role doesn't exist
-- The application uses connection pooling with the main database user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON timesheets TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON timesheet_entries TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;