import { Pool } from 'pg';

interface AttendanceRecord {
  id: string;
  user_id: string;
  check_in_time: Date | null;
  check_out_time: Date | null;
  check_in_location: string | null;
  check_out_location: string | null;
  total_hours: number;
  status: string;
  date: string;
}

interface ConsolidatedAttendance {
  user_id: string;
  total_hours: number;
  status: 'present' | 'absent' | 'late' | 'partial';
  first_check_in: Date | null;
  last_check_out: Date | null;
  location: string;
  sessions: AttendanceSession[];
  has_overlaps: boolean;
  has_duplicates: boolean;
  has_unclosed_session: boolean;
}

interface AttendanceSession {
  check_in_time: Date | null;
  check_out_time: Date | null;
  duration_hours: number;
  location: string;
  is_duplicate: boolean;
  overlaps_with: string[];
}

class AttendanceConsolidationService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Consolidate all attendance records for users on a specific date
   */
  async consolidateAttendanceForDate(
    userIds: string[], 
    date: string
  ): Promise<Map<string, ConsolidatedAttendance>> {
    // Get all attendance records for the users on the specified date
    const query = `
      SELECT 
        id,
        user_id,
        check_in_time,
        check_out_time,
        check_in_location,
        check_out_location,
        total_hours,
        status,
        date
      FROM attendance 
      WHERE user_id = ANY($1::uuid[]) 
        AND date = $2
      ORDER BY user_id, check_in_time ASC NULLS LAST
    `;

    const result = await this.pool.query(query, [userIds, date]);
    const records = result.rows as AttendanceRecord[];

    // Group records by user_id
    const userRecords = new Map<string, AttendanceRecord[]>();
    records.forEach(record => {
      if (!userRecords.has(record.user_id)) {
        userRecords.set(record.user_id, []);
      }
      userRecords.get(record.user_id)!.push(record);
    });

    // Consolidate records for each user
    const consolidatedData = new Map<string, ConsolidatedAttendance>();
    
    for (const userId of userIds) {
      const userAttendanceRecords = userRecords.get(userId) || [];
      const consolidated = await this.consolidateUserAttendance(userId, userAttendanceRecords, date);
      consolidatedData.set(userId, consolidated);
    }

    return consolidatedData;
  }

  /**
   * Consolidate attendance records for a single user
   */
  private async determineOverallStatus(
    firstCheckIn: Date | null, 
    sessions: AttendanceSession[], 
    date: string
  ): Promise<'present' | 'absent' | 'late' | 'partial'> {
    if (!firstCheckIn || sessions.length === 0) {
      return 'absent';
    }
  
    // Check if late based on office working hours
    const isLate = await this.isLateCheckIn(firstCheckIn, sessions[0].location);
    
    // Check if partial day (incomplete sessions)
    const hasIncompleteSession = sessions.some(s => s.check_in_time && !s.check_out_time);
    
    if (hasIncompleteSession) {
      return isLate ? 'late' : 'partial';
    }
    
    return isLate ? 'late' : 'present';
  }

  private async consolidateUserAttendance(
    userId: string, 
    records: AttendanceRecord[], 
    date: string
  ): Promise<ConsolidatedAttendance> {
    if (records.length === 0) {
      return {
        user_id: userId,
        total_hours: 0,
        status: 'absent',
        first_check_in: null,
        last_check_out: null,
        location: 'Unknown',
        sessions: [],
        has_overlaps: false,
        has_duplicates: false,
        has_unclosed_session: false
      };
    }

    // Detect and handle duplicates
    const { cleanRecords, hasDuplicates } = this.detectAndHandleDuplicates(records);
    
    // Detect and resolve overlaps
    const { sessions, hasOverlaps } = this.detectAndResolveOverlaps(cleanRecords);
    
    // Check for unclosed sessions
    const hasUnclosedSession = sessions.some(s => s.check_in_time && !s.check_out_time);
    
    const firstCheckIn = sessions.length > 0 ? sessions[0].check_in_time : null;
    const lastCheckOut = sessions.length > 0 ? sessions[sessions.length - 1].check_out_time : null;
    
    const status = await this.determineOverallStatus(firstCheckIn, sessions, date);
    const totalHours = sessions.reduce((sum, session) => sum + session.duration_hours, 0);
    const location = this.getPrimaryLocation(sessions);

    return {
      user_id: userId,
      total_hours: totalHours,
      status,
      first_check_in: firstCheckIn,
      last_check_out: lastCheckOut,
      location,
      sessions,
      has_overlaps: hasOverlaps,
      has_duplicates: hasDuplicates,
      has_unclosed_session: hasUnclosedSession
    };
  }

  /**
   * Detect and handle duplicate attendance entries
   */
  private detectAndHandleDuplicates(records: AttendanceRecord[]): {
    cleanRecords: AttendanceRecord[];
    hasDuplicates: boolean;
  } {
    const duplicateGroups = new Map<string, AttendanceRecord[]>();
    const cleanRecords: AttendanceRecord[] = [];
    let hasDuplicates = false;

    records.forEach(record => {
      const key = `${record.check_in_time?.getTime()}_${record.check_out_time?.getTime()}_${record.check_in_location}`;
      
      if (!duplicateGroups.has(key)) {
        duplicateGroups.set(key, []);
      }
      duplicateGroups.get(key)!.push(record);
    });

    duplicateGroups.forEach(group => {
      if (group.length > 1) {
        hasDuplicates = true;
        // Keep the record with the most complete data
        const bestRecord = group.reduce((best, current) => {
          const bestScore = this.calculateRecordCompleteness(best);
          const currentScore = this.calculateRecordCompleteness(current);
          return currentScore > bestScore ? current : best;
        });
        cleanRecords.push(bestRecord);
      } else {
        cleanRecords.push(group[0]);
      }
    });

    return { cleanRecords, hasDuplicates };
  }

  /**
   * Calculate completeness score for a record
   */
  private calculateRecordCompleteness(record: AttendanceRecord): number {
    let score = 0;
    if (record.check_in_time) score += 2;
    if (record.check_out_time) score += 2;
    if (record.check_in_location) score += 1;
    if (record.check_out_location) score += 1;
    if (record.total_hours > 0) score += 1;
    return score;
  }

  /**
   * Detect and resolve overlapping time periods
   */
  private detectAndResolveOverlaps(records: AttendanceRecord[]): {
    sessions: AttendanceSession[];
    hasOverlaps: boolean;
  } {
    const sessions: AttendanceSession[] = [];
    let hasOverlaps = false;

    // Convert records to sessions
    const initialSessions = records.map(record => ({
      check_in_time: record.check_in_time,
      check_out_time: record.check_out_time,
      duration_hours: this.calculateSessionDuration(record.check_in_time, record.check_out_time),
      location: record.check_in_location || 'Unknown',
      is_duplicate: false,
      overlaps_with: [] as string[]
    }));

    // Sort sessions by check-in time
    initialSessions.sort((a, b) => {
      if (!a.check_in_time && !b.check_in_time) return 0;
      if (!a.check_in_time) return 1;
      if (!b.check_in_time) return -1;
      return a.check_in_time.getTime() - b.check_in_time.getTime();
    });

    // Detect overlaps and merge where appropriate
    for (let i = 0; i < initialSessions.length; i++) {
      const currentSession = initialSessions[i];
      let merged = false;

      // Check for overlaps with existing sessions
      for (let j = 0; j < sessions.length; j++) {
        const existingSession = sessions[j];
        
        if (this.sessionsOverlap(currentSession, existingSession)) {
          hasOverlaps = true;
          // Merge overlapping sessions
          const mergedSession = this.mergeSessions(existingSession, currentSession);
          sessions[j] = mergedSession;
          merged = true;
          break;
        }
      }

      if (!merged) {
        sessions.push(currentSession);
      }
    }

    return { sessions, hasOverlaps };
  }

  /**
   * Check if two sessions overlap
   */
  private sessionsOverlap(session1: AttendanceSession, session2: AttendanceSession): boolean {
    if (!session1.check_in_time || !session2.check_in_time) return false;
    
    const s1Start = session1.check_in_time.getTime();
    const s1End = session1.check_out_time?.getTime() || Date.now();
    const s2Start = session2.check_in_time.getTime();
    const s2End = session2.check_out_time?.getTime() || Date.now();

    return (s1Start < s2End && s2Start < s1End);
  }

  /**
   * Merge two overlapping sessions
   */
  private mergeSessions(session1: AttendanceSession, session2: AttendanceSession): AttendanceSession {
    const earliestCheckIn = !session1.check_in_time ? session2.check_in_time :
                           !session2.check_in_time ? session1.check_in_time :
                           new Date(Math.min(session1.check_in_time.getTime(), session2.check_in_time.getTime()));
    
    const latestCheckOut = !session1.check_out_time && !session2.check_out_time ? null :
                          !session1.check_out_time ? session2.check_out_time :
                          !session2.check_out_time ? session1.check_out_time :
                          new Date(Math.max(session1.check_out_time.getTime(), session2.check_out_time.getTime()));

    return {
      check_in_time: earliestCheckIn,
      check_out_time: latestCheckOut,
      duration_hours: this.calculateSessionDuration(earliestCheckIn, latestCheckOut),
      location: session1.location || session2.location,
      is_duplicate: false,
      overlaps_with: [...session1.overlaps_with, ...session2.overlaps_with]
    };
  }

  /**
   * Calculate session duration in hours
   */
  private calculateSessionDuration(checkIn: Date | null, checkOut: Date | null): number {
    if (!checkIn) return 0;
    const endTime = checkOut || new Date();
    return (endTime.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
  }


  /**
   * Check if check-in time is late
   */
  private async isLateCheckIn(checkInTime: Date, location: string): Promise<boolean> {
    const query = `
      SELECT working_hours_start 
      FROM office_locations 
      WHERE name ILIKE $1 AND is_active = true 
      LIMIT 1
    `;
    
    const result = await this.pool.query(query, [location]);
    const workingHoursStart = result.rows[0]?.working_hours_start;
    
    if (!workingHoursStart) {
      // Default to 9:15 AM if no office hours found
      const defaultTime = new Date(checkInTime);
      defaultTime.setHours(9, 15, 0, 0);
      return checkInTime.getTime() > defaultTime.getTime();
    }
    
    // Add 15-minute grace period
    const graceTime = new Date(checkInTime);
    const [hours, minutes] = workingHoursStart.split(':');
    graceTime.setHours(parseInt(hours), parseInt(minutes) + 15, 0, 0);
    
    return checkInTime.getTime() > graceTime.getTime();
  }

  /**
   * Get primary location from sessions
   */
  private getPrimaryLocation(sessions: AttendanceSession[]): string {
    if (sessions.length === 0) return 'Unknown';
    
    // Count location frequency
    const locationCounts = new Map<string, number>();
    sessions.forEach(session => {
      const location = session.location || 'Unknown';
      locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
    });
    
    // Return most frequent location
    let maxCount = 0;
    let primaryLocation = 'Unknown';
    locationCounts.forEach((count, location) => {
      if (count > maxCount) {
        maxCount = count;
        primaryLocation = location;
      }
    });
    
    return primaryLocation;
  }

  /**
   * Validate data integrity during consolidation
   */
  async validateDataIntegrity(
    userId: string, 
    date: string, 
    consolidatedData: ConsolidatedAttendance
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // Check temporal consistency
    if (consolidatedData.first_check_in && consolidatedData.last_check_out) {
      if (consolidatedData.first_check_in.getTime() > consolidatedData.last_check_out.getTime()) {
        errors.push('First check-in time is after last check-out time');
      }
    }
    
    // Validate total hours calculation
    const calculatedHours = consolidatedData.sessions.reduce((sum, session) => sum + session.duration_hours, 0);
    if (Math.abs(calculatedHours - consolidatedData.total_hours) > 0.01) {
      errors.push('Total hours calculation mismatch');
    }
    
    // Check for reasonable working hours (not more than 24 hours)
    if (consolidatedData.total_hours > 24) {
      errors.push('Total working hours exceed 24 hours');
    }
    
    // Validate session consistency
    for (const session of consolidatedData.sessions) {
      if (session.check_in_time && session.check_out_time) {
        if (session.check_in_time.getTime() > session.check_out_time.getTime()) {
          errors.push('Session check-in time is after check-out time');
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const attendanceConsolidationService = new AttendanceConsolidationService(
  new Pool({ connectionString: process.env.DATABASE_URL })
);