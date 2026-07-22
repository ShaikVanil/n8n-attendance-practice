-- GPS Geofencing Migration for US-001
-- Add GPS coordinates and geofencing capabilities to office_locations

ALTER TABLE office_locations 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS geofence_radius_meters INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS geofence_enabled BOOLEAN DEFAULT true;

-- Add GPS coordinates to location_detections table
ALTER TABLE location_detections 
ADD COLUMN IF NOT EXISTS user_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS user_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS distance_from_office_meters DECIMAL(10, 2);

-- Add GPS coordinates to attendance table for check-in/check-out locations
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS check_in_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS check_in_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS check_out_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS check_out_longitude DECIMAL(11, 8);

-- Function to calculate distance between two GPS coordinates using Haversine formula
CREATE OR REPLACE FUNCTION calculate_distance_meters(
    lat1 DECIMAL(10, 8),
    lon1 DECIMAL(11, 8),
    lat2 DECIMAL(10, 8),
    lon2 DECIMAL(11, 8)
) RETURNS DECIMAL(10, 2) AS $$
DECLARE
    earth_radius CONSTANT DECIMAL := 6371000; -- Earth radius in meters
    dlat DECIMAL;
    dlon DECIMAL;
    a DECIMAL;
    c DECIMAL;
    distance DECIMAL;
BEGIN
    -- Convert degrees to radians
    dlat := RADIANS(lat2 - lat1);
    dlon := RADIANS(lon2 - lon1);
    
    -- Haversine formula
    a := SIN(dlat/2) * SIN(dlat/2) + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dlon/2) * SIN(dlon/2);
    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    distance := earth_radius * c;
    
    RETURN distance;
END;
$$ LANGUAGE plpgsql;

-- Function to validate if user is within office geofence
CREATE OR REPLACE FUNCTION validate_geofence(
    office_id UUID,
    user_lat DECIMAL(10, 8),
    user_lon DECIMAL(11, 8)
) RETURNS BOOLEAN AS $$
DECLARE
    office_lat DECIMAL(10, 8);
    office_lon DECIMAL(11, 8);
    geofence_radius INTEGER;
    distance DECIMAL(10, 2);
BEGIN
    -- Get office coordinates and geofence radius
    SELECT latitude, longitude, geofence_radius_meters
    INTO office_lat, office_lon, geofence_radius
    FROM office_locations
    WHERE id = office_id AND is_active = true AND geofence_enabled = true;
    
    -- Return false if office not found or GPS not configured
    IF office_lat IS NULL OR office_lon IS NULL THEN
        RETURN false;
    END IF;
    
    -- Calculate distance
    distance := calculate_distance_meters(office_lat, office_lon, user_lat, user_lon);
    
    -- Return true if within geofence radius
    RETURN distance <= geofence_radius;
END;
$$ LANGUAGE plpgsql;

-- Update sample office locations with GPS coordinates
UPDATE office_locations 
SET 
    latitude = 40.7128,
    longitude = -74.0060,
    geofence_radius_meters = 100
WHERE name = 'Main Office';

UPDATE office_locations 
SET 
    latitude = 40.7589,
    longitude = -73.9851,
    geofence_radius_meters = 150
WHERE name = 'Branch Office';

UPDATE office_locations 
SET 
    latitude = 34.0522,
    longitude = -118.2437,
    geofence_radius_meters = 200
WHERE name = 'Remote Hub';

-- Create indexes for GPS queries
CREATE INDEX IF NOT EXISTS idx_office_locations_gps ON office_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_location_detections_gps ON location_detections(user_latitude, user_longitude);
CREATE INDEX IF NOT EXISTS idx_attendance_checkin_gps ON attendance(check_in_latitude, check_in_longitude);