import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Clock, Save, X } from "lucide-react";
import { dailyTimesheetService } from "../services/dailyTimesheetService";
import {
  DailyTimesheet,
  DailyTimesheetSummary,
  CreateDailyTimesheetRequest,
  UpdateDailyTimesheetRequest,
} from "../types/timesheet";
import ProjectService, { Project } from '../services/projectService';

interface DailyTimesheetListProps {
  date?: string; // Make optional
  onTimesheetsChange?: (timesheets: DailyTimesheet[]) => void;
}
interface TimesheetFormData {
  taskName: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  description: string;
  projectCode: string;
  locationId: string;
}
const DailyTimesheetList: React.FC<DailyTimesheetListProps> = ({
  date: propDate,
  onTimesheetsChange,
}) => {
  // Use provided date or default to today
  const date = propDate || dailyTimesheetService.getTodayDate();

  const [timesheets, setTimesheets] = useState<DailyTimesheet[]>([]);
  const [summary, setSummary] = useState<DailyTimesheetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Add these state variables
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [formData, setFormData] = useState<TimesheetFormData>({
    taskName: "",
    startTime: "",
    endTime: "",
    breakDuration: 0,
    description: "",
    projectCode: "",
    locationId: "",
  });

  useEffect(() => {
    loadTimesheets();
  }, [date]);

  // Add this useEffect for loading projects
  useEffect(() => {
    const loadProjects = async () => {
      setLoadingProjects(true);
      try {
        const userProjects = await ProjectService.getUserProjects();
        setProjects(userProjects);
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setLoadingProjects(false);
      }
    };
  
    loadProjects();
  }, []);

  const loadTimesheets = async () => {
    try {
      setLoading(true);
      const [timesheetsData, summaryData] = await Promise.all([
        dailyTimesheetService.getDailyTimesheetsByDate(date),
        dailyTimesheetService.getDailySummary(date),
      ]);

      setTimesheets(timesheetsData);
      setSummary(summaryData);
      onTimesheetsChange?.(timesheetsData);
    } catch (err: any) {
      setError(err.message || "Failed to load timesheets");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof TimesheetFormData,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const calculateWorkHours = () => {
    return dailyTimesheetService.calculateWorkHours(
      formData.startTime,
      formData.endTime,
      formData.breakDuration
    );
  };

  // Update the form validation to ensure required fields
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.taskName.trim() || !formData.startTime || !formData.endTime) {
      setError("Task name, start time, and end time are required");
      return;
    }

    try {
      setError(null);

      if (editingId) {
        // Update existing timesheet
        const updateData: UpdateDailyTimesheetRequest = {
          taskName: formData.taskName,
          startTime: formData.startTime,
          endTime: formData.endTime,
          breakDuration: formData.breakDuration,
          description: formData.description,
          projectCode: formData.projectCode,
        };

        await dailyTimesheetService.updateDailyTimesheet(editingId, updateData);
        setEditingId(null);
      } else {
        // Create new timesheet - ensure all required fields are provided
        const createData: CreateDailyTimesheetRequest = {
          date,
          taskName: formData.taskName,
          startTime: formData.startTime, // Now guaranteed to be string
          endTime: formData.endTime, // Now guaranteed to be string
          breakDuration: formData.breakDuration,
          description: formData.description,
          projectCode: formData.projectCode,
        };

        await dailyTimesheetService.createDailyTimesheet(createData);
        setShowAddForm(false);
      }

      // Reset form
      setFormData({
        taskName: "",
        startTime: "",
        endTime: "",
        breakDuration: 0,
        description: "",
        projectCode: "",
        locationId: "",
      });

      await loadTimesheets();
    } catch (err: any) {
      setError(err.message || "Failed to save timesheet");
    }
  };

  const handleEdit = (timesheet: DailyTimesheet) => {
    setFormData({
      taskName: timesheet.taskName,
      startTime: timesheet.startTime || "",
      endTime: timesheet.endTime || "",
      breakDuration: timesheet.breakDuration,
      description: timesheet.description || "",
      projectCode: timesheet.projectCode || "",
      locationId: timesheet.locationId || ""
    });
    setEditingId(timesheet.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await dailyTimesheetService.deleteDailyTimesheet(id);
      await loadTimesheets();
    } catch (err: any) {
      setError(err.message || "Failed to delete timesheet");
    }
  };

  const handleSubmitAll = async () => {
    try {
      setSubmitting(true);
      await dailyTimesheetService.submitDailyTimesheets(date);
      await loadTimesheets();
      setShowConfirmDialog(false);
    } catch (err: any) {
      setError(err.message || "Failed to submit timesheets");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    timesheets.length > 0 && timesheets.every((t) => t.status === "draft");
  const totalHours = dailyTimesheetService.calculateTotalHours(timesheets);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Daily Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Daily Timesheets - {new Date(date).toLocaleDateString()}
          </h2>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <Clock className="inline w-4 h-4 mr-1" />
              Total: {totalHours.toFixed(2)} hours
            </div>
            {canSubmit && (
              <button
                onClick={() => setShowConfirmDialog(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Submit All
              </button>
            )}
          </div>
        </div>

        {timesheets.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            No timesheets for this date. Click "Add Task" to get started.
          </p>
        )}
      </div>

      {/* Timesheet List */}
      {timesheets.map((timesheet) => (
        <div key={timesheet.id} className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-lg font-medium text-gray-900">
                  {timesheet.taskName}
                </h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    timesheet.status === "draft"
                      ? "bg-gray-100 text-gray-800"
                      : timesheet.status === "submitted"
                      ? "bg-yellow-100 text-yellow-800"
                      : timesheet.status === "approved"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {timesheet.status.charAt(0).toUpperCase() +
                    timesheet.status.slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Time:</span>
                  <br />
                  {timesheet.startTime} - {timesheet.endTime}
                </div>
                <div>
                  <span className="font-medium">Break:</span>
                  <br />
                  {timesheet.breakDuration} minutes
                </div>
                <div>
                  <span className="font-medium">Hours:</span>
                  <br />
                  {timesheet.workHours.toFixed(2)}
                </div>
                <div>
                  <span className="font-medium">Project:</span>
                  <br />
                  {timesheet.projectCode || "N/A"}
                </div>
              </div>

              {timesheet.description && (
                <div className="mt-3">
                  <span className="font-medium text-sm text-gray-600">
                    Description:
                  </span>
                  <p className="text-sm text-gray-700 mt-1">
                    {timesheet.description}
                  </p>
                </div>
              )}
            </div>

            {timesheet.status === "draft" && (
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => handleEdit(timesheet)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(timesheet.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {editingId ? "Edit Task" : "Add New Task"}
            </h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingId(null);
                setFormData({
                  taskName: "",
                  startTime: "",
                  endTime: "",
                  breakDuration: 0,
                  description: "",
                  projectCode: "",
                  locationId: ""
                });
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Name *
                </label>
                <input
                  type="text"
                  value={formData.taskName}
                  onChange={(e) =>
                    handleInputChange("taskName", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Development, Meeting, Documentation"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project
                </label>
                <select
                  value={formData.projectCode}
                  onChange={(e) => handleInputChange("projectCode", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loadingProjects}
                >
                  <option value="">Select Project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.code}>
                      {project.code} - {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    handleInputChange("startTime", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange("endTime", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Break (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.breakDuration}
                  onChange={(e) =>
                    handleInputChange(
                      "breakDuration",
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Task description..."
              />
            </div>

            {formData.startTime && formData.endTime && (
              <div className="text-sm text-gray-600">
                Calculated work hours: {calculateWorkHours().toFixed(2)} hours
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingId ? "Update Task" : "Add Task"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Task Button */}
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add New Task
        </button>
      )}

      {/* Submit Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Submit All Timesheets?
            </h3>
            <p className="text-gray-600 mb-6">
              You are about to submit {timesheets.length} timesheet(s) for{" "}
              {new Date(date).toLocaleDateString()}. Total hours:{" "}
              {totalHours.toFixed(2)}. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={submitting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAll}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  "Submit All"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}
    </div>
  );
};

export default DailyTimesheetList;
