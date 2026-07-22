-- Migration to remove legacy office_location column
-- This script removes the office_location VARCHAR column from users table
-- All data should already be migrated to current_location_id

BEGIN;

-- Remove the office_location column from users table
ALTER TABLE users DROP COLUMN IF EXISTS office_location;

-- Update any remaining references in other tables if they exist
-- (This is a safety measure in case there are any foreign references)

COMMIT;