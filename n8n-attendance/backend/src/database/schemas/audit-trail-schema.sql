-- Add these lines at the top to prevent duplicate trigger errors
DROP TRIGGER IF EXISTS audit_users_trigger ON users;
DROP TRIGGER IF EXISTS audit_attendance_trigger ON attendance;
DROP TRIGGER IF EXISTS audit_devices_trigger ON devices;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_attendance_updated_at ON attendance;
DROP TRIGGER IF EXISTS update_devices_updated_at ON devices;
DROP TRIGGER IF EXISTS update_compliance_violations_updated_at ON compliance_violations;
DROP TRIGGER IF EXISTS update_audit_trail_updated_at ON audit_trail;
DROP TRIGGER IF EXISTS update_risk_assessments_updated_at ON risk_assessments;
DROP TRIGGER IF EXISTS update_compliance_reports_updated_at ON compliance_reports;

-- Then keep the existing CREATE TRIGGER statements
CREATE TRIGGER update_compliance_violations_updated_at
    BEFORE UPDATE ON compliance_violations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_policy_violations_updated_at ON policy_violations;

-- Then create triggers normally
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_attendance_trigger
    AFTER INSERT OR UPDATE OR DELETE ON attendance
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_devices_trigger
    AFTER INSERT OR UPDATE OR DELETE ON devices
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();