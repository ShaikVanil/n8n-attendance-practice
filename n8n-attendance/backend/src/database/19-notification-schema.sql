-- Notification preferences for users
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    realtime_enabled BOOLEAN DEFAULT true,
    checkin_confirmation BOOLEAN DEFAULT true,
    checkout_confirmation BOOLEAN DEFAULT true,
    auto_checkin_failure BOOLEAN DEFAULT true,
    policy_violations BOOLEAN DEFAULT true,
    device_approval BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'sms', 'realtime')),
    subject VARCHAR(200),
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, type)
);

-- Notification history
CREATE TABLE IF NOT EXISTS notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'sms', 'realtime')),
    template_id UUID REFERENCES notification_templates(id),
    subject VARCHAR(200),
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- System notification configuration
CREATE TABLE IF NOT EXISTS notification_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_provider VARCHAR(20) DEFAULT 'sendgrid',
    email_api_key TEXT,
    email_from_address VARCHAR(255) DEFAULT 'noreply@attendance.company.com',
    email_from_name VARCHAR(100) DEFAULT 'Attendance System',
    sms_provider VARCHAR(20) DEFAULT 'twilio',
    sms_account_sid TEXT,
    sms_auth_token TEXT,
    sms_from_number VARCHAR(20),
    realtime_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status);
CREATE INDEX IF NOT EXISTS idx_notification_history_created_at ON notification_history(created_at);

-- Add new device notification templates
INSERT INTO notification_templates (name, type, subject, content, variables) VALUES
('device_registration_request_email', 'email', 'New Device Registration Request - {{employeeName}}', 
 'Hello Admin,\n\nA new device registration request has been submitted:\n\nEmployee: {{employeeName}} ({{employeeEmail}})\nDevice: {{deviceName}} ({{deviceType}})\nMAC Address: {{macAddress}}\nRegistration Time: {{registrationTime}}\n\nPlease review and approve/reject this request in the admin dashboard.\n\nBest regards,\nAttendance System', 
 '["employeeName", "employeeEmail", "deviceName", "deviceType", "macAddress", "registrationTime"]'),

('device_registration_request_realtime', 'realtime', 'New Device Registration', 
 'New device registration from {{employeeName}}: {{deviceName}}', 
 '["employeeName", "deviceName"]'),

('device_rejected_email', 'email', 'Device Registration Rejected', 
 'Hello {{firstName}},\n\nYour device registration has been rejected.\n\nDevice: {{deviceName}} ({{deviceType}})\nMAC Address: {{macAddress}}\nReason: {{rejectionReason}}\nRejection Time: {{rejectionTime}}\n\nPlease contact your administrator for more information or submit a new registration with the required changes.\n\nBest regards,\nAttendance System', 
 '["firstName", "deviceName", "deviceType", "macAddress", "rejectionReason", "rejectionTime"]'),

('device_rejected_realtime', 'realtime', 'Device Registration Rejected', 
 'Your device {{deviceName}} registration was rejected: {{rejectionReason}}', 
 '["deviceName", "rejectionReason"]')
ON CONFLICT (name, type) DO NOTHING;

-- Create device audit logs table
CREATE TABLE IF NOT EXISTS device_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    admin_user_id UUID REFERENCES users(id),
    action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected', 'revoked')),
    reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_device_audit_logs_device_id ON device_audit_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_device_audit_logs_timestamp ON device_audit_logs(timestamp);

-- Add automatic check-in notification templates
INSERT INTO notification_templates (name, type, subject, content, variables) VALUES
('auto_checkin_success_email', 'email', 'Check-in Confirmed - {{timestamp}}', 
 'Hello {{firstName}},\n\nYour automatic check-in has been successfully recorded.\n\nDetails:\n- Time: {{timestamp}}\n- Device: {{deviceName}}\n- Location: {{officeName}}\n\nHave a great day!\n\nBest regards,\nAttendance System', 
 '["firstName", "timestamp", "deviceName", "officeName"]'),

('auto_checkin_success_sms', 'sms', NULL, 
 'Check-in confirmed at {{timestamp}} via {{deviceName}}. Have a great day!', 
 '["timestamp", "deviceName"]'),

('auto_checkin_success_realtime', 'realtime', 'Check-in Successful', 
 'Automatic check-in recorded at {{timestamp}}', 
 '["timestamp"]'),

('auto_checkin_failed_email', 'email', 'Automatic Check-in Failed', 
 'Hello {{firstName}},\n\nWe detected your device but could not complete automatic check-in.\n\nReason: {{reason}}\nTime: {{timestamp}}\nDevice: {{deviceName}}\n\nPlease check in manually from your dashboard.\n\nBest regards,\nAttendance System', 
 '["firstName", "reason", "timestamp", "deviceName"]'),

('auto_checkin_failed_sms', 'sms', NULL, 
 'Auto check-in failed: {{reason}}. Please check in manually.', 
 '["reason"]'),

('auto_checkin_failed_realtime', 'realtime', 'Check-in Failed', 
 'Automatic check-in failed: {{reason}}', 
 '["reason"]'),

('device_approved_email', 'email', 'Device Registration Approved', 
 'Hello {{firstName}},\n\nYour device registration has been approved!\n\nDevice: {{deviceName}} ({{deviceType}})\nMAC Address: {{macAddress}}\n\nYou can now use this device for automatic attendance tracking.\n\nBest regards,\nAttendance System', 
 '["firstName", "deviceName", "deviceType", "macAddress"]'),

('device_approved_realtime', 'realtime', 'Device Approved', 
 'Your device {{deviceName}} has been approved for attendance tracking', 
 '["deviceName"]'),

('auto_checkin_failed_with_fallback_email', 'email', 'Check-in Failed - Manual Override Available', 
 'Hello {{firstName}},\n\nAutomatic check-in failed, but you can submit a manual override.\n\nFailure Reason: {{reason}}\nTime: {{timestamp}}\nDevice: {{deviceName}}\n\nPlease log into your dashboard to submit a manual override with a reason.\n\nBest regards,\nAttendance System', 
 '["firstName", "reason", "timestamp", "deviceName"]'),

('auto_checkin_failed_with_fallback_sms', 'sms', NULL, 
 'Auto check-in failed: {{reason}}. Manual override available in dashboard.', 
 '["reason"]'),

('auto_checkin_failed_with_fallback_realtime', 'realtime', 'Check-in Failed - Override Available', 
 'Auto check-in failed: {{reason}}. Manual override option available.', 
 '["reason"]'),

('pending_override_request_email', 'email', 'Manual Override Request Pending Review', 
 'Hello Admin,\n\nA manual override request requires your review:\n\nUser: {{firstName}} {{lastName}}\nReason: {{overrideReason}}\nAuto-failure: {{autoFailureReason}}\nTime: {{timestamp}}\n\nPlease review this request in the admin dashboard.\n\nBest regards,\nAttendance System', 
 '["firstName", "lastName", "overrideReason", "autoFailureReason", "timestamp"]'),

('pending_override_request_realtime', 'realtime', 'Override Request Pending', 
 'Manual override request from {{firstName}} {{lastName}} pending review', 
 '["firstName", "lastName"]'),

('scheduled_report_email', 'email', 'Scheduled Report: {{reportName}}', 
 'Hello,\n\nYour scheduled report "{{reportName}}" has been generated.\n\nReport Type: {{reportType}}\nGenerated At: {{generatedAt}}\n\nPlease find the attached report file.\n\nBest regards,\nAttendance Management System', 
 '["reportName", "reportType", "generatedAt"]'),

-- Policy Violation Notification Templates
('policy_violation_email', 'email', 'Policy Violation Alert - {{violationType}}', 
 'Hello {{firstName}},\n\nA policy violation has been detected on your account:\n\nViolation Type: {{violationType}}\nPolicy: {{policyName}}\nTime: {{timestamp}}\nDetails: {{violationDetails}}\n\nPlease review your attendance and ensure compliance with company policies.\n\nIf you believe this is an error, please contact your manager or HR department.\n\nBest regards,\nAttendance System', 
 '["firstName", "violationType", "policyName", "timestamp", "violationDetails"]'),

('policy_violation_sms', 'sms', NULL, 
 'Policy violation detected: {{violationType}} at {{timestamp}}. Please check your attendance dashboard.', 
 '["violationType", "timestamp"]'),

('policy_violation_realtime', 'realtime', 'Policy Violation', 
 'Policy violation: {{violationType}} - {{policyName}}', 
 '["violationType", "policyName"]'),

('policy_warning_email', 'email', 'Policy Warning - {{violationType}}', 
 'Hello {{firstName}},\n\nThis is a warning regarding your attendance:\n\nWarning Type: {{violationType}}\nPolicy: {{policyName}}\nTime: {{timestamp}}\nDetails: {{warningDetails}}\n\nPlease adjust your attendance to avoid future violations.\n\nBest regards,\nAttendance System', 
 '["firstName", "violationType", "policyName", "timestamp", "warningDetails"]'),

('policy_warning_sms', 'sms', NULL, 
 'Attendance warning: {{violationType}}. Please review your attendance.', 
 '["violationType"]'),

('policy_warning_realtime', 'realtime', 'Policy Warning', 
 'Warning: {{violationType}} - {{policyName}}', 
 '["violationType", "policyName"]'),

('grace_period_applied_email', 'email', 'Grace Period Applied', 
 'Hello {{firstName}},\n\nA grace period has been applied to your attendance:\n\nViolation Type: {{violationType}}\nGrace Period: {{gracePeriodMinutes}} minutes\nTime: {{timestamp}}\n\nThis is a one-time courtesy. Please ensure punctual attendance going forward.\n\nBest regards,\nAttendance System', 
 '["firstName", "violationType", "gracePeriodMinutes", "timestamp"]'),

('grace_period_applied_realtime', 'realtime', 'Grace Period Applied', 
 'Grace period applied: {{gracePeriodMinutes}} minutes for {{violationType}}', 
 '["gracePeriodMinutes", "violationType"]'),

('escalation_manager_email', 'email', 'Employee Policy Violation - {{employeeName}}', 
 'Hello {{managerName}},\n\nAn employee under your supervision has a policy violation:\n\nEmployee: {{employeeName}} ({{employeeEmail}})\nViolation Type: {{violationType}}\nPolicy: {{policyName}}\nTime: {{timestamp}}\nDetails: {{violationDetails}}\nEscalation Level: {{escalationLevel}}\n\nPlease review and take appropriate action.\n\nBest regards,\nAttendance System', 
 '["managerName", "employeeName", "employeeEmail", "violationType", "policyName", "timestamp", "violationDetails", "escalationLevel"]'),

('escalation_manager_realtime', 'realtime', 'Employee Violation Alert', 
 'Policy violation by {{employeeName}}: {{violationType}}', 
 '["employeeName", "violationType"]'),

('escalation_hr_email', 'email', 'HR Alert: Repeated Policy Violations - {{employeeName}}', 
 'Hello HR Team,\n\nAn employee has multiple policy violations requiring HR attention:\n\nEmployee: {{employeeName}} ({{employeeEmail}})\nManager: {{managerName}}\nViolation Type: {{violationType}}\nTotal Violations: {{violationCount}}\nTime: {{timestamp}}\nDetails: {{violationDetails}}\n\nPlease review and consider disciplinary action.\n\nBest regards,\nAttendance System', 
 '["employeeName", "employeeEmail", "managerName", "violationType", "violationCount", "timestamp", "violationDetails"]'),

('escalation_hr_realtime', 'realtime', 'HR Alert: Multiple Violations', 
 'Multiple violations by {{employeeName}} require HR attention', 
 '["employeeName"]')

ON CONFLICT (name, type) DO NOTHING;

-- Insert default notification config
INSERT INTO notification_config (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;


-- Main notifications table for tracking sent notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES notification_templates(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'sms', 'realtime')),
    subject VARCHAR(255),
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();