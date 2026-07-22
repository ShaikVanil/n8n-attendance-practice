import api from './api';
import {
  Timesheet,
  TimesheetEntry,
  CreateTimesheetRequest,
  UpdateTimesheetRequest,
  TimesheetFilters,
  TimesheetListResponse
} from '../types/timesheet';

class TimesheetService {
  async getTimesheets(filters?: TimesheetFilters): Promise<TimesheetListResponse> {
    const params = new URLSearchParams();
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.weekStartDate) params.append('weekStartDate', filters.weekStartDate);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    
    const response = await api.get(`/timesheets?${params.toString()}`);
    return response.data;
  }

  async getTimesheetById(id: string): Promise<Timesheet> {
    const response = await api.get(`/timesheets/${id}`);
    return response.data;
  }

  async createTimesheet(data: CreateTimesheetRequest): Promise<Timesheet> {
    const response = await api.post('/timesheets', data);
    return response.data;
  }

  async updateTimesheet(id: string, data: UpdateTimesheetRequest): Promise<Timesheet> {
    const response = await api.put(`/timesheets/${id}`, data);
    return response.data;
  }

  async deleteTimesheet(id: string): Promise<void> {
    await api.delete(`/timesheets/${id}`);
  }

  async submitTimesheet(id: string): Promise<Timesheet> {
    const response = await api.post(`/timesheets/${id}/submit`);
    return response.data;
  }

  // Manager functions
  async getPendingTimesheets(): Promise<TimesheetListResponse> {
    const response = await api.get('/timesheets/manager/pending');
    return response.data;
  }

  async approveTimesheet(id: string, comments?: string): Promise<Timesheet> {
    const response = await api.post(`/timesheets/${id}/approve`, { comments });
    return response.data;
  }

  async rejectTimesheet(id: string, reason: string): Promise<Timesheet> {
    const response = await api.post(`/timesheets/${id}/reject`, { reason });
    return response.data;
  }

  // Utility functions
  getWeekStartDate(date: Date = new Date()): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  }

  getWeekEndDate(weekStartDate: string): string {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
  }

  getWeekDates(weekStartDate: string): string[] {
    const dates: string[] = [];
    const startDate = new Date(weekStartDate);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
  }

  formatTime(timeString: string): string {
    if (!timeString) return '';
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }

  calculateWorkHours(startTime: string, endTime: string, breakDuration: number = 0): number {
    if (!startTime || !endTime) return 0;
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const breakHours = breakDuration / 60;
    
    return Math.max(0, diffHours - breakHours);
  }

  // Timesheet Entry Operations
  async createTimesheetEntry(timesheetId: string, entryData: Partial<TimesheetEntry>): Promise<TimesheetEntry> {
    const response = await api.post(`/timesheets/${timesheetId}/entries`, entryData);
    return response.data;
  }

  async updateTimesheetEntry(timesheetId: string, entryId: string, entryData: Partial<TimesheetEntry>): Promise<TimesheetEntry> {
    const response = await api.put(`/timesheets/${timesheetId}/entries/${entryId}`, entryData);
    return response.data;
  }

  async deleteTimesheetEntry(timesheetId: string, entryId: string): Promise<void> {
    await api.delete(`/timesheets/${timesheetId}/entries/${entryId}`);
  }

  async getTimesheetEntries(timesheetId: string): Promise<TimesheetEntry[]> {
    const response = await api.get(`/timesheets/${timesheetId}/entries`);
    return response.data;
  }

  // Auto-populate from attendance data
  async autoPopulateFromAttendance(timesheetId: string, weekStartDate: string): Promise<Timesheet> {
    const response = await api.post(`/timesheets/${timesheetId}/auto-populate`, { weekStartDate });
    return response.data;
  }
}

export const timesheetService = new TimesheetService();