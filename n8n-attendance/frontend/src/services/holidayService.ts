import api from './api';

export interface CompanyHoliday {
  id: string;
  name: string;
  date: string;
  type: 'public' | 'company' | 'floating' | 'optional';
  description?: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  office_location?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface HolidayObservance {
  id: string;
  holiday_id: string;
  user_id: string;
  is_observed: boolean;
  notes?: string;
  created_at: string;
  holiday: CompanyHoliday;
}

export interface CreateHolidayRequest {
  name: string;
  date: string;
  type: 'public' | 'company' | 'floating' | 'optional';
  description?: string;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  office_location?: string;
}

export interface UpdateHolidayRequest {
  name?: string;
  date?: string;
  type?: 'public' | 'company' | 'floating' | 'optional';
  description?: string;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  office_location?: string;
  is_active?: boolean;
}

export interface HolidayFilters {
  year?: number;
  month?: number;
  type?: string;
  office_location?: string;
  is_active?: boolean;
}

export interface HolidayStatistics {
  totalHolidays: number;
  publicHolidays: number;
  companyHolidays: number;
  optionalHolidays: number;
  upcomingHolidays: number;
}

export class HolidayService {
  // Get holidays with filters
  static async getHolidays(filters: HolidayFilters = {}): Promise<{ holidays: CompanyHoliday[] }> {
    const response = await api.get('/holidays', { params: filters });
    return response.data;
  }

  // Get holidays in date range
  static async getHolidaysInRange(
    startDate: string, 
    endDate: string, 
    officeLocation?: string
  ): Promise<{ holidays: CompanyHoliday[] }> {
    const params: any = { start_date: startDate, end_date: endDate };
    if (officeLocation) params.office_location = officeLocation;
    
    const response = await api.get('/holidays/range', { params });
    return response.data;
  }

  // Get upcoming holidays
  static async getUpcomingHolidays(
    days: number = 30, 
    officeLocation?: string
  ): Promise<{ holidays: CompanyHoliday[] }> {
    const params: any = { days };
    if (officeLocation) params.office_location = officeLocation;
    
    const response = await api.get('/holidays/upcoming', { params });
    return response.data;
  }

  // Check if a date is a holiday
  static async isHoliday(
    date: string, 
    officeLocation?: string
  ): Promise<{ isHoliday: boolean; holidays: CompanyHoliday[] }> {
    const params: any = {};
    if (officeLocation) params.office_location = officeLocation;
    
    const response = await api.get(`/holidays/check/${date}`, { params });
    return response.data;
  }

  // Get holiday statistics
  static async getHolidayStatistics(
    year?: number, 
    officeLocation?: string
  ): Promise<{ statistics: HolidayStatistics }> {
    const params: any = {};
    if (year) params.year = year;
    if (officeLocation) params.office_location = officeLocation;
    
    const response = await api.get('/holidays/statistics', { params });
    return response.data;
  }

  // Admin methods
  // Create a new holiday
  static async createHoliday(holidayData: CreateHolidayRequest): Promise<{ holiday: CompanyHoliday }> {
    const response = await api.post('/holidays', holidayData);
    return response.data;
  }

  // Update a holiday
  static async updateHoliday(
    holidayId: string, 
    updateData: UpdateHolidayRequest
  ): Promise<{ holiday: CompanyHoliday }> {
    const response = await api.put(`/holidays/${holidayId}`, updateData);
    return response.data;
  }

  // Delete a holiday
  static async deleteHoliday(holidayId: string): Promise<{ message: string }> {
    const response = await api.delete(`/holidays/${holidayId}`);
    return response.data;
  }

  // Generate recurring holidays
  static async generateRecurringHolidays(
    year: number
  ): Promise<{ message: string; holidays: CompanyHoliday[] }> {
    const response = await api.post(`/holidays/generate-recurring/${year}`);
    return response.data;
  }

  // Holiday observance methods
  // Set holiday observance
  static async setHolidayObservance(
    holidayId: string, 
    isObserved: boolean, 
    notes?: string
  ): Promise<{ observance: HolidayObservance }> {
    const response = await api.post(`/holidays/${holidayId}/observance`, {
      is_observed: isObserved,
      notes
    });
    return response.data;
  }

  // Get user's holiday observances
  static async getUserHolidayObservances(
    year?: number
  ): Promise<{ observances: HolidayObservance[] }> {
    const params: any = {};
    if (year) params.year = year;
    
    const response = await api.get('/holidays/observances/my', { params });
    return response.data;
  }
}

export const holidayService = HolidayService;