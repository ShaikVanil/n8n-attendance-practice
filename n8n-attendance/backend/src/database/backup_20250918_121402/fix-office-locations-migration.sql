-- Migration to fix office location display issue
BEGIN;

-- First, add a unique constraint on name if it doesn't exist
ALTER TABLE office_locations ADD CONSTRAINT office_locations_name_unique UNIQUE (name);

-- Insert Main Office if it doesn't exist
INSERT INTO office_locations (id, name, address, timezone, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Main Office',
  'Main Office Address',
  'UTC',
  NOW(),
  NOW()
)
ON CONFLICT (name) DO NOTHING;

-- Create other common office locations from existing user data
INSERT INTO office_locations (id, name, address, timezone, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  office_location,
  office_location || ' Address',
  'UTC',
  NOW(),
  NOW()
FROM (
  SELECT DISTINCT office_location
  FROM users 
  WHERE office_location IS NOT NULL 
    AND office_location != ''
    AND office_location NOT LIKE '%-%-%-%-%'  -- Exclude UUIDs
    AND office_location NOT IN (SELECT name FROM office_locations)
) AS distinct_offices
ON CONFLICT (name) DO NOTHING;

-- Update users to link to proper office_locations
UPDATE users 
SET current_location_id = ol.id
FROM office_locations ol
WHERE users.office_location = ol.name 
  AND users.current_location_id IS NULL;

-- Clean up any users with UUID values in office_location field
UPDATE users 
SET office_location = 'Main Office',
    current_location_id = (SELECT id FROM office_locations WHERE name = 'Main Office' LIMIT 1)
WHERE office_location LIKE '%-%-%-%-%'  -- UUID pattern
  AND current_location_id IS NULL;

COMMIT;