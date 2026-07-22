-- Location Transfer Notification Templates Migration
-- Add notification templates for location transfer management

-- Insert location transfer notification templates
INSERT INTO notification_templates (name, type, subject, content, variables) VALUES

-- Transfer request submitted notifications
('transfer_request_submitted_email', 'email', 'Location Transfer Request Submitted - {{targetLocationName}}', 
 'Hello {{employeeName}},\n\nYour location transfer request has been submitted successfully.\n\nDetails:\n- Target Location: {{targetLocationName}}\n- Requested Date: {{requestedDate}}\n- Reason: {{reason}}\n- Request Type: {{transferType}}\n- Status: Pending Approval\n\nYour manager will review this request and you will be notified of the decision.\n\nBest regards,\nAttendance System', 
 '["employeeName", "targetLocationName", "requestedDate", "reason", "transferType"]'),

('transfer_request_submitted_realtime', 'realtime', 'Transfer Request Submitted', 
 'Your transfer request to {{targetLocationName}} has been submitted for approval', 
 '["targetLocationName"]'),

-- Manager notification for new transfer request
('transfer_request_manager_email', 'email', 'New Location Transfer Request - {{employeeName}}', 
 'Hello {{managerName}},\n\nA new location transfer request requires your approval.\n\nEmployee Details:\n- Name: {{employeeName}} ({{employeeEmail}})\n- Current Location: {{currentLocationName}}\n- Target Location: {{targetLocationName}}\n- Requested Date: {{requestedDate}}\n- Reason: {{reason}}\n- Transfer Type: {{transferType}}\n\nPlease review this request in your manager dashboard.\n\nBest regards,\nAttendance System', 
 '["managerName", "employeeName", "employeeEmail", "currentLocationName", "targetLocationName", "requestedDate", "reason", "transferType"]'),

('transfer_request_manager_realtime', 'realtime', 'New Transfer Request', 
 'Transfer request from {{employeeName}} to {{targetLocationName}} requires approval', 
 '["employeeName", "targetLocationName"]'),

-- Transfer request approved notifications
('transfer_request_approved_email', 'email', 'Location Transfer Request Approved - {{targetLocationName}}', 
 'Hello {{employeeName}},\n\nGreat news! Your location transfer request has been approved.\n\nDetails:\n- Target Location: {{targetLocationName}}\n- Effective Date: {{effectiveDate}}\n- Transfer Type: {{transferType}}\n- Approved by: {{approverName}}\n- Comments: {{comments}}\n\nYour location assignment will be updated on the effective date.\n\nBest regards,\nAttendance System', 
 '["employeeName", "targetLocationName", "effectiveDate", "transferType", "approverName", "comments"]'),

('transfer_request_approved_sms', 'sms', NULL, 
 'Transfer request approved! You will be transferred to {{targetLocationName}} on {{effectiveDate}}.', 
 '["targetLocationName", "effectiveDate"]'),

('transfer_request_approved_realtime', 'realtime', 'Transfer Request Approved', 
 'Your transfer to {{targetLocationName}} has been approved for {{effectiveDate}}', 
 '["targetLocationName", "effectiveDate"]'),

-- Transfer request rejected notifications
('transfer_request_rejected_email', 'email', 'Location Transfer Request Declined - {{targetLocationName}}', 
 'Hello {{employeeName}},\n\nWe regret to inform you that your location transfer request has been declined.\n\nDetails:\n- Target Location: {{targetLocationName}}\n- Requested Date: {{requestedDate}}\n- Declined by: {{approverName}}\n- Reason for Decline: {{comments}}\n\nIf you have questions about this decision, please contact your manager or HR.\n\nBest regards,\nAttendance System', 
 '["employeeName", "targetLocationName", "requestedDate", "approverName", "comments"]'),

('transfer_request_rejected_sms', 'sms', NULL, 
 'Transfer request to {{targetLocationName}} has been declined. Check email for details.', 
 '["targetLocationName"]'),

('transfer_request_rejected_realtime', 'realtime', 'Transfer Request Declined', 
 'Your transfer request to {{targetLocationName}} has been declined', 
 '["targetLocationName"]'),

-- Transfer effective notifications
('transfer_effective_email', 'email', 'Location Transfer Now Active - {{newLocationName}}', 
 'Hello {{employeeName}},\n\nYour location transfer is now effective.\n\nDetails:\n- Previous Location: {{previousLocationName}}\n- New Location: {{newLocationName}}\n- Effective Date: {{effectiveDate}}\n- Transfer Type: {{transferType}}\n\nYour attendance tracking will now be associated with your new location. Please ensure you are familiar with the new location\'s policies and procedures.\n\nBest regards,\nAttendance System', 
 '["employeeName", "previousLocationName", "newLocationName", "effectiveDate", "transferType"]'),

('transfer_effective_realtime', 'realtime', 'Transfer Now Active', 
 'You are now assigned to {{newLocationName}}', 
 '["newLocationName"]'),

-- Transfer reminder notifications (for temporary transfers)
('transfer_reminder_email', 'email', 'Transfer Reminder - Return to {{originalLocationName}}', 
 'Hello {{employeeName}},\n\nThis is a reminder about your temporary location transfer.\n\nDetails:\n- Current Location: {{currentLocationName}}\n- Original Location: {{originalLocationName}}\n- Return Date: {{returnDate}}\n- Days Remaining: {{daysRemaining}}\n\nPlease prepare for your return to the original location.\n\nBest regards,\nAttendance System', 
 '["employeeName", "currentLocationName", "originalLocationName", "returnDate", "daysRemaining"]'),

('transfer_reminder_realtime', 'realtime', 'Transfer Return Reminder', 
 'Return to {{originalLocationName}} in {{daysRemaining}} days', 
 '["originalLocationName", "daysRemaining"]'),

-- HR notification for transfer activities
('transfer_hr_notification_email', 'email', 'Location Transfer Activity Summary', 
 'Hello HR Team,\n\nLocation transfer activity summary:\n\nEmployee: {{employeeName}} ({{employeeEmail}})\nAction: {{action}}\nFrom Location: {{fromLocation}}\nTo Location: {{toLocation}}\nEffective Date: {{effectiveDate}}\nApproved by: {{approverName}}\nTransfer Type: {{transferType}}\n\nPlease update employee records accordingly.\n\nBest regards,\nAttendance System', 
 '["employeeName", "employeeEmail", "action", "fromLocation", "toLocation", "effectiveDate", "approverName", "transferType"]')

ON CONFLICT (name, type) DO NOTHING;

-- Add location transfer notification preferences to existing users
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS location_transfer_requests BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS location_transfer_approvals BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS location_transfer_reminders BOOLEAN DEFAULT true;

-- Update existing users with default transfer notification preferences
UPDATE notification_preferences 
SET 
    location_transfer_requests = true,
    location_transfer_approvals = true,
    location_transfer_reminders = true
WHERE 
    location_transfer_requests IS NULL 
    OR location_transfer_approvals IS NULL 
    OR location_transfer_reminders IS NULL;