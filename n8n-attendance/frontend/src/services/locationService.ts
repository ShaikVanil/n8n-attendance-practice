import api from './api';

export interface OfficeLocation {
  id: string;
  name: string;
  address: string;
  wifiNetworks: string[];
  timezone: string;
  workingHours: {
    start: string;
    end: string;
  };
  policies: {
    gracePeriodMinutes: number;
    maxBreakMinutes: number;
    overtimeThreshold: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  latitude: number;
  longitude: number;
  geofence_radius_meters?: number;
  geofence_enabled?: boolean;
}

export interface OfficeLocationWithDistance extends OfficeLocation {
  distance: number;
  isAuthorized: boolean;
  authorizationReason: string;
  isCurrentLocation: boolean;
}

export interface LocationDetectionResult {
  detectedLocation: OfficeLocation | null;
  confidence: number;
  detectionMethod: 'wifi' | 'manual' | 'gps';
  timestamp: string;
}

export interface LocationTransfer {
  id: string;
  userId: string;
  fromLocationId: string | null;
  toLocationId: string;
  transferDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  isTemporary: boolean;
  temporaryEndDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocationAttendanceHistory {
  records: Array<{
    id: string;
    date: string;
    locationId: string;
    locationName: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    totalHours: number;
    status: 'present' | 'absent' | 'partial';
  }>;
  summary: {
    totalDays: number;
    presentDays: number;
    totalHours: number;
    locationBreakdown: Record<string, {
      days: number;
      hours: number;
    }>;
  };
}

export interface CreateLocationTransferRequest {
  toLocationId: string;
  reason: string;
  isTemporary: boolean;
  temporaryEndDate?: string;
}

class LocationService {
  // Get all office locations
  async getOfficeLocations(): Promise<OfficeLocation[]> {
    const response = await api.get('/locations');
    return response.data;
  }

  // Get specific office location
  async getOfficeLocation(locationId: string): Promise<OfficeLocation> {
    const response = await api.get(`/locations/${locationId}`);
    return response.data;
  }

  // Detect current location based on network/GPS
  async detectCurrentLocation(): Promise<LocationDetectionResult> {
    const response = await api.post('/locations/detect');
    return response.data;
  }

  // Get user's current assigned location
  async getCurrentUserLocation(): Promise<OfficeLocation | null> {
    const response = await api.get('/locations/current');
    return response.data;
  }

  // Get attendance history filtered by location
  async getLocationAttendanceHistory(
    startDate?: string,
    endDate?: string,
    locationId?: string
  ): Promise<LocationAttendanceHistory> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (locationId) params.append('location_id', locationId);
    
    const response = await api.get(`/attendance/location-history?${params}`);
    return response.data;
  }

  // Request location transfer
  async requestLocationTransfer(request: CreateLocationTransferRequest): Promise<LocationTransfer> {
    const response = await api.post('/locations/transfer-request', request);
    return response.data;
  }

  // Get user's location transfer history
  async getLocationTransfers(): Promise<LocationTransfer[]> {
    const response = await api.get('/locations/transfers');
    return response.data;
  }

  // Get pending location transfer requests (for managers)
  async getPendingLocationTransfers(): Promise<LocationTransfer[]> {
    const response = await api.get('/locations/transfers/pending');
    return response.data;
  }

  // Approve/reject location transfer (for managers)
  async reviewLocationTransfer(
    transferId: string,
    action: 'approve' | 'reject',
    comments?: string
  ): Promise<LocationTransfer> {
    const response = await api.put(`/locations/transfers/${transferId}/review`, {
      action,
      comments
    });
    return response.data;
  }

  // Manual location override for attendance
  async setManualLocation(locationId: string, reason: string): Promise<void> {
    await api.post('/locations/manual-override', {
      locationId,
      reason
    });
  }

  // Get location-specific policies
  async getLocationPolicies(locationId: string): Promise<OfficeLocation['policies']> {
    const response = await api.get(`/locations/${locationId}/policies`);
    return response.data;
  }

  // Admin: Create new office location
  async createOfficeLocation(location: Omit<OfficeLocation, 'id' | 'createdAt' | 'updatedAt'>): Promise<OfficeLocation> {
    const response = await api.post('/admin/locations', location);
    return response.data;
  }

  // Admin: Update office location
  async updateOfficeLocation(locationId: string, updates: Partial<OfficeLocation>): Promise<OfficeLocation> {
    const response = await api.put(`/admin/locations/${locationId}`, updates);
    return response.data;
  }

  // Admin: Delete office location
  async deleteOfficeLocation(locationId: string): Promise<void> {
    await api.delete(`/admin/locations/${locationId}`);
  }
}

export const locationService = new LocationService();

export const getOfficesWithDistances = async (latitude: number, longitude: number): Promise<OfficeLocationWithDistance[]> => {
  const response = await api.get('/locations/with-distances', {
    params: { latitude, longitude },
  });
  return response.data;
};