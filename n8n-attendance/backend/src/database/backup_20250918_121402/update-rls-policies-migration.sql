-- Update RLS policies to use current_location_id instead of office_location

BEGIN;

-- Drop existing policies that reference office_location
DROP POLICY IF EXISTS attendance_office_isolation ON attendance;
DROP POLICY IF EXISTS users_office_isolation ON users;

-- Create new policies using current_location_id with JOIN
CREATE POLICY attendance_office_isolation ON attendance
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u1, users u2, office_locations ol1, office_locations ol2
      WHERE u1.id = auth.uid()
        AND u2.id = attendance.user_id
        AND u1.current_location_id = ol1.id
        AND u2.current_location_id = ol2.id
        AND ol1.name = ol2.name
    )
  );

CREATE POLICY users_office_isolation ON users
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u1, office_locations ol1, office_locations ol2
      WHERE u1.id = auth.uid()
        AND u1.current_location_id = ol1.id
        AND users.current_location_id = ol2.id
        AND ol1.name = ol2.name
    )
  );

COMMIT;