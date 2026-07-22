import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import ProjectService, { Project, CreateProjectRequest } from '../services/projectService';
import { userService, User } from '../services/userService';
import { useAuthStore } from '../stores/authStore';

interface ProjectFormData {
  name: string;
  code: string;
  description: string;
  clientName: string;
  projectManagerIds: string[]; // Changed from projectManagerId to array
  startDate: string;
  endDate: string;
  estimatedHours: number;
  budget: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  locationId: string;
  isCrossLocation: boolean;
}

const ProjectManagement: React.FC = () => {
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    code: '',
    description: '',
    clientName: '',
    projectManagerIds: [], // Initialize as empty array
    startDate: '',
    endDate: '',
    estimatedHours: 0,
    budget: 0,
    priority: 'medium',
    locationId: '',
    isCrossLocation: false
  });

  useEffect(() => {
    loadProjects();
    loadManagers();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectsData = await ProjectService.getAllProjects();
      setProjects(projectsData);
    } catch (error) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const loadManagers = async () => {
    try {
      // Filter to only get managers and admins
      const response = await userService.getUsers(1, 1000, '', 'manager,admin');
      setManagers(response.users.filter(user => 
        user.role === 'manager' || user.role === 'admin'
      ));
    } catch (error) {
      toast.error('Failed to load managers');
      console.error('Error loading managers:', error);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const projectData: CreateProjectRequest = {
        name: formData.name,
        code: formData.code,
        description: formData.description,
        clientName: formData.clientName,
        projectManagerIds: formData.projectManagerIds,
        startDate: formData.startDate,
        endDate: formData.endDate,
        estimatedHours: formData.estimatedHours,
        budget: formData.budget,
        priority: formData.priority,
        locationId: formData.locationId || undefined, // Change from null to undefined
        isCrossLocation: formData.isCrossLocation,
        projectManagerId: formData.projectManagerIds[0]
      };
      await ProjectService.createProject(projectData);
      setShowCreateModal(false);
      resetForm();
      loadProjects();
      toast.success('Project created successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    
    try {
      setLoading(true);
      const projectData = {
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined,
        clientName: formData.clientName || undefined,
        projectManagerIds: formData.projectManagerIds,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        estimatedHours: formData.estimatedHours || undefined,
        budget: formData.budget || undefined,
        priority: formData.priority,
        locationId: formData.locationId || undefined, // Change from null to undefined
        isCrossLocation: formData.isCrossLocation
      };
      
      await ProjectService.updateProject(selectedProject.id, projectData);
      toast.success('Project updated successfully');
      setShowEditModal(false);
      setSelectedProject(null);
      resetForm();
      loadProjects();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      code: project.code,
      description: project.description || '',
      clientName: project.clientName || '',
      projectManagerIds: project.projectManagerIds,
      startDate: project.startDate || '',
      endDate: project.endDate || '',
      estimatedHours: project.estimatedHours || 0,
      budget: project.budget || 0,
      priority: project.priority,
      locationId: project.locationId || '',
      isCrossLocation: project.isCrossLocation
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      clientName: '',
      projectManagerIds: [],
      startDate: '',
      endDate: '',
      estimatedHours: 0,
      budget: 0,
      priority: 'medium',
      locationId: '',
      isCrossLocation: false
    });
  };

  const handleManagerSelection = (managerId: string) => {
    setFormData(prev => ({
      ...prev,
      projectManagerIds: prev.projectManagerIds.includes(managerId)
        ? prev.projectManagerIds.filter(id => id !== managerId)
        : [...prev.projectManagerIds, managerId]
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (project.clientName && project.clientName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = !statusFilter || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Project Management</h1>
        
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add Project
            </button>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Manager
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timeline
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : filteredProjects.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No projects found
                </td>
              </tr>
            ) : (
              filteredProjects.map((project) => {
                const manager = managers.find(m => 
                  project.projectManagerIds?.includes(m.id) || 
                  project.projectManagerId === m.id
                );
                return (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{project.name}</div>
                        <div className="text-sm text-gray-500">{project.code}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {project.clientName || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {manager ? `${manager.firstName} ${manager.lastName}` : 'Unassigned'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(project.priority)}`}>
                        {project.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {project.startDate && project.endDate ? (
                        <div>
                          <div>{new Date(project.startDate).toLocaleDateString()}</div>
                          <div className="text-gray-500">to {new Date(project.endDate).toLocaleDateString()}</div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(project)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Create New Project</h2>
              <form onSubmit={handleCreateProject}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Name
                    </label>
                    <input
                      type="text"
                      value={formData.clientName}
                      onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    {/* Project Managers selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Project Managers * (Select multiple)
                      </label>
                      <div className="border border-gray-300 rounded-md p-2 max-h-40 overflow-y-auto">
                        {managers.length === 0 ? (
                          <p className="text-gray-500 text-sm">No managers available</p>
                        ) : (
                          managers.map((manager) => (
                            <label key={manager.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={formData.projectManagerIds.includes(manager.id)}
                                onChange={() => handleManagerSelection(manager.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm">
                                {manager.firstName} {manager.lastName}
                                <span className="text-gray-500 ml-1">({manager.role})</span>
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                      {formData.projectManagerIds.length === 0 && (
                        <p className="text-red-500 text-xs mt-1">Please select at least one project manager</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estimated Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.estimatedHours}
                      onChange={(e) => setFormData({...formData, estimatedHours: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Budget
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.budget}
                      onChange={(e) => setFormData({...formData, budget: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="isCrossLocation"
                    checked={formData.isCrossLocation}
                    onChange={(e) => setFormData({...formData, isCrossLocation: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isCrossLocation" className="ml-2 text-sm text-gray-700">
                    Cross-location project
                  </label>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Edit Project</h2>
              <form onSubmit={handleUpdateProject}>
                {/* Copy all form fields from create modal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Name
                    </label>
                    <input
                      type="text"
                      value={formData.clientName}
                      onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Managers * (Select multiple)
                    </label>
                    <div className="border border-gray-300 rounded-md p-2 max-h-40 overflow-y-auto">
                      {managers.length === 0 ? (
                        <p className="text-gray-500 text-sm">No managers available</p>
                      ) : (
                        managers.map((manager) => (
                          <label key={manager.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={formData.projectManagerIds.includes(manager.id)}
                              onChange={() => handleManagerSelection(manager.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">
                              {manager.firstName} {manager.lastName}
                              <span className="text-gray-500 ml-1">({manager.role})</span>
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                    {formData.projectManagerIds.length === 0 && (
                      <p className="text-red-500 text-xs mt-1">Please select at least one project manager</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estimated Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.estimatedHours}
                      onChange={(e) => setFormData({...formData, estimatedHours: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Budget
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.budget}
                      onChange={(e) => setFormData({...formData, budget: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="editIsCrossLocation"
                    checked={formData.isCrossLocation}
                    onChange={(e) => setFormData({...formData, isCrossLocation: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="editIsCrossLocation" className="ml-2 text-sm text-gray-700">
                    Cross-location project
                  </label>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedProject(null);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;