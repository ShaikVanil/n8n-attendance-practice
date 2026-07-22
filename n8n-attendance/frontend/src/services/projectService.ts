import api from './api';

export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  clientName?: string;
  projectManagerId: string;
  projectManagerIds: string[];
  startDate?: string;
  endDate?: string;
  estimatedHours?: number;
  budget?: number;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  locationId?: string;
  isCrossLocation: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAssignment {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  hourlyRate?: number;
  allocatedHours?: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  assignedBy: string;
  createdAt: string;
  // User details for display
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface ProjectManager {
  id: string;
  projectId: string;
  managerId: string;
  locationId?: string;
  isPrimary: boolean;
  permissions: {
    approveTimesheets: boolean;
    manageAssignments: boolean;
    viewReports: boolean;
  };
  createdAt: string;
}

export interface CreateProjectRequest {
  name: string;
  code: string;
  description?: string;
  clientName?: string;
  projectManagerId: string; // Keep for backward compatibility
  projectManagerIds?: string[]; // Add for multiple managers
  startDate?: string;
  endDate?: string;
  estimatedHours?: number;
  budget?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  locationId?: string;
  isCrossLocation?: boolean;
}

export interface AssignUserRequest {
  userId: string;
  role: string;
  hourlyRate?: number;
  allocatedHours?: number;
  startDate?: string;
  endDate?: string;
}

class ProjectService {
  // Get all projects (admin/manager)
  static async getAllProjects(): Promise<Project[]> {
    const response = await api.get('/projects');
    return response.data;
  }

  // Get projects managed by current user
  static async getManagedProjects(): Promise<Project[]> {
    const response = await api.get('/projects/managed/by-me');
    return response.data;
  }

  // Get projects assigned to current user
  static async getAssignedProjects(): Promise<Project[]> {
    const response = await api.get('/projects/assigned/to-me');
    return response.data;
  }

  // Get single project
  static async getProject(id: string): Promise<Project> {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  }

  // Create new project
  static async createProject(projectData: CreateProjectRequest): Promise<Project> {
    const response = await api.post('/projects', projectData);
    return response.data;
  }

  // Update project
  static async updateProject(id: string, projectData: Partial<CreateProjectRequest>): Promise<Project> {
    const response = await api.put(`/projects/${id}`, projectData);
    return response.data;
  }

  // Delete project
  static async deleteProject(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  }

  // Get project assignments
  static async getProjectAssignments(projectId: string): Promise<ProjectAssignment[]> {
    const response = await api.get(`/projects/${projectId}/assignments`);
    return response.data;
  }

  // Assign user to project
  static async assignUserToProject(projectId: string, assignmentData: AssignUserRequest): Promise<ProjectAssignment> {
    const response = await api.post(`/projects/${projectId}/assignments`, assignmentData);
    return response.data;
  }

  // Remove user assignment
  static async removeUserAssignment(projectId: string, assignmentId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/assignments/${assignmentId}`);
  }

  // Update user assignment
  static async updateUserAssignment(projectId: string, assignmentId: string, assignmentData: Partial<AssignUserRequest>): Promise<ProjectAssignment> {
    const response = await api.put(`/projects/${projectId}/assignments/${assignmentId}`, assignmentData);
    return response.data;
  }

  // Add project manager
  static async addProjectManager(projectId: string, managerData: {
    managerId: string;
    locationId?: string;
    permissions?: any;
  }): Promise<ProjectManager> {
    const response = await api.post(`/projects/${projectId}/managers`, managerData);
    return response.data;
  }

  // Get project managers
  static async getProjectManagers(projectId: string): Promise<ProjectManager[]> {
    const response = await api.get(`/projects/${projectId}/managers`);
    return response.data;
  }

  // Get projects assigned to current user
  static async getUserProjects(): Promise<Project[]> {
    const response = await api.get('/projects/assigned/to-me');
    return response.data;
  }
}

export default ProjectService;