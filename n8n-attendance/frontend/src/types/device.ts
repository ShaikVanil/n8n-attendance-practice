export interface Device {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'laptop';
  macAddress: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  registeredAt: string;
}

export interface DeviceRegistrationRequest {
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'laptop';
  macAddress: string;
  description?: string;
}