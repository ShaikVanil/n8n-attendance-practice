import api from './api';
import { 
  DailyTimesheet, 
  DailyTimesheetFormData, 
  DailyTimesheetSummary,
  DailyTimesheetReviewResponse,
  CreateDailyTimesheetRequest,
  UpdateDailyTimesheetRequest
} from '../types/timesheet';

class DailyTimesheetService {
  async getDailyTimesheets(filters?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await api.get(`/daily-timesheets?${params}`);
    return response.data;
  }

  async getDailyTimesheetsByDate(date: string): Promise<DailyTimesheet[]> {
    const response = await api.get(`/daily-timesheets/by-date/${date}`);
    return response.data;
  }

  async getDailySummary(date: string): Promise<DailyTimesheetSummary> {
    const response = await api.get(`/daily-timesheets/summary/${date}`);
    return response.data;
  }

  async createDailyTimesheet(data: CreateDailyTimesheetRequest): Promise<DailyTimesheet> {
    const response = await api.post('/daily-timesheets', data);
    return response.data;
  }

  async updateDailyTimesheet(id: string, data: Partial<UpdateDailyTimesheetRequest>): Promise<DailyTimesheet> {
    const response = await api.put(`/daily-timesheets/${id}`, data);
    return response.data;
  }

  // Add single timesheet submit method
  async submitDailyTimesheet(id: string): Promise<void> {
    await api.post(`/daily-timesheets/${id}/submit`);
  }

  // Update to accept date and get timesheet IDs
  async submitDailyTimesheets(date: string): Promise<void> {
    const timesheets = await this.getDailyTimesheetsByDate(date);
    const draftIds = timesheets
      .filter(t => t.status === 'draft')
      .map(t => t.id);
    
    if (draftIds.length > 0) {
      await api.post('/daily-timesheets/submit-multiple', { ids: draftIds });
    }
  }

  async deleteDailyTimesheet(id: string): Promise<void> {
    await api.delete(`/daily-timesheets/${id}`);
  }

  // Utility functions
  calculateWorkHours(startTime: string, endTime: string, breakDuration: number = 0): number {
    if (!startTime || !endTime) return 0;
    
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    
    const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    const workMinutes = Math.max(0, totalMinutes - breakDuration);
    
    return Math.round((workMinutes / 60) * 100) / 100;
  }

  calculateTotalHours(timesheets: DailyTimesheet[]): number {
    return timesheets.reduce((total, timesheet) => total + timesheet.workHours, 0);
  }

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  formatTime(time: string): string {
    return new Date(`2000-01-01T${time}:00`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  // Add method for getting timesheets for review
  async getDailyTimesheetsForReview(filters?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<DailyTimesheetReviewResponse> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await api.get(`/daily-timesheets/review?${params.toString()}`);
    return response.data;
  }

  // Add method for approving daily timesheet
  async approveDailyTimesheet(id: string): Promise<void> {
    await api.post(`/daily-timesheets/${id}/approve`);
  }

  // Add method for rejecting daily timesheet
  async rejectDailyTimesheet(id: string, reason: string): Promise<void> {
    await api.post(`/daily-timesheets/${id}/reject`, { reason });
  }
}

export const dailyTimesheetService = new DailyTimesheetService();