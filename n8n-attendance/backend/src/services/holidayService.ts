import { Pool } from 'pg';
import pool from '../config/database';

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
}

export interface HolidayCalendarConfig {
  id: string;
  office_location: string;
  country_code?: string;
  region_code?: string;
  auto_import_enabled: boolean;
  last_import_date?: string;
  created_at: string;
  updated_at: string;
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

class HolidayService {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  // Get holidays with filters
  async getHolidays(filters: HolidayFilters = {}): Promise<CompanyHoliday[]> {
    let query = `
      SELECT * FROM company_holidays 
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;

    if (filters.year) {
      paramCount++;
      query += ` AND EXTRACT(YEAR FROM date) = $${paramCount}`;
      params.push(filters.year);
    }

    if (filters.month) {
      paramCount++;
      query += ` AND EXTRACT(MONTH FROM date) = $${paramCount}`;
      params.push(filters.month);
    }

    if (filters.type) {
      paramCount++;
      query += ` AND type = $${paramCount}`;
      params.push(filters.type);
    }

    if (filters.office_location) {
      paramCount++;
      query += ` AND (office_location = $${paramCount} OR office_location IS NULL)`;
      params.push(filters.office_location);
    }

    if (filters.is_active !== undefined) {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      params.push(filters.is_active);
    }

    query += ` ORDER BY date ASC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // Get holidays for a specific date range
  async getHolidaysInRange(startDate: string, endDate: string, officeLocation?: string): Promise<CompanyHoliday[]> {
    let query = `
      SELECT * FROM company_holidays 
      WHERE date >= $1 AND date <= $2 AND is_active = true
    `;
    const params: any[] = [startDate, endDate];

    if (officeLocation) {
      query += ` AND (office_location = $3 OR office_location IS NULL)`;
      params.push(officeLocation);
    }

    query += ` ORDER BY date ASC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // Create a new holiday
  async createHoliday(holidayData: CreateHolidayRequest, createdBy: string): Promise<CompanyHoliday> {
    const query = `
      INSERT INTO company_holidays (
        name, date, type, description, is_recurring, 
        recurrence_pattern, office_location, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const params = [
      holidayData.name,
      holidayData.date,
      holidayData.type,
      holidayData.description || null,
      holidayData.is_recurring || false,
      holidayData.recurrence_pattern || null,
      holidayData.office_location || null,
      createdBy
    ];

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  // Update a holiday
  async updateHoliday(holidayId: string, updateData: UpdateHolidayRequest): Promise<CompanyHoliday> {
    const setClause: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        setClause.push(`${key} = $${paramCount}`);
        params.push(value);
      }
    });

    if (setClause.length === 0) {
      throw new Error('No fields to update');
    }

    paramCount++;
    setClause.push(`updated_at = $${paramCount}`);
    params.push(new Date());

    paramCount++;
    const query = `
      UPDATE company_holidays 
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    params.push(holidayId);

    const result = await this.pool.query(query, params);
    if (result.rows.length === 0) {
      throw new Error('Holiday not found');
    }
    return result.rows[0];
  }

  // Delete a holiday
  async deleteHoliday(holidayId: string): Promise<void> {
    const query = 'DELETE FROM company_holidays WHERE id = $1';
    const result = await this.pool.query(query, [holidayId]);
    
    if (result.rowCount === 0) {
      throw new Error('Holiday not found');
    }
  }

  // Check if a date is a holiday
  async isHoliday(date: string, officeLocation?: string): Promise<{ isHoliday: boolean; holidays: CompanyHoliday[] }> {
    let query = `
      SELECT * FROM company_holidays 
      WHERE date = $1 AND is_active = true
    `;
    const params: any[] = [date];

    if (officeLocation) {
      query += ` AND (office_location = $2 OR office_location IS NULL)`;
      params.push(officeLocation);
    }

    const result = await this.pool.query(query, params);
    return {
      isHoliday: result.rows.length > 0,
      holidays: result.rows
    };
  }

  // Get upcoming holidays
  async getUpcomingHolidays(days: number = 30, officeLocation?: string): Promise<CompanyHoliday[]> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return this.getHolidaysInRange(
      new Date().toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
      officeLocation
    );
  }

  // Holiday observance management
  async setHolidayObservance(holidayId: string, userId: string, isObserved: boolean, notes?: string): Promise<HolidayObservance> {
    const query = `
      INSERT INTO holiday_observances (holiday_id, user_id, is_observed, notes)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (holiday_id, user_id) 
      DO UPDATE SET is_observed = $3, notes = $4
      RETURNING *
    `;

    const result = await this.pool.query(query, [holidayId, userId, isObserved, notes || null]);
    return result.rows[0];
  }

  // Get user's holiday observances
  async getUserHolidayObservances(userId: string, year?: number): Promise<(HolidayObservance & { holiday: CompanyHoliday })[]> {
    let query = `
      SELECT ho.*, ch.* as holiday
      FROM holiday_observances ho
      JOIN company_holidays ch ON ho.holiday_id = ch.id
      WHERE ho.user_id = $1
    `;
    const params: any[] = [userId];

    if (year) {
      query += ` AND EXTRACT(YEAR FROM ch.date) = $2`;
      params.push(year);
    }

    query += ` ORDER BY ch.date ASC`;

    const result = await this.pool.query(query, params);
    return result.rows.map(row => ({
      id: row.id,
      holiday_id: row.holiday_id,
      user_id: row.user_id,
      is_observed: row.is_observed,
      notes: row.notes,
      created_at: row.created_at,
      holiday: {
        id: row.holiday_id,
        name: row.name,
        date: row.date,
        type: row.type,
        description: row.description,
        is_recurring: row.is_recurring,
        recurrence_pattern: row.recurrence_pattern,
        office_location: row.office_location,
        is_active: row.is_active,
        created_by: row.created_by,
        created_at: row.holiday_created_at,
        updated_at: row.holiday_updated_at
      }
    }));
  }

  // Generate recurring holidays for next year
  async generateRecurringHolidays(year: number): Promise<CompanyHoliday[]> {
    const recurringHolidays = await this.pool.query(
      'SELECT * FROM company_holidays WHERE is_recurring = true AND is_active = true'
    );

    const newHolidays: CompanyHoliday[] = [];

    for (const holiday of recurringHolidays.rows) {
      if (holiday.recurrence_pattern === 'yearly') {
        const originalDate = new Date(holiday.date);
        const newDate = new Date(year, originalDate.getMonth(), originalDate.getDate());
        
        // Check if holiday already exists for this year
        const existingHoliday = await this.pool.query(
          'SELECT id FROM company_holidays WHERE name = $1 AND date = $2',
          [holiday.name, newDate.toISOString().split('T')[0]]
        );

        if (existingHoliday.rows.length === 0) {
          const newHoliday = await this.createHoliday({
            name: holiday.name,
            date: newDate.toISOString().split('T')[0],
            type: holiday.type,
            description: holiday.description,
            is_recurring: true,
            recurrence_pattern: holiday.recurrence_pattern,
            office_location: holiday.office_location
          }, holiday.created_by);
          
          newHolidays.push(newHoliday);
        }
      }
    }

    return newHolidays;
  }

  // Get holiday statistics
  async getHolidayStatistics(year: number, officeLocation?: string): Promise<{
    totalHolidays: number;
    publicHolidays: number;
    companyHolidays: number;
    optionalHolidays: number;
    upcomingHolidays: number;
  }> {
    let query = `
      SELECT 
        COUNT(*) as total_holidays,
        COUNT(CASE WHEN type = 'public' THEN 1 END) as public_holidays,
        COUNT(CASE WHEN type = 'company' THEN 1 END) as company_holidays,
        COUNT(CASE WHEN type = 'optional' THEN 1 END) as optional_holidays,
        COUNT(CASE WHEN date > CURRENT_DATE THEN 1 END) as upcoming_holidays
      FROM company_holidays 
      WHERE EXTRACT(YEAR FROM date) = $1 AND is_active = true
    `;
    const params: any[] = [year];

    if (officeLocation) {
      query += ` AND (office_location = $2 OR office_location IS NULL)`;
      params.push(officeLocation);
    }

    const result = await this.pool.query(query, params);
    const stats = result.rows[0];

    return {
      totalHolidays: parseInt(stats.total_holidays),
      publicHolidays: parseInt(stats.public_holidays),
      companyHolidays: parseInt(stats.company_holidays),
      optionalHolidays: parseInt(stats.optional_holidays),
      upcomingHolidays: parseInt(stats.upcoming_holidays)
    };
  }
}

export const holidayService = new HolidayService();