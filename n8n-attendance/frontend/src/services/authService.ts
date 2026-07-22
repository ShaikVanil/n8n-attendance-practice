import api from './api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'employee' | 'manager' | 'admin';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  officeLocation?: string;
  currentLocationId?: string;
  preferredLocationId?: string;
  lastLoginAt?: string;
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
  message: string;
}

export class AuthService {
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    const { user, token } = response.data;
    
    // Store token and user in localStorage
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    return response.data;
  }

  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post('/auth/register', userData);
    const { user, token } = response.data;
    
    // Store token and user in localStorage
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    return response.data;
  }

  static async getProfile(): Promise<User> {
    const response = await api.get('/auth/profile');
    return response.data.user;
  }

  static async updateProfile(userData: Partial<User>): Promise<User> {
    const response = await api.put('/auth/profile', userData);
    const updatedUser = response.data.user;
    
    // Update user in localStorage
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    return updatedUser;
  }

  static logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  static getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  static getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  static isAuthenticated(): boolean {
    return !!this.getToken();
  }
}