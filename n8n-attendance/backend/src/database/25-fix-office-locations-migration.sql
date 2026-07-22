-- Migration to fix office location display issue
BEGIN;

-- First, add a unique constraint on name if it doesn't exist
DO $$
DECLARE
  constraint_exists BOOLEAN;
  index_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'office_locations_name_unique'
      AND c.contype = 'u'
      AND t.relname = 'office_locations'
      AND n.nspname = 'public'
  ) INTO constraint_exists;

  IF NOT constraint_exists THEN
    SELECT EXISTS (
      SELECT 1
      FROM pg_class i
      JOIN pg_namespace n ON n.oid = i.relnamespace
      WHERE i.relname = 'office_locations_name_unique'
        AND n.nspname = 'public'
    ) INTO index_exists;

    IF index_exists THEN
      ALTER TABLE office_locations
        ADD CONSTRAINT office_locations_name_unique
        UNIQUE USING INDEX office_locations_name_unique;
    ELSE
      ALTER TABLE office_locations
        ADD CONSTRAINT office_locations_name_unique UNIQUE (name);
    END IF;
  END IF;
END
$$;

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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'office_location'
  ) THEN
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
  END IF;
END
$$;

COMMIT;