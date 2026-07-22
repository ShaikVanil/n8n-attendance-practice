import React, { useState, useEffect } from 'react';
import { useTimesheetStore } from '../../stores/timesheetStore';
import { useAuthStore } from '../../stores/authStore';
import { timesheetService } from '../../services/timesheetService';
import ProjectService, { Project } from '../../services/projectService';
import {
  Timesheet,
  TimesheetEntry,
  TimesheetFormData,
  TimesheetEntryFormData,
  TIMESHEET_STATUS_LABELS
} from '../../types/timesheet';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface TimesheetFormProps {
  timesheet?: Timesheet;
  weekStartDate?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
}

export const TimesheetForm: React.FC<TimesheetFormProps> = ({
  timesheet,
  weekStartDate,
  onSuccess,
  onCancel,
  mode = 'create'
}) => {
  const { user } = useAuthStore();
  const {
    createTimesheet,
    updateTimesheet,
    submitTimesheet,
    autoPopulateFromAttendance,
    loading,
    error,
    clearError
  } = useTimesheetStore();

  const [formData, setFormData] = useState<TimesheetFormData>({
    weekStartDate: weekStartDate || timesheetService.getWeekStartDate(),
    entries: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Load user projects on component mount
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
      const weekDates = timesheetService.getWeekDates(timesheet.weekStartDate);
      const entries: TimesheetEntryFormData[] = weekDates.map(date => {
        const existingEntry = timesheet.entries?.find(e => e.date === date);
        return {
          id: existingEntry?.id,
          date,
          startTime: existingEntry?.startTime || '',
          endTime: existingEntry?.endTime || '',
          breakDuration: existingEntry?.breakDuration || 0,
          description: existingEntry?.description || '',
          projectCode: existingEntry?.projectCode || ''
        };
      });
      
      setFormData({
        weekStartDate: timesheet.weekStartDate,
        entries
      });
    } else {
      // Initialize with empty week entries
      const currentWeekStart = weekStartDate || timesheetService.getWeekStartDate();
      const weekDates = timesheetService.getWeekDates(currentWeekStart);
      const entries: TimesheetEntryFormData[] = weekDates.map(date => ({
        date,
        startTime: '',
        endTime: '',
        breakDuration: 0,
        description: '',
        projectCode: ''
      }));
      
      setFormData({
        weekStartDate: currentWeekStart,
        entries
      });
    }
  }, [timesheet, weekStartDate]);

  // Clear error when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Validate that at least one entry has time data
    const hasValidEntry = formData.entries.some(entry => 
      entry.startTime && entry.endTime
    );
    
    if (!hasValidEntry) {
      newErrors.general = 'Please add at least one time entry for the week';
    }
    
    // Validate individual entries
    formData.entries.forEach((entry, index) => {
      if (entry.startTime && !entry.endTime) {
        newErrors[`entry_${index}_endTime`] = 'End time is required when start time is provided';
      }
      
      if (!entry.startTime && entry.endTime) {
        newErrors[`entry_${index}_startTime`] = 'Start time is required when end time is provided';
      }
      
      if (entry.startTime && entry.endTime) {
        const startTime = new Date(`${entry.date}T${entry.startTime}`);
        const endTime = new Date(`${entry.date}T${entry.endTime}`);
        
        if (startTime >= endTime) {
          newErrors[`entry_${index}_time`] = 'End time must be after start time';
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEntryChange = (index: number, field: keyof TimesheetEntryFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      entries: prev.entries.map((entry, i) => 
        i === index ? { ...entry, [field]: value } : entry
      )
    }));
    
    // Clear specific field errors
    if (errors[`entry_${index}_${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`entry_${index}_${field}`];
        return newErrors;
      });
    }
  };

  const calculateWorkHours = (entry: TimesheetEntryFormData): number => {
    if (!entry.startTime || !entry.endTime) return 0;
    
    const startDateTime = `${entry.date}T${entry.startTime}`;
    const endDateTime = `${entry.date}T${entry.endTime}`;
    
    return timesheetService.calculateWorkHours(startDateTime, endDateTime, entry.breakDuration);
  };

  const getTotalHours = (): number => {
    return formData.entries.reduce((total, entry) => total + calculateWorkHours(entry), 0);
  };

  const handleAutoPopulate = async () => {
    if (!timesheet?.id) return;
    
    try {
      await autoPopulateFromAttendance(timesheet.id, formData.weekStartDate);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to auto-populate:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent, submitForApproval = false) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const entries = formData.entries
        .filter(entry => entry.startTime && entry.endTime)
        .map(entry => ({
          id: entry.id,
          date: entry.date,
          startTime: entry.startTime,
          endTime: entry.endTime,
          breakDuration: entry.breakDuration,
          description: entry.description,
          projectCode: entry.projectCode,
          workHours: calculateWorkHours(entry)
        }));
    
      if (mode === 'create') {
        const newTimesheet = await createTimesheet({
          weekStartDate: formData.weekStartDate,
          entries
        });
        
        if (submitForApproval && newTimesheet) {
          await submitTimesheet(newTimesheet.id);
        }
      } else if (timesheet) {
        await updateTimesheet(timesheet.id, {
          entries,
          status: submitForApproval ? 'submitted' : 'draft'
        });
        
        if (submitForApproval) {
          await submitTimesheet(timesheet.id);
        }
      }
      
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess?.();
      }, 1500);
      
    } catch (error) {
      console.error('Failed to save timesheet:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const weekEndDate = timesheetService.getWeekEndDate(formData.weekStartDate);
  const totalHours = getTotalHours();
  const canSubmit = timesheet?.status === 'draft' || mode === 'create';
  const canEdit = timesheet?.status === 'draft' || timesheet?.status === 'rejected' || mode === 'create';

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>
              {mode === 'create' ? 'Create Timesheet' : 'Edit Timesheet'}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Week of {new Date(formData.weekStartDate).toLocaleDateString()} - {new Date(weekEndDate).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {timesheet?.status && (
              <Badge variant={timesheet.status === 'approved' ? 'success' : 
                             timesheet.status === 'rejected' ? 'destructive' : 
                             timesheet.status === 'submitted' ? 'warning' : 'secondary'}>
                {TIMESHEET_STATUS_LABELS[timesheet.status]}
              </Badge>
            )}
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Hours</p>
              <p className="text-lg font-semibold">{totalHours.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              {error}
            </Alert>
          )}
          
          {showSuccess && (
            <Alert variant="default">
              Timesheet saved successfully!
            </Alert>
          )}
          
          {errors.general && (
            <Alert variant="destructive">
              {errors.general}
            </Alert>
          )}

          {/* Auto-populate button */}
          {timesheet && canEdit && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleAutoPopulate}
                disabled={loading}
              >
                Auto-populate from Attendance
              </Button>
            </div>
          )}

          {/* Week entries */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Time Entries</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      End Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Break (min)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Work Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formData.entries.map((entry, index) => {
                    const dayName = new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short' });
                    const workHours = calculateWorkHours(entry);
                    
                    return (
                      <tr key={entry.date} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {dayName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(entry.date).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Input
                            type="time"
                            value={entry.startTime}
                            onChange={(e) => handleEntryChange(index, 'startTime', e.target.value)}
                            disabled={!canEdit || loading}
                            className={errors[`entry_${index}_startTime`] ? 'border-red-500' : ''}
                          />
                          {errors[`entry_${index}_startTime`] && (
                            <p className="text-xs text-red-500 mt-1">{errors[`entry_${index}_startTime`]}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Input
                            type="time"
                            value={entry.endTime}
                            onChange={(e) => handleEntryChange(index, 'endTime', e.target.value)}
                            disabled={!canEdit || loading}
                            className={errors[`entry_${index}_endTime`] ? 'border-red-500' : ''}
                          />
                          {errors[`entry_${index}_endTime`] && (
                            <p className="text-xs text-red-500 mt-1">{errors[`entry_${index}_endTime`]}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Input
                            type="number"
                            min="0"
                            max="480"
                            value={entry.breakDuration.toString()}
                            onChange={(e) => handleEntryChange(index, 'breakDuration', parseInt(e.target.value) || 0)}
                            disabled={!canEdit || loading}
                            className="w-20"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {workHours.toFixed(2)}h
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Input
                            type="text"
                            placeholder="Work description"
                            value={entry.description}
                            onChange={(e) => handleEntryChange(index, 'description', e.target.value)}
                            disabled={!canEdit || loading}
                            className="w-48"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action buttons */}
          {canEdit && (
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <div className="flex space-x-3">
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={loading || isSubmitting}
                  >
                    Cancel
                  </Button>
                )}
              </div>
              
              <div className="flex space-x-3">
                <Button
                  type="submit"
                  variant="outline"
                  disabled={loading || isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save as Draft'}
                </Button>
                
                {canSubmit && (
                  <Button
                    type="button"
                    onClick={(e) => handleSubmit(e, true)}
                    disabled={loading || isSubmitting || totalHours === 0}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {/* Read-only view for submitted/approved timesheets */}
          {!canEdit && (
            <div className="pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  This timesheet cannot be edited in its current status.
                </p>
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default TimesheetForm;