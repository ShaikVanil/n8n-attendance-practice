export interface NotificationPreferences {
  id: string;
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  realTimeEnabled: boolean;
  checkInConfirmation: boolean;
  checkOutConfirmation: boolean;
  autoCheckInFailure: boolean;
  policyViolations: boolean;
  deviceApproval: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'realtime';
  subject?: string;
  content: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationHistory {
  id: string;
  userId: string;
  type: 'email' | 'sms' | 'realtime';
  templateId: string;
  subject?: string;
  content: string;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  sentAt?: Date;
  deliveredAt?: Date;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface NotificationRequest {
  userId: string;
  type: 
    | 'auto_checkin_success' 
    | 'auto_checkin_failed' 
    | 'auto_checkin_failed_with_fallback' 
    | 'manual_checkin' 
    | 'checkout' 
    | 'device_approved' 
    | 'device_rejected' 
    | 'device_registration_request' 
    | 'policy_violation' 
    | 'policy_warning' 
    | 'policy_escalation' 
    | 'grace_period_applied' 
    | 'manual_override_success' 
    | 'manual_override_admin_alert' 
    | 'pending_override_request' 
    | 'scheduled_report'
    | 'leave_request_submitted'
    | 'leave_request_approved'
    | 'leave_request_rejected'
    | 'transfer_request_submitted'
    | 'transfer_request_approved'
    | 'transfer_request_rejected'
    | 'transfer_effective'
    | 'transfer_reminder'
    | 'transfer_hr_notification'
    | 'delegation_assigned'
    | 'delegation_removed'
    | 'delegation_created'
    | 'delegation_deactivated';
  title: string;
  message: string;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
  channels?: ('email' | 'sms' | 'realtime')[];
  priority?: 'low' | 'medium' | 'high';
}

export interface EmailConfig {
  provider: 'sendgrid' | 'ses' | 'smtp';
  apiKey?: string;
  fromEmail: string;
  fromName: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
}

export interface SMSConfig {
  provider: 'twilio' | 'aws_sns';
  accountSid?: string;
  authToken?: string;
  fromNumber: string;
  region?: string;
}