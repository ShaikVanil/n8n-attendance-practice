import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ProjectService, { Project, ProjectAssignment } from '../services/projectService';
import { useAuthStore } from '../stores/authStore';

const EmployeeProjectDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    if (user) {
      loadAssignedProjects();
    }
  }, [user]);

  const loadAssignedProjects = async () => {
    try {
      setLoading(true);
      const data = await ProjectService.getAssignedProjects();
      setProjects(data);
      
      if (data.length > 0) {
        setSelectedProject(data[0]);
      }
    } catch (error) {
      toast.error('Failed to load assigned projects');
      console.error('Error loading assigned projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'planning': return 'text-blue-600';
      case 'on_hold': return 'text-yellow-600';
      case 'completed': return 'text-gray-600';
      case 'cancelled': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
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

  const canCreateProject = user?.role === 'admin' || user?.role === 'manager';

  const handleCreateProject = () => {
    navigate('/admin/project-management');
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
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                My Project Assignments
              </h3>
              <p className="text-sm text-gray-600">
                View all projects you're currently assigned to and your role details.
              </p>
            </div>
            {canCreateProject && (
              <button
                onClick={handleCreateProject}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create New Project
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Projects Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">📁</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Projects
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {projects.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">✅</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Projects
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {projects.filter(p => p.status === 'active').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">⚡</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    High Priority
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {projects.filter(p => p.priority === 'high' || p.priority === 'critical').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Project Details</h4>
          
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">📋</div>
              <p className="text-gray-500">You are not currently assigned to any projects.</p>
              <p className="text-sm text-gray-400 mt-1">Contact your manager if you believe this is an error.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h5 className="text-lg font-medium text-gray-900">{project.name}</h5>
                        <span className="text-sm text-gray-500">({project.code})</span>
                        <span className={`text-sm font-medium ${getStatusColor(project.status)}`}>
                          {project.status}
                        </span>
                        <span className={`text-sm font-medium ${getPriorityColor(project.priority)}`}>
                          {project.priority} priority
                        </span>
                      </div>
                      
                      {project.description && (
                        <p className="text-sm text-gray-600 mb-2">{project.description}</p>
                      )}
                      
                      {project.clientName && (
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Client:</span> {project.clientName}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        {project.startDate && (
                          <span>
                            <span className="font-medium">Start:</span> {new Date(project.startDate).toLocaleDateString()}
                          </span>
                        )}
                        {project.endDate && (
                          <span>
                            <span className="font-medium">End:</span> {new Date(project.endDate).toLocaleDateString()}
                          </span>
                        )}
                        {project.estimatedHours && (
                          <span>
                            <span className="font-medium">Est. Hours:</span> {project.estimatedHours}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* My Role in this Project */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h6 className="text-sm font-medium text-gray-900 mb-2">My Role</h6>
                    <div className="text-sm text-gray-600">
                      <p>You can view your specific role and assignment details in the timesheet system when logging hours for this project.</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeProjectDashboard;