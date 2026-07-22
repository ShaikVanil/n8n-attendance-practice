-- Fixed RLS policies to use current_location_id instead of office_location
-- This replaces rls-policies-schema.sql

BEGIN;

-- Enable RLS on all tables first
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE disciplinary_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wifi_networks ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies (both old and new names)
DROP POLICY IF EXISTS users_self ON users;
DROP POLICY IF EXISTS users_admin_all ON users;
DROP POLICY IF EXISTS users_manager_office ON users;
DROP POLICY IF EXISTS users_manager_location ON users;
DROP POLICY IF EXISTS devices_self ON devices;
DROP POLICY IF EXISTS devices_admin_all ON devices;
DROP POLICY IF EXISTS devices_manager_office ON devices;
DROP POLICY IF EXISTS attendance_self ON attendance;
DROP POLICY IF EXISTS attendance_admin_all ON attendance;
DROP POLICY IF EXISTS attendance_manager_office ON attendance;
DROP POLICY IF EXISTS attendance_manager_location ON attendance;
DROP POLICY IF EXISTS breaks_self ON breaks;
DROP POLICY IF EXISTS breaks_manager_office ON breaks;
DROP POLICY IF EXISTS leave_requests_admin_all ON leave_requests;
DROP POLICY IF EXISTS leave_requests_self ON leave_requests;
DROP POLICY IF EXISTS leave_requests_manager_office ON leave_requests;
DROP POLICY IF EXISTS leave_requests_manager_location ON leave_requests;
DROP POLICY IF EXISTS leave_balances_self ON leave_balances;
DROP POLICY IF EXISTS leave_balances_admin_all ON leave_balances;
DROP POLICY IF EXISTS leave_balances_manager_office ON leave_balances;
DROP POLICY IF EXISTS escalation_actions_admin_hr ON escalation_actions;
DROP POLICY IF EXISTS escalation_actions_self ON escalation_actions;
DROP POLICY IF EXISTS escalation_actions_manager_office ON escalation_actions;
DROP POLICY IF EXISTS disciplinary_actions_admin_hr ON disciplinary_actions;
DROP POLICY IF EXISTS disciplinary_actions_self ON disciplinary_actions;
DROP POLICY IF EXISTS office_locations_admin_all ON office_locations;
DROP POLICY IF EXISTS office_locations_view_all ON office_locations;
DROP POLICY IF EXISTS system_config_admin_only ON system_config;
DROP POLICY IF EXISTS notifications_self ON notifications;
DROP POLICY IF EXISTS notifications_admin_all ON notifications;
DROP POLICY IF EXISTS automation_logs_admin_only ON automation_logs;
DROP POLICY IF EXISTS wifi_networks_admin_all ON wifi_networks;
DROP POLICY IF EXISTS wifi_networks_view_all ON wifi_networks;

-- Add these missing DROP statements:
DROP POLICY IF EXISTS users_manager_direct_reports ON users;
DROP POLICY IF EXISTS attendance_manager_direct_reports ON attendance;
DROP POLICY IF EXISTS leave_requests_manager_direct_reports ON leave_requests;

-- Create simplified policies that don't reference office_location
-- For development environment, we'll use basic policies

-- USERS POLICIES
CREATE POLICY users_self ON users
    FOR ALL TO public
    USING (id = get_current_user_id());

CREATE POLICY users_admin_all ON users
    FOR ALL TO public
    USING (get_current_user_role() = 'admin');

-- Managers can view users in their current location
CREATE POLICY users_manager_location ON users
    FOR SELECT TO public
    USING (
        get_current_user_role() = 'manager' AND
        current_location_id IN (
            SELECT current_location_id FROM users WHERE id = get_current_user_id()
        )
    );

-- DEVICES POLICIES
CREATE POLICY devices_self ON devices
    FOR ALL TO public
    USING (user_id = get_current_user_id());

CREATE POLICY devices_admin_all ON devices
    FOR ALL TO public
    USING (get_current_user_role() = 'admin');

-- ATTENDANCE POLICIES
CREATE POLICY attendance_self ON attendance
    FOR ALL TO public
    USING (user_id = get_current_user_id());

CREATE POLICY attendance_admin_all ON attendance
    FOR ALL TO public
    USING (get_current_user_role() = 'admin');

-- Managers can view attendance for users in their location
CREATE POLICY attendance_manager_location ON attendance
    FOR SELECT TO public
    USING (
        get_current_user_role() = 'manager' AND
        user_id IN (
            SELECT id FROM users u1
            WHERE u1.current_location_id IN (
                SELECT current_location_id FROM users WHERE id = get_current_user_id()
            )
        )
    );

-- BREAKS POLICIES
CREATE POLICY breaks_self ON breaks
    FOR ALL TO public
    USING (
        attendance_id IN (
            SELECT id FROM attendance WHERE user_id = get_current_user_id()
        )
    );

-- LEAVE REQUESTS POLICIES
CREATE POLICY leave_requests_admin_all ON leave_requests
    FOR ALL TO public
    USING (get_current_user_role() = 'admin');

CREATE POLICY leave_requests_self ON leave_requests
    FOR ALL TO public
    USING (user_id = get_current_user_id());

-- Managers can view/approve leave requests for their location
CREATE POLICY leave_requests_manager_location ON leave_requests
    FOR ALL TO public
    USING (
        get_current_user_role() = 'manager' AND
        user_id IN (
            SELECT id FROM users
            WHERE current_location_id IN (
                SELECT current_location_id FROM users WHERE id = get_current_user_id()
            )
        )
    );

-- LEAVE BALANCES POLICIES
CREATE POLICY leave_balances_self ON leave_balances
    FOR SELECT TO public
    USING (user_id = get_current_user_id());

CREATE POLICY leave_balances_admin_all ON leave_balances
    FOR ALL TO public
    USING (get_current_user_role() = 'admin');

-- ESCALATION ACTIONS POLICIES
CREATE POLICY escalation_actions_admin_hr ON escalation_actions
    FOR ALL TO public
    USING (get_current_user_role() IN ('admin', 'hr'));

CREATE POLICY escalation_actions_self ON escalation_actions
    FOR SELECT TO public
    USING (user_id = get_current_user_id());

-- DISCIPLINARY ACTIONS POLICIES
CREATE POLICY disciplinary_actions_admin_hr ON disciplinary_actions
    FOR ALL TO public
    USING (get_current_user_role() IN ('admin', 'hr'));

CREATE POLICY disciplinary_actions_self ON disciplinary_actions
    FOR SELECT TO public
    USING (employee_id = get_current_user_id());

-- OFFICE LOCATIONS POLICIES
CREATE POLICY office_locations_admin_all ON office_locations
    FOR ALL TO public
    USING (get_current_user_role() = 'admin');

CREATE POLICY office_locations_view_all ON office_locations
    FOR SELECT TO public
    USING (true);

-- SYSTEM CONFIG POLICIES
CREATE POLICY system_config_admin_only ON system_config
    FOR ALL TO public
    USING (get_current_user_role() = 'admin');

-- NOTIFICATIONS POLICIES
CREATE POLICY notifications_self ON notifications
    FOR ALL TO public
    USING (recipient_id = get_current_user_id());

CREATE POLICY notifications_admin_all ON notifications
    FOR ALL TO public
    USING (get_current_user_role() = 'admin');

-- AUTOMATION LOGS POLICIES
CREATE POLICY automation_logs_admin_only ON automation_logs
    FOR ALL TO public
    USING (get_current_user_role() = 'admin');

-- WIFI NETWORKS POLICIES
CREATE POLICY wifi_networks_admin_all ON wifi_networks
    FOR ALL TO public
    USING (get_current_user_role() = 'admin');

CREATE POLICY wifi_networks_view_all ON wifi_networks
    FOR SELECT TO public
    USING (true);

-- Managers can view users who report to them directly
CREATE POLICY users_manager_direct_reports ON users
    FOR SELECT TO public
    USING (
        get_current_user_role() = 'manager' AND
        manager_id = get_current_user_id()
    );

-- Managers can view attendance for their direct reports
CREATE POLICY attendance_manager_direct_reports ON attendance
    FOR SELECT TO public
    USING (
        get_current_user_role() = 'manager' AND
        user_id IN (
            SELECT id FROM users 
            WHERE manager_id = get_current_user_id()
        )
    );

-- Managers can view/approve leave requests for their direct reports
CREATE POLICY leave_requests_manager_direct_reports ON leave_requests
    FOR ALL TO public
    USING (
        get_current_user_role() = 'manager' AND
        user_id IN (
            SELECT id FROM users
            WHERE manager_id = get_current_user_id()
        )
    );

COMMIT;