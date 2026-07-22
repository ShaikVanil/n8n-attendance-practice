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
  lastLoginAt?: string;
  managerId?: string;
  managerName?: string;
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

export class UserService {
  // Get all users with pagination and search
  static async getUsers(page: number = 1, limit: number = 10, search?: string, roles?: string): Promise<UserListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
  
    if (search) {
      params.append('search', search);
    }
  
    if (roles) {
      params.append('role', roles);
    }
  
    const response = await api.get(`/users?${params}`);
    return response.data;
  }

  static async getUserById(id: string): Promise<User> {
    const response = await api.get(`/users/${id}`);
    return response.data;
  }

  static async createUser(userData: CreateUserRequest): Promise<User> {
    const response = await api.post('/users', userData);
    return response.data;
  }

  static async updateUser(id: string, userData: UpdateUserRequest): Promise<User> {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  }

  static async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  }

  static async resetPassword(id: string, newPassword: string): Promise<void> {
    await api.post(`/users/${id}/reset-password`, { newPassword });
  }

  static async bulkUpdateUsers(data: BulkUpdateRequest): Promise<void> {
    await api.post('/users/bulk-update', data);
  }

  static async getManagers(): Promise<{ data: User[] }> {
    const response = await api.get('/users', {
      params: {
        role: 'manager,admin',
        limit: 1000
      }
    });
    return { data: response.data.users };
  }

  // Manager-related methods
  static async assignManager(userId: string, managerId: string | null): Promise<void> {
    await api.put(`/users/${userId}/manager`, {
      manager_id: managerId
    });
  }

  static async getDirectReports(managerId: string): Promise<User[]> {
    const response = await api.get(`/users/${managerId}/direct-reports`);
    return response.data;
  }

  static async getManagerHierarchy(userId: string): Promise<User[]> {
    const response = await api.get(`/users/${userId}/manager-hierarchy`);
    return response.data;
  }
}

// Export a default instance for backward compatibility
export const userService = UserService;
export default UserService;
