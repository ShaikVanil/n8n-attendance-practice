-- Location Transfer Notification Templates Migration
-- Add notification templates for location transfer management

-- Insert location transfer notification templates
INSERT INTO notification_templates (name, type, subject, content, variables) VALUES

-- Transfer request submitted notifications
('transfer_request_submitted_email', 'email', 'Location Transfer Request Submitted - {{targetLocationName}}', 
 'Hello {{employeeName}},

Your location transfer request has been submitted successfully.

Details:
- Target Location: {{targetLocationName}}
- Requested Date: {{requestedDate}}
- Reason: {{reason}}
- Request Type: {{transferType}}
- Status: Pending Approval

Your manager will review this request and you will be notified of the decision.

Best regards,
Attendance System', 
 '[
"employeeName", "targetLocationName", "requestedDate", "reason", "transferType"]'),

('transfer_request_submitted_realtime', 'realtime', 'Transfer Request Submitted', 
 'Your transfer request to {{targetLocationName}} has been submitted for approval', 
 '["targetLocationName"]'),

-- Manager notification for new transfer request
('transfer_request_manager_email', 'email', 'New Location Transfer Request - {{employeeName}}', 
 'Hello {{managerName}},

A new location transfer request requires your approval.

Employee Details:
- Name: {{employeeName}} ({{employeeEmail}})
- Current Location: {{currentLocationName}}
- Target Location: {{targetLocationName}}
- Requested Date: {{requestedDate}}
- Reason: {{reason}}
- Transfer Type: {{transferType}}

Please review this request in your manager dashboard.

Best regards,
Attendance System', 
 '["managerName", "employeeName", "employeeEmail", "currentLocationName", "targetLocationName", "requestedDate", "reason", "transferType"]'),

('transfer_request_manager_realtime', 'realtime', 'New Transfer Request', 
 'Transfer request from {{employeeName}} to {{targetLocationName}} requires approval', 
 '["employeeName", "targetLocationName"]'),

-- Transfer request approved notifications
('transfer_request_approved_email', 'email', 'Location Transfer Request Approved - {{targetLocationName}}', 
 'Hello {{employeeName}},

Great news! Your location transfer request has been approved.

Details:
- Target Location: {{targetLocationName}}
- Effective Date: {{effectiveDate}}
- Transfer Type: {{transferType}}
- Approved by: {{approverName}}
- Comments: {{comments}}

Your location assignment will be updated on the effective date.

Best regards,
Attendance System', 
 '["employeeName", "targetLocationName", "effectiveDate", "transferType", "approverName", "comments"]'),

('transfer_request_approved_sms', 'sms', NULL, 
 'Transfer to {{targetLocationName}} approved. Effective: {{effectiveDate}}', 
 '["targetLocationName", "effectiveDate"]'),

('transfer_request_approved_realtime', 'realtime', 'Transfer Request Approved', 
 'Your transfer request to {{targetLocationName}} has been approved', 
 '["targetLocationName"]'),

-- Transfer request rejected notifications
('transfer_request_rejected_email', 'email', 'Location Transfer Request Declined - {{targetLocationName}}', 
 'Hello {{employeeName}},

We regret to inform you that your location transfer request has been declined.

Details:
- Target Location: {{targetLocationName}}
- Requested Date: {{requestedDate}}
- Declined by: {{declinedBy}}
- Reason: {{declineReason}}

If you have questions about this decision, please contact your manager.

Best regards,
Attendance System', 
 '["employeeName", "targetLocationName", "requestedDate", "declinedBy", "declineReason"]'),

('transfer_request_rejected_sms', 'sms', NULL, 
 'Transfer request to {{targetLocationName}} declined. Contact manager for details.', 
 '["targetLocationName"]'),

('transfer_request_rejected_realtime', 'realtime', 'Transfer Request Declined', 
 'Your transfer request to {{targetLocationName}} has been declined', 
 '["targetLocationName"]'),

-- Transfer effective notifications
('transfer_effective_email', 'email', 'Location Transfer Now Active - {{newLocationName}}', 
 'Hello {{employeeName}},

Your location transfer is now effective.

Details:
- Previous Location: {{previousLocationName}}
- New Location: {{newLocationName}}
- Effective Date: {{effectiveDate}}
- Transfer Type: {{transferType}}

Your attendance tracking will now be associated with your new location. Please ensure you are familiar with the new location''s policies and procedures.

Best regards,
Attendance System', 
 '["employeeName", "previousLocationName", "newLocationName", "effectiveDate", "transferType"]'),

('transfer_effective_realtime', 'realtime', 'Transfer Now Active', 
 'You are now assigned to {{newLocationName}}', 
 '["newLocationName"]'),

-- Transfer reminder notifications (for temporary transfers)
('transfer_reminder_email', 'email', 'Transfer Reminder - Return to {{originalLocationName}}', 
 'Hello {{employeeName}},

This is a reminder about your temporary location transfer.

Details:
- Current Location: {{currentLocationName}}
- Original Location: {{originalLocationName}}
- Return Date: {{returnDate}}
- Days Remaining: {{daysRemaining}}

Please prepare for your return to the original location.

Best regards,
Attendance System', 
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