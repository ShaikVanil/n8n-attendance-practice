export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'employee' | 'manager' | 'admin';
  isActive: boolean;
  currentLocationId?: string;
  preferredLocationId?: string; // Add this line
  officeLocation?: string; // Keep for backward compatibility
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  managerId?: string;
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
  user: User;
  token: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'employee' | 'manager' | 'admin';
  isActive?: boolean;
  officeLocation?: string;
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: 'employee' | 'manager' | 'admin';
  isActive?: boolean;
  officeLocation?: string;
  currentLocationId?: string;
  preferredLocationId?: string;
}

export interface UserListResponse {
  users: User[];
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
  timestamp: string;
  performedBy: string;
}