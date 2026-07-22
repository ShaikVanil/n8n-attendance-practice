export interface Attendance {
  id: string;
  user_id: string;
  device_id?: string;
  check_in_time?: Date;
  check_out_time?: Date;
  check_in_type: 'automatic' | 'manual';
  check_out_type: 'automatic' | 'manual';
  check_in_location?: string;
  check_out_location?: string;
  // GPS coordinates for check-in/check-out
  check_in_latitude?: number;
  check_in_longitude?: number;
  check_out_latitude?: number;
  check_out_longitude?: number;
  notes?: string;
  total_hours?: number;
  date: string; // YYYY-MM-DD format
  status: 'active' | 'completed';
  // Manual override fields
  is_manual_override: boolean;
  override_reason?: string;
  auto_checkin_failed: boolean;
  auto_checkin_failure_reason?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CheckInRequest {
  type: 'automatic' | 'manual';
  device_id?: string;
  location?: string;
  // GPS coordinates
  latitude?: number;
  longitude?: number;
  notes?: string;
  // Manual override fields
  is_manual_override?: boolean;
  override_reason?: string;
  auto_failure_reason?: string;
}

export interface CheckOutRequest {
  type: 'automatic' | 'manual';
  device_id?: string;
  location?: string;
  // GPS coordinates
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface ManualOverrideRequest {
  reason: string;
  auto_failure_reason?: string;
  location?: string;
  notes?: string;
}

export interface AttendanceStatus {
  is_checked_in: boolean;
  current_session?: Attendance;
  today_total_hours?: number;
  remaining_hours?: number;
  current_break?: Break;
  today_breaks?: Break[];
}

// Break-related interfaces
export interface Break {
  id: string;
  user_id: string;
  attendance_id: string;
  break_type: 'lunch' | 'short' | 'personal';
  start_time: Date;
  end_time?: Date;
  duration_minutes?: number;
  status: 'active' | 'completed';
  notes?: string;
  date: string; // YYYY-MM-DD format
  created_at: Date;
  updated_at: Date;
}

export interface StartBreakRequest {
  break_type: 'lunch' | 'short' | 'personal';
  notes?: string;
}

export interface EndBreakRequest {
  notes?: string;
}

export interface BreakPolicy {
  id: string;
  office_id?: string;
  break_type: 'lunch' | 'short' | 'personal';
  max_duration_minutes: number;
  max_breaks_per_day: number;
  is_mandatory: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface BreakValidationResult {
  is_valid: boolean;
  error_message?: string;
  remaining_break_time?: number;
  breaks_used_today?: number;
}