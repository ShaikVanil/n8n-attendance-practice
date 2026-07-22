export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'employee' | 'manager' | 'admin';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  currentLocationId?: string;
  lastLoginAt?: Date;
  managerId?: string;
  managerName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'employee' | 'manager' | 'admin';
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'employee' | 'manager' | 'admin';
  isActive?: boolean;
  officeLocation?: string; // Keep this for API compatibility, will map to currentLocationId
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: 'employee' | 'manager' | 'admin';
  isActive?: boolean;
  currentLocationId?: string; // Use explicit field name instead of officeLocation
}

export interface UserListResponse {
  users: Omit<User, 'password'>[];
  total: number;
  page: number;
  totalPages: number;
}

export interface BulkUpdateRequest {
  userIds: string[];
  role?: 'employee' | 'manager' | 'admin';
  isActive?: boolean;
}

export interface ResetPasswordRequest {
  newPassword: string;
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: Date;
  performedBy: string;
}