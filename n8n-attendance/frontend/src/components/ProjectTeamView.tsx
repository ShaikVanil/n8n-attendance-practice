import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import ProjectService, { Project, ProjectAssignment } from '../services/projectService';
import { UserService, User } from '../services/userService';

interface ProjectTeamViewProps {
  projectId?: string;
  showProjectSelector?: boolean;
}

const ProjectTeamView: React.FC<ProjectTeamViewProps> = ({ 
  projectId, 
  showProjectSelector = true 
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (showProjectSelector) {
      loadProjects();
    }
    loadUsers();
  }, [showProjectSelector]);

  useEffect(() => {
    if (projectId) {
      loadProjectById(projectId);
    }
  }, [projectId]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await ProjectService.getAllProjects();
      setProjects(data.filter(p => p.status === 'active'));
      
      if (data.length > 0 && !selectedProject && !projectId) {
        setSelectedProject(data[0]);
        loadAssignments(data[0].id);
      }
    } catch (error) {
      toast.error('Failed to load projects');
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectById = async (id: string) => {
    try {
      setLoading(true);
      const project = await ProjectService.getProject(id);
      setSelectedProject(project);
      loadAssignments(id);
    } catch (error) {
      toast.error('Failed to load project');
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await UserService.getUsers();
      setUsers(data.users);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadAssignments = async (projectId: string) => {
    try {
      const data = await ProjectService.getProjectAssignments(projectId);
      setAssignments(data);
    } catch (error) {
      toast.error('Failed to load team assignments');
      console.error('Error loading assignments:', error);
    }
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    loadAssignments(project.id);
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'project_manager': return 'bg-purple-100 text-purple-800';
      case 'team_lead': return 'bg-blue-100 text-blue-800';
      case 'developer': return 'bg-green-100 text-green-800';
      case 'designer': return 'bg-pink-100 text-pink-800';
      case 'analyst': return 'bg-yellow-100 text-yellow-800';
      case 'tester': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateTotalAllocatedHours = () => {
    return assignments.reduce((total, assignment) => {
      return total + (assignment.allocatedHours || 0);
    }, 0);
  };

  const getActiveAssignments = () => {
    return assignments.filter(assignment => assignment.isActive);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Project Team View
          </h3>

          {/* Project Selection */}
          {showProjectSelector && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Project
              </label>
              <select
                value={selectedProject?.id || ''}
                onChange={(e) => {
                  const project = projects.find(p => p.id === e.target.value);
                  if (project) handleProjectSelect(project);
                }}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Project Overview */}
          {selectedProject && (
            <div className="mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{selectedProject.name}</h4>
                    <p className="text-sm text-gray-600">Code: {selectedProject.code}</p>
                    {selectedProject.clientName && (
                      <p className="text-sm text-gray-600">Client: {selectedProject.clientName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Team Size</div>
                    <div className="text-2xl font-bold text-blue-600">{getActiveAssignments().length}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded p-3">
                    <div className="text-sm text-gray-600">Total Allocated Hours</div>
                    <div className="text-lg font-semibold text-gray-900">{calculateTotalAllocatedHours()}</div>
                  </div>
                  <div className="bg-white rounded p-3">
                    <div className="text-sm text-gray-600">Project Status</div>
                    <div className="text-lg font-semibold text-gray-900 capitalize">{selectedProject.status}</div>
                  </div>
                  <div className="bg-white rounded p-3">
                    <div className="text-sm text-gray-600">Priority</div>
                    <div className="text-lg font-semibold text-gray-900 capitalize">{selectedProject.priority}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Team Members */}
          {selectedProject && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Team Members</h4>
              
              {getActiveAssignments().length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-lg mb-2">👥</div>
                  <p className="text-gray-500">No team members assigned to this project.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getActiveAssignments().map((assignment) => {
                    const assignedUser = users.find(u => u.id === assignment.userId);
                    return (
                      <div key={assignment.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                                  <span className="text-white font-medium text-sm">
                                    {assignedUser ? `${assignedUser.firstName[0]}${assignedUser.lastName[0]}` : '??'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Unknown User'}
                                </p>
                                <p className="text-sm text-gray-500 truncate">
                                  {assignedUser?.email}
                                </p>
                              </div>
                            </div>
                            
                            <div className="mt-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(assignment.role)}`}>
                                {assignment.role.replace('_', ' ')}
                              </span>
                            </div>
                            
                            <div className="mt-3 space-y-1">
                              {assignment.hourlyRate && (
                                <div className="text-xs text-gray-600">
                                  Rate: ${assignment.hourlyRate}/hr
                                </div>
                              )}
                              {assignment.allocatedHours && (
                                <div className="text-xs text-gray-600">
                                  Allocated: {assignment.allocatedHours} hours
                                </div>
                              )}
                              {assignment.startDate && (
                                <div className="text-xs text-gray-600">
                                  {assignment.endDate 
                                    ? `${new Date(assignment.startDate).toLocaleDateString()} - ${new Date(assignment.endDate).toLocaleDateString()}`
                                    : `From ${new Date(assignment.startDate).toLocaleDateString()}`
                                  }
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectTeamView;