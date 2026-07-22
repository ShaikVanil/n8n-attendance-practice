-- Leave Management Schema
-- Supports leave request submission, approval workflow, and leave tracking

-- Leave types table for configurable leave categories
CREATE TABLE IF NOT EXISTS leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  max_days_per_year INTEGER,
  requires_approval BOOLEAN DEFAULT true,
  requires_documentation BOOLEAN DEFAULT false,
  advance_notice_days INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewer_comments TEXT,
  emergency_leave BOOLEAN DEFAULT false,
  half_day BOOLEAN DEFAULT false,
  half_day_period VARCHAR(10) CHECK (half_day_period IN ('morning', 'afternoon') OR half_day_period IS NULL),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Leave request documents table for supporting attachments
CREATE TABLE IF NOT EXISTS leave_request_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Leave balances table to track remaining leave days
CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  allocated_days DECIMAL(4,1) NOT NULL DEFAULT 0,
  used_days DECIMAL(4,1) NOT NULL DEFAULT 0,
  pending_days DECIMAL(4,1) NOT NULL DEFAULT 0,
  remaining_days DECIMAL(4,1) GENERATED ALWAYS AS (allocated_days - used_days - pending_days) STORED,
  carried_forward_days DECIMAL(4,1) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, leave_type_id, year)
);

-- Leave request history for audit trail
CREATE TABLE IF NOT EXISTS leave_request_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  previous_status VARCHAR(20),
  new_status VARCHAR(20),
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_type ON leave_requests(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_submitted ON leave_requests(submitted_at);
CREATE INDEX IF NOT EXISTS idx_leave_balances_user_year ON leave_balances(user_id, year);
CREATE INDEX IF NOT EXISTS idx_leave_balances_type ON leave_balances(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_leave_documents_request ON leave_request_documents(leave_request_id);
CREATE INDEX IF NOT EXISTS idx_leave_history_request ON leave_request_history(leave_request_id);

-- Function to calculate total leave days (excluding weekends)
CREATE OR REPLACE FUNCTION calculate_leave_days(start_date DATE, end_date DATE, half_day BOOLEAN DEFAULT false)
RETURNS DECIMAL(4,1) AS $$
DECLARE
    total_days DECIMAL(4,1);
    current_day DATE;
BEGIN
    total_days := 0;
    current_day := start_date;
    
    WHILE current_day <= end_date LOOP
        -- Only count weekdays (Monday = 1, Sunday = 7)
        IF EXTRACT(DOW FROM current_day) BETWEEN 1 AND 5 THEN
            total_days := total_days + 1;
        END IF;
        current_day := current_day + INTERVAL '1 day';
    END LOOP;
    
    -- If it's a half day, divide by 2
    IF half_day THEN
        total_days := total_days / 2;
    END IF;
    
    RETURN total_days;
END;
$$ LANGUAGE plpgsql;

-- Function to update leave balances when leave status changes
CREATE OR REPLACE FUNCTION update_leave_balances()
RETURNS TRIGGER AS $$
DECLARE
    leave_year INTEGER;
BEGIN
    leave_year := EXTRACT(YEAR FROM NEW.start_date);
    
    -- Handle status changes
    IF TG_OP = 'UPDATE' THEN
        -- If status changed from pending to approved
        IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
            UPDATE leave_balances 
            SET 
                pending_days = pending_days - NEW.total_days,
                used_days = used_days + NEW.total_days,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = NEW.user_id 
              AND leave_type_id = NEW.leave_type_id 
              AND year = leave_year;
              
        -- If status changed from pending to rejected
        ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
            UPDATE leave_balances 
            SET 
                pending_days = pending_days - NEW.total_days,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = NEW.user_id 
              AND leave_type_id = NEW.leave_type_id 
              AND year = leave_year;
              
        -- If status changed from approved to cancelled
        ELSIF OLD.status = 'approved' AND NEW.status = 'cancelled' THEN
            UPDATE leave_balances 
            SET 
                used_days = used_days - NEW.total_days,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = NEW.user_id 
              AND leave_type_id = NEW.leave_type_id 
              AND year = leave_year;
        END IF;
        
    -- Handle new leave requests
    ELSIF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
        -- Add to pending days
        INSERT INTO leave_balances (user_id, leave_type_id, year, pending_days)
        VALUES (NEW.user_id, NEW.leave_type_id, leave_year, NEW.total_days)
        ON CONFLICT (user_id, leave_type_id, year)
        DO UPDATE SET 
            pending_days = leave_balances.pending_days + NEW.total_days,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to log leave request history
CREATE OR REPLACE FUNCTION log_leave_request_history()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO leave_request_history (leave_request_id, action, new_status, performed_by)
        VALUES (NEW.id, 'created', NEW.status, NEW.user_id);
        
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        INSERT INTO leave_request_history (leave_request_id, action, previous_status, new_status, performed_by, comments)
        VALUES (NEW.id, 'status_changed', OLD.status, NEW.status, NEW.reviewed_by, NEW.reviewer_comments);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate total days before insert/update
CREATE OR REPLACE FUNCTION calculate_leave_request_days()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_days := calculate_leave_days(NEW.start_date, NEW.end_date, NEW.half_day);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DO $$
BEGIN
    -- Drop existing triggers if they exist
    DROP TRIGGER IF EXISTS update_leave_types_updated_at ON leave_types;
    DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON leave_requests;
    DROP TRIGGER IF EXISTS update_leave_balances_updated_at ON leave_balances;
    DROP TRIGGER IF EXISTS calculate_leave_days_trigger ON leave_requests;
    DROP TRIGGER IF EXISTS update_leave_balances_trigger ON leave_requests;
    DROP TRIGGER IF EXISTS log_leave_history_trigger ON leave_requests;
    
    -- Create triggers
    CREATE TRIGGER update_leave_types_updated_at BEFORE UPDATE ON leave_types
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
    CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
    CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON leave_balances
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
    CREATE TRIGGER calculate_leave_days_trigger BEFORE INSERT OR UPDATE ON leave_requests
        FOR EACH ROW EXECUTE FUNCTION calculate_leave_request_days();
        
    CREATE TRIGGER update_leave_balances_trigger AFTER INSERT OR UPDATE ON leave_requests
        FOR EACH ROW EXECUTE FUNCTION update_leave_balances();
        
    CREATE TRIGGER log_leave_history_trigger AFTER INSERT OR UPDATE ON leave_requests
        FOR EACH ROW EXECUTE FUNCTION log_leave_request_history();
END $$;

-- Insert default leave types
INSERT INTO leave_types (name, description, max_days_per_year, requires_approval, requires_documentation, advance_notice_days) VALUES
('Annual Leave', 'Yearly vacation leave', 25, true, false, 7),
('Sick Leave', 'Medical leave for illness', 10, false, true, 0),
('Personal Leave', 'Personal time off', 5, true, false, 3),
('Emergency Leave', 'Urgent personal matters', 3, true, false, 0),
('Maternity Leave', 'Maternity leave', 90, true, true, 30),
('Paternity Leave', 'Paternity leave', 14, true, true, 30),
('Bereavement Leave', 'Leave for family bereavement', 5, true, false, 0)
ON CONFLICT (name) DO NOTHING;