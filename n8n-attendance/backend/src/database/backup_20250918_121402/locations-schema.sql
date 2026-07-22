-- Office locations table
CREATE TABLE IF NOT EXISTS office_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  wifi_networks TEXT[], -- Array of WiFi network names/SSIDs
  timezone VARCHAR(50) DEFAULT 'UTC',
  working_hours_start TIME DEFAULT '09:00:00',
  working_hours_end TIME DEFAULT '17:00:00',
  grace_period_minutes INTEGER DEFAULT 15,
  max_break_minutes INTEGER DEFAULT 60,
  overtime_threshold_hours DECIMAL(4,2) DEFAULT 8.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Location transfers table for tracking employee location changes
CREATE TABLE IF NOT EXISTS location_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_location_id UUID REFERENCES office_locations(id) ON DELETE SET NULL,
  to_location_id UUID NOT NULL REFERENCES office_locations(id) ON DELETE CASCADE,
  transfer_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  is_temporary BOOLEAN DEFAULT false,
  temporary_end_date DATE,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Location detection logs for audit trail
CREATE TABLE IF NOT EXISTS location_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  detected_location_id UUID REFERENCES office_locations(id) ON DELETE SET NULL,
  detection_method VARCHAR(20) NOT NULL CHECK (detection_method IN ('wifi', 'manual', 'gps')),
  confidence_score DECIMAL(3,2) DEFAULT 1.0, -- 0.0 to 1.0
  wifi_network_detected VARCHAR(255),
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add location_id to attendance table
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES office_locations(id) ON DELETE SET NULL;

-- Add location_id to users table (current assigned location)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS current_location_id UUID REFERENCES office_locations(id) ON DELETE SET NULL;

-- Update the existing office_location column to reference the new table
-- Note: This would require data migration in a real scenario

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_office_locations_active ON office_locations(is_active);
CREATE INDEX IF NOT EXISTS idx_location_transfers_user ON location_transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_location_transfers_status ON location_transfers(status);
CREATE INDEX IF NOT EXISTS idx_location_transfers_date ON location_transfers(transfer_date);
CREATE INDEX IF NOT EXISTS idx_location_detections_user ON location_detections(user_id);
CREATE INDEX IF NOT EXISTS idx_location_detections_timestamp ON location_detections(created_at);
CREATE INDEX IF NOT EXISTS idx_attendance_location ON attendance(location_id);
CREATE INDEX IF NOT EXISTS idx_users_current_location ON users(current_location_id);

-- Function to update user's current location after approved transfer
CREATE OR REPLACE FUNCTION update_user_location_on_transfer()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if transfer is approved and effective date has passed
    IF NEW.status = 'approved' AND NEW.transfer_date <= CURRENT_DATE THEN
        -- Check if it's a temporary transfer that has expired
        IF NEW.is_temporary AND NEW.temporary_end_date IS NOT NULL AND NEW.temporary_end_date < CURRENT_DATE THEN
            -- Revert to previous location or NULL
            UPDATE users 
            SET current_location_id = NEW.from_location_id
            WHERE id = NEW.user_id;
        ELSE
            -- Apply the new location
            UPDATE users 
            SET current_location_id = NEW.to_location_id
            WHERE id = NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to automatically detect location based on WiFi
CREATE OR REPLACE FUNCTION detect_location_by_wifi(p_wifi_network VARCHAR(255))
RETURNS UUID AS $$
DECLARE
    location_id UUID;
BEGIN
    SELECT id INTO location_id
    FROM office_locations
    WHERE p_wifi_network = ANY(wifi_networks)
    AND is_active = true
    LIMIT 1;
    
    RETURN location_id;
END;
$$ language 'plpgsql';

-- Apply triggers
DO $$
BEGIN
    -- Drop existing triggers if they exist
    DROP TRIGGER IF EXISTS update_office_locations_updated_at ON office_locations;
    DROP TRIGGER IF EXISTS update_location_transfers_updated_at ON location_transfers;
    DROP TRIGGER IF EXISTS update_user_location_trigger ON location_transfers;
    
    -- Create triggers
    CREATE TRIGGER update_office_locations_updated_at 
        BEFORE UPDATE ON office_locations
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
    CREATE TRIGGER update_location_transfers_updated_at 
        BEFORE UPDATE ON location_transfers
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
    CREATE TRIGGER update_user_location_trigger 
        AFTER UPDATE ON location_transfers
        FOR EACH ROW EXECUTE FUNCTION update_user_location_on_transfer();
END $$;
