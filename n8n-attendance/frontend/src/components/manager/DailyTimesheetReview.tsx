// Create a new component for reviewing daily timesheets
import React, { useState, useEffect } from 'react';
import { dailyTimesheetService } from '../../services/dailyTimesheetService';
import { DailyTimesheet, TIMESHEET_STATUS_LABELS } from '../../types/timesheet';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { CheckCircle, XCircle, Eye, User } from 'lucide-react';
import RejectReasonModal from '../ui/RejectReasonModal';

interface DailyTimesheetWithUser extends DailyTimesheet {
  user?: {
    id: string;
    name: string;
    department?: string;
  };
  creator?: {
    name: string;
  };
}

const DailyTimesheetReview: React.FC = () => {
  const [timesheets, setTimesheets] = useState<DailyTimesheetWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimesheet, setSelectedTimesheet] = useState<DailyTimesheetWithUser | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [timesheetToReject, setTimesheetToReject] = useState<DailyTimesheetWithUser | null>(null);

  useEffect(() => {
    loadPendingTimesheets();
  }, []);

  const loadPendingTimesheets = async () => {
    try {
      setLoading(true);
      const result = await dailyTimesheetService.getDailyTimesheetsForReview({
        status: 'submitted',
        limit: 50
      });
      setTimesheets(result.timesheets);
    } catch (error) {
      console.error('Error loading timesheets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (timesheetId: string) => {
    try {
      await dailyTimesheetService.approveDailyTimesheet(timesheetId);
      loadPendingTimesheets(); // Reload list
    } catch (error) {
      console.error('Error approving timesheet:', error);
    }
  };

  const handleRejectClick = (timesheet: DailyTimesheetWithUser) => {
    setTimesheetToReject(timesheet);
    setRejectModalOpen(true);
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!timesheetToReject) return;
    
    try {
      await dailyTimesheetService.rejectDailyTimesheet(timesheetToReject.id, reason);
      loadPendingTimesheets(); // Reload list
    } catch (error) {
      console.error('Error rejecting timesheet:', error);
      throw error; // Re-throw to handle in modal
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Timesheet Review</h1>
          <p className="text-gray-600">Review and approve employee daily timesheets</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Timesheets ({timesheets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : timesheets.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <p className="text-gray-500">No pending timesheets to review</p>
            </div>
          ) : (
            <div className="space-y-4">
              {timesheets.map((timesheet) => (
                <div key={timesheet.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <h3 className="font-medium">{timesheet.date}</h3>
                        <Badge variant="warning">
                          {TIMESHEET_STATUS_LABELS[timesheet.status]}
                        </Badge>
                        {timesheet.user && (
                          <div className="flex items-center text-sm text-gray-600">
                            <User className="w-4 h-4 mr-1" />
                            <span>{timesheet.user.name}</span>
                            {timesheet.user.department && (
                              <span className="ml-2 text-gray-400">({timesheet.user.department})</span>
                            )}
                          </div>
                        )}
                        {timesheet.creator && (
                          <div className="text-sm text-gray-500">
                            Created by: {timesheet.creator.name}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Start:</span> {timesheet.startTime || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">End:</span> {timesheet.endTime || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Hours:</span> {timesheet.workHours}
                        </div>
                        <div>
                          <span className="font-medium">Break:</span> {timesheet.breakDuration}min
                        </div>
                      </div>
                      {timesheet.description && (
                        <div className="mt-2">
                          <span className="font-medium text-sm">Description:</span>
                          <p className="text-sm text-gray-600">{timesheet.description}</p>
                        </div>
                      )}
                      {timesheet.submittedAt && (
                        <div className="mt-2 text-xs text-gray-500">
                          Submitted: {new Date(timesheet.submittedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedTimesheet(timesheet)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-300 text-green-700 hover:bg-green-50"
                        onClick={() => handleApprove(timesheet.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => {
                          const reason = prompt('Rejection reason:');
                          if (reason) handleRejectConfirm(reason);
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed View Modal */}
      {selectedTimesheet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Timesheet Details</h2>
              <Button variant="ghost" onClick={() => setSelectedTimesheet(null)}>×</Button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Employee</label>
                  <p className="text-sm">{selectedTimesheet.user?.name || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date</label>
                  <p className="text-sm">{selectedTimesheet.date}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Start Time</label>
                  <p className="text-sm">{selectedTimesheet.startTime || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">End Time</label>
                  <p className="text-sm">{selectedTimesheet.endTime || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Work Hours</label>
                  <p className="text-sm">{selectedTimesheet.workHours}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Break Duration</label>
                  <p className="text-sm">{selectedTimesheet.breakDuration} minutes</p>
                </div>
              </div>
              {selectedTimesheet.description && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <p className="text-sm bg-gray-50 p-3 rounded">{selectedTimesheet.description}</p>
                </div>
              )}
              <div className="flex space-x-2 pt-4">
                <Button
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-50"
                  onClick={() => {
                    handleApprove(selectedTimesheet.id);
                    setSelectedTimesheet(null);
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => {
                    const reason = prompt('Rejection reason:');
                    if (reason) {
                      handleRejectConfirm(reason);
                      setSelectedTimesheet(null);
                    }
                  }}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyTimesheetReview;