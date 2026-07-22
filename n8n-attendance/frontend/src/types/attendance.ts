export interface Attendance {
  id: string;
  userId: string;
  deviceId?: string;
  checkInTime: string;
  checkOutTime?: string;
  checkInType: 'automatic' | 'manual';
  checkOutType?: 'automatic' | 'manual';
  checkInLocation?: string;
  checkOutLocation?: string;
  notes?: string;
  totalHours?: number;
  total_hours?: number; // Backend returns this field
  date: string;
  status: 'checked_in' | 'checked_out';
  createdAt: string;
  updatedAt: string;
  breaks?: Break[]; // Add breaks property
}

export interface CheckInRequest {
  checkInType: 'manual' | 'automatic';
  deviceId?: string;
  notes?: string;
  location?: string; // office_id
  latitude?: number;
  longitude?: number;
  // New properties for fallback mode
  isFallbackMode?: boolean;
  fallbackReason?: string;
}

export interface CheckOutRequest {
  checkOutType: 'automatic' | 'manual';
  checkOutLocation?: string;
  notes?: string;
  // Add missing location properties
  latitude?: number;
  longitude?: number;
  timestamp?: string;
}

// Add overtime-related interfaces
export interface OvertimeStatus {
  is_overtime: boolean;
  overtime_hours: number;
  overtime_threshold: number;
  overtime_multiplier: number;
  overtime_pay_amount?: number;
  overtime_start_time?: string;
}

export interface OvertimeLimitCheck {
  is_within_limit: boolean;
  current_overtime_hours: number;
  max_overtime_hours: number;
  remaining_overtime_hours: number;
  warning_threshold_reached: boolean;
}

export interface AttendanceStatus {
  is_checked_in: boolean;
  current_session?: Attendance;
  today_total_hours?: number;
  remaining_hours?: number;
  current_break?: Break;
  today_breaks?: Break[];
  // Add overtime information
  overtime_status?: OvertimeStatus;
  overtime_limit_check?: OvertimeLimitCheck;
}

export interface AttendanceHistoryParams {
  startDate?: string;
  endDate?: string;
  status_filter?: 'present' | 'absent' | 'partial';
  limit?: number;
  offset?: number;
}

export interface AttendanceHistoryResponse {
  attendance: Attendance[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Overtime history and stats interfaces
export interface OvertimeRecord {
  id: string;
  user_id: string;
  date: string;
  overtime_hours: number;
  overtime_pay_amount: number;
  overtime_threshold: number;
  overtime_multiplier: number;
  created_at: string;
}

export interface OvertimeHistoryResponse {
  overtime_records: OvertimeRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface OvertimeStats {
  total_overtime_hours: number;
  total_overtime_pay: number;
  average_daily_overtime: number;
  days_with_overtime: number;
  max_daily_overtime: number;
  period_start: string;
  period_end: string;
}

// Break-related types
export interface Break {
  id: string;
  user_id: string;
  attendance_id: string;
  break_type: 'lunch' | 'short' | 'personal';
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
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
  break_type: string;
  max_duration_minutes: number;
  applies_to_role?: string;
  created_at: string;
  updated_at: string;
}

export interface BreakHistory {
  breaks: Break[];
}