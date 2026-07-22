import api from './api';
import { Break, StartBreakRequest, EndBreakRequest, BreakHistory } from '../types/attendance';

interface BreakHistoryParams {
  limit?: number;
  offset?: number;
  start_date?: string;
  end_date?: string;
}

class BreakService {
  async startBreak(request: StartBreakRequest): Promise<Break> {
    const response = await api.post('/breaks/start', request);
    return response.data;
  }

  async endBreak(request: EndBreakRequest): Promise<Break> {
    const response = await api.post('/breaks/end', request);
    return response.data;
  }

  async getCurrentBreak(): Promise<Break | null> {
    const response = await api.get('/breaks/current');
    return response.data;
  }

  async getBreakHistory(params: BreakHistoryParams = {}): Promise<BreakHistory> {
    const response = await api.get('/breaks/history', {
      params
    });
    return response.data;
  }

  async getBreakStats(startDate?: string, endDate?: string): Promise<any> {
    const response = await api.get('/breaks/stats', {
      params: { startDate, endDate }
    });
    return response.data;
  }
}

export const breakService = new BreakService();