-- Daily Timesheet Management Schema
-- This schema supports multiple daily timesheet entries per day

-- Drop existing table and recreate to ensure proper schema
DROP TABLE IF EXISTS daily_timesheets CASCADE;

-- Daily timesheets table for individual day entries
CREATE TABLE daily_timesheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES users(id), -- Added manager_id column
    date DATE NOT NULL,
    task_name VARCHAR(255) NOT NULL, -- Name/description of the task or project
    start_time TIME,
    end_time TIME,
    break_duration INTEGER DEFAULT 0, -- minutes
    work_hours DECIMAL(4, 2) DEFAULT 0,
    description TEXT,
    project_code VARCHAR(50),
    location_id UUID REFERENCES office_locations(id),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    manager_comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    -- Removed UNIQUE(user_id, date) constraint to allow multiple entries per day
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_timesheets_user_date ON daily_timesheets(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_timesheets_manager ON daily_timesheets(manager_id); -- Added manager index
CREATE INDEX IF NOT EXISTS idx_daily_timesheets_status ON daily_timesheets(status);
CREATE INDEX IF NOT EXISTS idx_daily_timesheets_date ON daily_timesheets(date);
CREATE INDEX IF NOT EXISTS idx_daily_timesheets_user_task ON daily_timesheets(user_id, task_name);

-- Function to calculate work hours from start/end time
CREATE OR REPLACE FUNCTION calculate_daily_timesheet_work_hours()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
        -- Calculate work hours excluding break duration
        NEW.work_hours = GREATEST(0, 
            EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600 - (COALESCE(NEW.break_duration, 0) / 60.0)
        );
    ELSE
        NEW.work_hours = 0;
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate work hours
DROP TRIGGER IF EXISTS trigger_calculate_daily_timesheet_work_hours ON daily_timesheets;
CREATE TRIGGER trigger_calculate_daily_timesheet_work_hours
    BEFORE INSERT OR UPDATE ON daily_timesheets
    FOR EACH ROW
    EXECUTE FUNCTION calculate_daily_timesheet_work_hours();

-- View to get daily summary with total hours
CREATE OR REPLACE VIEW daily_timesheet_summary AS
SELECT 
    user_id,
    date,
    COUNT(*) as total_entries,
    SUM(work_hours) as total_hours,
    STRING_AGG(task_name, ', ' ORDER BY created_at) as tasks,
    MIN(start_time) as earliest_start,
    MAX(end_time) as latest_end,
    CASE 
        WHEN COUNT(CASE WHEN status = 'submitted' THEN 1 END) = COUNT(*) THEN 'submitted'
        WHEN COUNT(CASE WHEN status = 'approved' THEN 1 END) = COUNT(*) THEN 'approved'
        WHEN COUNT(CASE WHEN status = 'rejected' THEN 1 END) > 0 THEN 'rejected'
        ELSE 'draft'
    END as overall_status
FROM daily_timesheets
GROUP BY user_id, date;