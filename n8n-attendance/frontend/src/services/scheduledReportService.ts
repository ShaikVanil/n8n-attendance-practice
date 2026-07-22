import api from './api';

export interface ScheduledReport {
  id: string;
  name: string;
  description?: string;
  report_type: 'attendance' | 'team_summary' | 'statistics';
  schedule_cron: string;
  filters: any;
  recipients: string[];
  format: 'pdf' | 'csv' | 'excel';
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
}

export interface CreateScheduledReportRequest {
  name: string;
  description?: string;
  report_type: 'attendance' | 'team_summary' | 'statistics';
  schedule_cron: string;
  filters: any;
  recipients: string[];
  format: 'pdf' | 'csv' | 'excel';
}

class ScheduledReportService {
  async getScheduledReports(): Promise<ScheduledReport[]> {
    const response = await api.get('/scheduled-reports');
    return response.data;
  }

  async createScheduledReport(data: CreateScheduledReportRequest): Promise<ScheduledReport> {
    const response = await api.post('/scheduled-reports', data);
    return response.data;
  }

  async updateScheduledReport(id: string, data: Partial<ScheduledReport>): Promise<ScheduledReport> {
    const response = await api.put(`/scheduled-reports/${id}`, data);
    return response.data;
  }

  async deleteScheduledReport(id: string): Promise<void> {
    await api.delete(`/scheduled-reports/${id}`);
  }

  async executeReport(id: string): Promise<void> {
    await api.post(`/scheduled-reports/${id}/execute`);
  }
}

export const scheduledReportService = new ScheduledReportService();