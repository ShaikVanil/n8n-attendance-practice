import React, { useState, useEffect } from 'react';
import { dailyTimesheetService } from '../services/dailyTimesheetService';
import {
  DailyTimesheet as DailyTimesheetType,
  DailyTimesheetFormData,
  TIMESHEET_STATUS_LABELS
} from '../types/timesheet';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Alert } from './ui/Alert';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { Calendar, Save, Send } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import ProjectService, { Project } from '../services/projectService';

interface DailyTimesheetProps {
  date?: string;
  timesheet?: DailyTimesheetType;
  onSuccess?: () => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit' | 'view';
}

const DailyTimesheet: React.FC<DailyTimesheetProps> = ({
  date,
  timesheet,
  onSuccess,
  onCancel,
  mode = 'create'
}) => {
  const [formData, setFormData] = useState<DailyTimesheetFormData>({
    date: date || dailyTimesheetService.getTodayDate(),
    startTime: '',
    endTime: '',
    breakDuration: 0,
    description: '',
    projectCode: '',
    taskName: '' // Add taskName for multiple timesheets support
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [workHours, setWorkHours] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Load projects
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

  // Initialize form data
  useEffect(() => {
    if (timesheet) {
      setFormData({
        date: timesheet.date,
        startTime: timesheet.startTime || '',
        endTime: timesheet.endTime || '',
        breakDuration: timesheet.breakDuration || 0,
        description: timesheet.description || '',
        projectCode: timesheet.projectCode || '',
        taskName: timesheet.taskName || ''
      });
    }
  }, [timesheet]);

  // Calculate work hours when times change
  useEffect(() => {
    const hours = dailyTimesheetService.calculateWorkHours(
      formData.startTime,
      formData.endTime,
      formData.breakDuration
    );
    setWorkHours(hours);
  }, [formData.startTime, formData.endTime, formData.breakDuration]);

  const handleInputChange = (field: keyof DailyTimesheetFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate required fields
      if (!formData.taskName.trim()) {
        setError('Task name is required');
        return;
      }
      
      if (!formData.startTime || !formData.endTime) {
        setError('Start time and end time are required');
        return;
      }

      if (timesheet?.id) {
        await dailyTimesheetService.updateDailyTimesheet(timesheet.id, formData);
        toast.success('Timesheet updated successfully');
      } else {
        await dailyTimesheetService.createDailyTimesheet(formData);
        toast.success('Timesheet created successfully');
      }
      
      setSuccess('Timesheet saved successfully');
      onSuccess?.();
    } catch (error: any) {
      console.error('Save failed:', error);
      setError(error.response?.data?.message || 'Failed to save timesheet');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (timesheet) {
        await dailyTimesheetService.submitDailyTimesheet(timesheet.id);
        setSuccess('Daily timesheet submitted successfully');
        onSuccess?.();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to submit timesheet');
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
    }
  };

  const handleSubmitClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = () => {
    handleSubmit();
  };

  const handleCancelSubmit = () => {
    setShowConfirmDialog(false);
  };

  const canEdit = mode !== 'view' && (!timesheet || timesheet.status === 'draft');
  const canSubmit = canEdit && timesheet?.status === 'draft';

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle className="text-xl font-semibold">
                Daily Timesheet - {format(new Date(formData.date), 'MMMM dd, yyyy')}
              </CardTitle>
              {timesheet && (
                <Badge 
                  variant={timesheet.status === 'approved' ? 'default' : 
                          timesheet.status === 'submitted' ? 'secondary' : 'outline'}
                  className="mt-1"
                >
                  {TIMESHEET_STATUS_LABELS[timesheet.status]}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-gray-600">Work Hours</p>
            <p className="text-lg font-semibold">{workHours.toFixed(2)}</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert variant="default">
            {success}
          </Alert>
        )}

        {/* Task Name Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Task Name *
          </label>
          <Input
            type="text"
            value={formData.taskName}
            onChange={(e) => handleInputChange('taskName', e.target.value)}
            disabled={!canEdit || loading}
            placeholder="Enter task or project name"
            className="w-full"
          />
        </div>

        {/* Time entries */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Time
            </label>
            <Input
              type="time"
              value={formData.startTime}
              onChange={(e) => handleInputChange('startTime', e.target.value)}
              disabled={!canEdit || loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Time
            </label>
            <Input
              type="time"
              value={formData.endTime}
              onChange={(e) => handleInputChange('endTime', e.target.value)}
              disabled={!canEdit || loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Break Duration (minutes)
            </label>
            <Input
              type="number"
              min="0"
              max="480"
              value={formData.breakDuration.toString()}
              onChange={(e) => handleInputChange('breakDuration', parseInt(e.target.value) || 0)}
              disabled={!canEdit || loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Calculated Hours
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm">
              {workHours.toFixed(2)} hours
            </div>
          </div>
        </div>

        {/* Description and Project Code */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={!canEdit || loading}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe the work performed..."
            />
          </div>
          
          <div>
            // Replace the project code input with:
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project
              </label>
              <select
                value={formData.projectCode}
                onChange={(e) => handleInputChange('projectCode', e.target.value)}
                disabled={!canEdit || loading || loadingProjects}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        </div>

        {/* Action buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          )}
          
          {canEdit && (
            <Button
              type="button"
              onClick={handleSave}
              disabled={loading || !formData.taskName.trim()}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{timesheet?.id ? 'Update' : 'Save'} Timesheet</span>
            </Button>
          )}
          
          {canSubmit && (
            <Button
              type="button"
              onClick={() => setShowConfirmDialog(true)}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>Submit for Approval</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};