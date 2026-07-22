-- Add manager_id column to users table for direct manager-employee relationships
-- This migration adds support for hierarchical manager assignments

ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for better performance on manager lookups
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);

-- Add constraint to prevent self-referencing (user cannot be their own manager) (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'chk_no_self_manager'
      AND t.relname = 'users'
      AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE users ADD CONSTRAINT chk_no_self_manager CHECK (id != manager_id);
  END IF;
END $$;

-- Update existing users to have proper manager relationships based on office location
-- Only run this one-time data migration if the legacy office_location column still exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'office_location'
  ) THEN
    WITH location_managers AS (
      SELECT DISTINCT office_location, id as manager_id
      FROM users
      WHERE role IN ('manager', 'admin')
        AND is_active = true
        AND office_location IS NOT NULL
    )
    UPDATE users
    SET manager_id = lm.manager_id
    FROM location_managers lm
    WHERE users.office_location = lm.office_location
      AND users.role = 'employee'
      AND users.manager_id IS NULL;
  END IF;
END $$;