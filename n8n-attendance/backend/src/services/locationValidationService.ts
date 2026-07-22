import { Pool } from 'pg';

interface GPSCoordinates {
  latitude: number;
  longitude: number;
}

interface OfficeLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
  geofence_enabled: boolean;
}

interface LocationValidationResult {
  isValid: boolean;
  office: OfficeLocation | null;
  distance: number | null;
  error?: string;
}

class LocationValidationService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  /**
   * Validate if user's GPS coordinates are within any office geofence
   */
  async validateUserLocation(
    userCoordinates: GPSCoordinates,
    officeId?: string
  ): Promise<LocationValidationResult> {
    try {
      let query: string;
      let params: any[];

      if (officeId) {
        // Validate against specific office
        query = `
          SELECT 
            id,
            name,
            latitude,
            longitude,
            geofence_radius_meters,
            geofence_enabled,
            calculate_distance_meters($1, $2, latitude, longitude) as distance
          FROM office_locations 
          WHERE id = $3 AND is_active = true AND geofence_enabled = true
        `;
        params = [userCoordinates.latitude, userCoordinates.longitude, officeId];
      } else {
        // Find nearest office within geofence
        query = `
          SELECT 
            id,
            name,
            latitude,
            longitude,
            geofence_radius_meters,
            geofence_enabled,
            calculate_distance_meters($1, $2, latitude, longitude) as distance
          FROM office_locations 
          WHERE is_active = true AND geofence_enabled = true
          ORDER BY calculate_distance_meters($1, $2, latitude, longitude) ASC
          LIMIT 1
        `;
        params = [userCoordinates.latitude, userCoordinates.longitude];
      }

      const result = await this.pool.query(query, params);

      if (result.rows.length === 0) {
        return {
          isValid: false,
          office: null,
          distance: null,
          error: officeId ? 'Office not found or GPS not configured' : 'No offices found'
        };
      }

      const office = result.rows[0];
      const distance = parseFloat(office.distance);
      const isWithinGeofence = distance <= office.geofence_radius_meters;

      return {
        isValid: isWithinGeofence,
        office: {
          id: office.id,
          name: office.name,
          latitude: office.latitude,
          longitude: office.longitude,
          geofence_radius_meters: office.geofence_radius_meters,
          geofence_enabled: office.geofence_enabled
        },
        distance
      };
    } catch (error) {
      console.error('Location validation error:', error);
      return {
        isValid: false,
        office: null,
        distance: null,
        error: 'Location validation failed'
      };
    }
  }

  /**
   * Get all offices with their distances from user location
   */
  async getOfficesWithDistances(
    userCoordinates: GPSCoordinates
  ): Promise<(OfficeLocation & { distance: number })[]> {
    try {
      const query = `
        SELECT 
          id,
          name,
          latitude,
          longitude,
          geofence_radius_meters,
          geofence_enabled,
          calculate_distance_meters($1, $2, latitude, longitude) as distance
        FROM office_locations 
        WHERE is_active = true
        ORDER BY calculate_distance_meters($1, $2, latitude, longitude) ASC
      `;

      const result = await this.pool.query(query, [
        userCoordinates.latitude,
        userCoordinates.longitude
      ]);

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        latitude: row.latitude,
        longitude: row.longitude,
        geofence_radius_meters: row.geofence_radius_meters,
        geofence_enabled: row.geofence_enabled,
        distance: parseFloat(row.distance)
      }));
    } catch (error) {
      console.error('Error getting offices with distances:', error);
      return [];
    }
  }

  /**
   * Log location detection attempt
   */
  async logLocationDetection(
    userId: string,
    userCoordinates: GPSCoordinates,
    detectedOfficeId: string | null,
    distance: number | null
  ): Promise<void> {
    try {
      await this.pool.query(`
        INSERT INTO location_detections (
          user_id,
          detected_location_id,
          detection_method,
          confidence_score,
          user_latitude,
          user_longitude,
          distance_from_office_meters
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        userId,
        detectedOfficeId,
        'gps',
        detectedOfficeId ? 0.9 : 0.1,
        userCoordinates.latitude,
        userCoordinates.longitude,
        distance
      ]);
    } catch (error) {
      console.error('Error logging location detection:', error);
    }
  }
}

export const locationValidationService = new LocationValidationService();
export { GPSCoordinates, OfficeLocation, LocationValidationResult };