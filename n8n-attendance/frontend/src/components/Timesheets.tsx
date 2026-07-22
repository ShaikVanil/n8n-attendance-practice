import React, { useState } from 'react';
import { TimesheetList } from './TimesheetList';
import { TimesheetForm } from './forms/TimesheetForm';
import { Timesheet } from '../types/timesheet';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';

type ViewMode = 'list' | 'create' | 'edit' | 'view';

const Timesheets: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | undefined>();
  const [selectedWeekStart, setSelectedWeekStart] = useState<string | undefined>();

  const handleCreateNew = () => {
    setSelectedTimesheet(undefined);
    setSelectedWeekStart(undefined);
    setViewMode('create');
  };

  const handleEdit = (timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet);
    setViewMode('edit');
  };

  const handleView = (timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet);
    setViewMode('view');
  };

  const handleSuccess = () => {
    setViewMode('list');
    setSelectedTimesheet(undefined);
    setSelectedWeekStart(undefined);
  };

  const handleCancel = () => {
    setViewMode('list');
    setSelectedTimesheet(undefined);
    setSelectedWeekStart(undefined);
  };

  return (
    <div className="space-y-6">
      {viewMode === 'list' && (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Timesheets</h1>
              <p className="text-gray-600 mt-1">Manage your weekly timesheets</p>
            </div>
            <Button onClick={handleCreateNew}>
              Create New Timesheet
            </Button>
          </div>
          <TimesheetList
            onEdit={handleEdit}
            onView={handleView}
          />
        </>
      )}

      {(viewMode === 'create' || viewMode === 'edit') && (
        <>
          <div className="flex items-center space-x-4 mb-6">
            <Button
              variant="outline"
              onClick={handleCancel}
            >
              ← Back to List
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              {viewMode === 'create' ? 'Create New Timesheet' : 'Edit Timesheet'}
            </h1>
          </div>
          <TimesheetForm
            timesheet={selectedTimesheet}
            weekStartDate={selectedWeekStart}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            mode={viewMode === 'create' ? 'create' : 'edit'}
          />
        </>
      )}

      {viewMode === 'view' && selectedTimesheet && (
        <>
          <div className="flex items-center space-x-4 mb-6">
            <Button
              variant="outline"
              onClick={handleCancel}
            >
              ← Back to List
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              View Timesheet
            </h1>
          </div>
          <TimesheetForm
            timesheet={selectedTimesheet}
            onCancel={handleCancel}
            mode="edit"
          />
        </>
      )}
    </div>
  );
};

export default Timesheets;