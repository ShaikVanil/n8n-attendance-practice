export interface Device {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'laptop';
  macAddress: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  registeredAt: Date;
  updatedAt: Date;
}

export interface DeviceRegistrationRequest {
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'laptop';
  macAddress: string;
  description?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'employee' | 'manager' | 'admin';
  office_location?: string; // Add this property
  createdAt: Date;
  updatedAt: Date;
}