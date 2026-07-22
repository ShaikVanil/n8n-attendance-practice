// Timezone-aware date utilities
import { format, toZonedTime } from 'date-fns-tz';

// Get the configured office timezone (this should come from your office configuration)
export const getOfficeTimezone = (): string => {
  // This should be fetched from your office configuration
  // For now, we'll use a default or get it from localStorage/context
  return localStorage.getItem('officeTimezone') || 'UTC';
};

// Format time in office timezone
export const formatTimeInOfficeTimezone = (dateString: string, timeFormat: string = 'HH:mm'): string => {
  const date = new Date(dateString);
  const timezone = getOfficeTimezone();
  const zonedDate = toZonedTime(date, timezone);
  return format(zonedDate, timeFormat, { timeZone: timezone });
};

// Format date in office timezone
export const formatDateInOfficeTimezone = (dateString: string, dateFormat: string = 'EEE, MMM d, yyyy'): string => {
  const date = new Date(dateString);
  const timezone = getOfficeTimezone();
  const zonedDate = toZonedTime(date, timezone);
  return format(zonedDate, dateFormat, { timeZone: timezone });
};

// Format full datetime in office timezone
export const formatDateTimeInOfficeTimezone = (dateString: string, dateTimeFormat: string = 'MMM d, yyyy HH:mm'): string => {
  const date = new Date(dateString);
  const timezone = getOfficeTimezone();
  const zonedDate = toZonedTime(date, timezone);
  return format(zonedDate, dateTimeFormat, { timeZone: timezone });
};

// Get current time in office timezone
export const getCurrentTimeInOfficeTimezone = (timeFormat: string = 'HH:mm:ss'): string => {
  const now = new Date();
  const timezone = getOfficeTimezone();
  const zonedDate = toZonedTime(now, timezone);
  return format(zonedDate, timeFormat, { timeZone: timezone });
};

// Convert UTC time to office timezone
export const convertUTCToOfficeTime = (utcDateString: string): Date => {
  const utcDate = new Date(utcDateString);
  const timezone = getOfficeTimezone();
  return toZonedTime(utcDate, timezone);
};

// Set office timezone in localStorage
export const setOfficeTimezone = (timezone: string): void => {
  localStorage.setItem('officeTimezone', timezone);
};