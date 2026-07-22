import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import ProjectService, { Project, ProjectAssignment, AssignUserRequest } from '../services/projectService';
import { UserService, User } from '../services/userService';
import { useAuthStore } from '../stores/authStore';

interface ProjectAssignmentManagementProps {
  // Optional: can be used to focus on a specific project
  projectId?: string;
}

const ProjectAssignmentManagement: React.FC<ProjectAssignmentManagementProps> = ({ projectId }) => {
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState<AssignUserRequest>({
    userId: '',
    role: '',
    hourlyRate: undefined,
    allocatedHours: undefined,
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadProjects();
    loadUsers();
  }, []);

  useEffect(() => {
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setSelectedProject(project);
        loadAssignments(projectId);
      }
    }
  }, [projectId, projects]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = user?.role === 'admin' 
        ? await ProjectService.getAllProjects()
        : await ProjectService.getManagedProjects();
      setProjects(data);
      
      if (data.length > 0 && !selectedProject) {
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

  const loadUsers = async () => {
    try {
      const data = await UserService.getUsers(1, 1000); // Get all users with high limit
      setUsers(Array.isArray(data.users) ? data.users.filter(u => u.role === 'employee') : []);
    } catch (error) {
      toast.error('Failed to load users');
      console.error('Error loading users:', error);
    }
  };

  const loadAssignments = async (projectId: string) => {
    try {
      const data = await ProjectService.getProjectAssignments(projectId);
      setAssignments(data);
    } catch (error) {
      toast.error('Failed to load project assignments');
      console.error('Error loading assignments:', error);
    }
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    loadAssignments(project.id);
  };

  const handleAssignUser = async () => {
    if (!selectedProject || !assignmentForm.userId || !assignmentForm.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await ProjectService.assignUserToProject(selectedProject.id, assignmentForm);
      toast.success('User assigned to project successfully');
      loadAssignments(selectedProject.id);
      setShowAssignModal(false);
      setAssignmentForm({
        userId: '',
        role: '',
        hourlyRate: undefined,
        allocatedHours: undefined,
        startDate: '',
        endDate: ''
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to assign user');
      console.error('Error assigning user:', error);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!selectedProject) return;

    if (window.confirm('Are you sure you want to remove this assignment?')) {
      try {
        await ProjectService.removeUserAssignment(selectedProject.id, assignmentId);
        toast.success('Assignment removed successfully');
        loadAssignments(selectedProject.id);
      } catch (error) {
        toast.error('Failed to remove assignment');
        console.error('Error removing assignment:', error);
      }
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
            Project Assignment Management
          </h3>

          {/* Project Selection */}
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

          {/* Selected Project Details */}
          {selectedProject && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-lg font-medium text-gray-900">{selectedProject.name}</h4>
                  <p className="text-sm text-gray-600">Code: {selectedProject.code}</p>
                  {selectedProject.description && (
                    <p className="text-sm text-gray-600 mt-1">{selectedProject.description}</p>
                  )}
                  {selectedProject.clientName && (
                    <p className="text-sm text-gray-600">Client: {selectedProject.clientName}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(selectedProject.status)}`}>
                    {selectedProject.status}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadgeColor(selectedProject.priority)}`}>
                    {selectedProject.priority}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Team Assignments */}
          {selectedProject && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-medium text-gray-900">Team Assignments</h4>
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Assign User
                </button>
              </div>

              {assignments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No team members assigned to this project.</p>
              ) : (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Employee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hourly Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Allocated Hours
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Period
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {assignments.map((assignment) => {
                        const assignedUser = users.find(u => u.id === assignment.userId);
                        return (
                          <tr key={assignment.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Unknown User'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {assignedUser?.email}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {assignment.role}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {assignment.hourlyRate ? `$${assignment.hourlyRate}` : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {assignment.allocatedHours || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {assignment.startDate && assignment.endDate
                                ? `${new Date(assignment.startDate).toLocaleDateString()} - ${new Date(assignment.endDate).toLocaleDateString()}`
                                : assignment.startDate
                                ? `From ${new Date(assignment.startDate).toLocaleDateString()}`
                                : 'Ongoing'
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleRemoveAssignment(assignment.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Assign User to Project</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee *
                  </label>
                  <select
                    value={assignmentForm.userId}
                    onChange={(e) => setAssignmentForm({...assignmentForm, userId: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select an employee...</option>
                    {users.filter(u => !assignments.some(a => a.userId === u.id)).map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    value={assignmentForm.role}
                    onChange={(e) => setAssignmentForm({...assignmentForm, role: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a role...</option>
                    <option value="developer">Developer</option>
                    <option value="designer">Designer</option>
                    <option value="analyst">Analyst</option>
                    <option value="tester">Tester</option>
                    <option value="project_manager">Project Manager</option>
                    <option value="team_lead">Team Lead</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hourly Rate ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={assignmentForm.hourlyRate || ''}
                    onChange={(e) => setAssignmentForm({...assignmentForm, hourlyRate: e.target.value ? parseFloat(e.target.value) : undefined})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Allocated Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={assignmentForm.allocatedHours || ''}
                    onChange={(e) => setAssignmentForm({...assignmentForm, allocatedHours: e.target.value ? parseFloat(e.target.value) : undefined})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={assignmentForm.startDate}
                      onChange={(e) => setAssignmentForm({...assignmentForm, startDate: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={assignmentForm.endDate}
                      onChange={(e) => setAssignmentForm({...assignmentForm, endDate: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignUser}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Assign User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectAssignmentManagement;