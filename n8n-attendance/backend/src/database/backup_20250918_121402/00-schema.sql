-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  department VARCHAR(100), -- Add this line
  role VARCHAR(20) DEFAULT 'employee' CHECK (role IN ('employee', 'manager', 'admin')),
  is_active BOOLEAN DEFAULT true,
  office_location VARCHAR(255),
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name VARCHAR(100) NOT NULL,
  device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('mobile', 'tablet', 'laptop')),
  mac_address VARCHAR(17) NOT NULL UNIQUE,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Attendance table for check-in/check-out records
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  check_in_type VARCHAR(20) DEFAULT 'manual' CHECK (check_in_type IN ('automatic', 'manual')),
  check_out_type VARCHAR(20) DEFAULT 'manual' CHECK (check_out_type IN ('automatic', 'manual')),
  check_in_location VARCHAR(255),
  check_out_location VARCHAR(255),
  location VARCHAR(255), -- Add this line
  break_duration VARCHAR(10) DEFAULT '0:00', -- Add this line
  is_late BOOLEAN DEFAULT false, -- Add this line
  notes TEXT,
  total_hours DECIMAL(5,2),
  date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_mac_address ON devices(mac_address);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate total hours (break-aware)
CREATE OR REPLACE FUNCTION calculate_total_hours()
RETURNS TRIGGER AS $$
DECLARE
    total_break_minutes INTEGER;
BEGIN
    IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
        -- Calculate total break time for this attendance session
        SELECT COALESCE(SUM(duration_minutes), 0) INTO total_break_minutes
        FROM breaks 
        WHERE attendance_id = NEW.id AND status = 'completed';
        
        -- Calculate total hours excluding break time
        NEW.total_hours = GREATEST(0, 
            EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600 - (total_break_minutes / 60.0)
        );
        NEW.status = 'completed';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables (with existence checks)
DO $$
BEGIN
    -- Drop existing triggers if they exist
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    DROP TRIGGER IF EXISTS update_devices_updated_at ON devices;
    DROP TRIGGER IF EXISTS update_attendance_updated_at ON attendance;
    DROP TRIGGER IF EXISTS calculate_attendance_hours ON attendance;
    
    -- Create triggers
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER calculate_attendance_hours BEFORE INSERT OR UPDATE ON attendance
        FOR EACH ROW EXECUTE FUNCTION calculate_total_hours();
END $$;


-- Add missing department column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Add missing columns to attendance table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS break_duration INTEGER DEFAULT 0;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT false;
