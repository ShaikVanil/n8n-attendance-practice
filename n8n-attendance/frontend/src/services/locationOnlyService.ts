import api from './api';

export interface LocationOnlyValidationResult {
  isValid: boolean;
  office: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    geofence_radius_meters: number;
  } | null;
  distance: number | null;
  error?: string;
}

class LocationOnlyService {
  /**
   * Validate user location against all office locations
   * Returns the nearest valid office or null if none found
   */
  async validateLocationOnly(
    latitude: number,
    longitude: number
  ): Promise<LocationOnlyValidationResult> {
    try {
      const response = await api.post('/locations/validate', {
        latitude,
        longitude
        // No officeId - backend will find nearest office
      });

      return response.data;
    } catch (error) {
      console.error('Location-only validation failed:', error);
      return {
        isValid: false,
        office: null,
        distance: null,
        error: 'Location validation failed'
      };
    }
  }

  /**
   * Check if user is within any office geofence
   */
  async isWithinAnyOfficeGeofence(
    latitude: number,
    longitude: number
  ): Promise<boolean> {
    const result = await this.validateLocationOnly(latitude, longitude);
    return result.isValid;
  }
}

export const locationOnlyService = new LocationOnlyService();