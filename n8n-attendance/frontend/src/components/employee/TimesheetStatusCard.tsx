import React from 'react';
import { DailyTimesheet } from '../../types/timesheet';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { CheckCircle, XCircle, Clock, User } from 'lucide-react';

interface TimesheetStatusCardProps {
  timesheet: DailyTimesheet;
}

const TimesheetStatusCard: React.FC<TimesheetStatusCardProps> = ({ timesheet }) => {
  const getStatusIcon = () => {
    switch (timesheet.status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'submitted':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusVariant = () => {
    switch (timesheet.status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'destructive';
      case 'submitted':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span>{timesheet.date}</span>
          </div>
          <Badge variant={getStatusVariant()}>
            {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
          <div>
            <span className="font-medium text-gray-700">Start:</span>
            <p>{timesheet.startTime || 'N/A'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">End:</span>
            <p>{timesheet.endTime || 'N/A'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Hours:</span>
            <p>{timesheet.workHours}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Break:</span>
            <p>{timesheet.breakDuration}min</p>
          </div>
        </div>

        {timesheet.description && (
          <div className="mb-4">
            <span className="font-medium text-gray-700 text-sm">Description:</span>
            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1">{timesheet.description}</p>
          </div>
        )}

        {/* Review Information */}
        {(timesheet.status === 'approved' || timesheet.status === 'rejected') && (
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-700 mb-2 flex items-center">
              <User className="w-4 h-4 mr-1" />
              Review Details
            </h4>
            <div className="space-y-2 text-sm">
              {timesheet.approvedBy && (
                <div>
                  <span className="font-medium text-gray-600">Reviewed by:</span>
                  <span className="ml-2">{timesheet.approvedBy}</span>
                </div>
              )}
              {timesheet.approvedAt && (
                <div>
                  <span className="font-medium text-gray-600">Reviewed on:</span>
                  <span className="ml-2">{new Date(timesheet.approvedAt).toLocaleString()}</span>
                </div>
              )}
              {timesheet.managerComments && (
                <div>
                  <span className="font-medium text-gray-600">Comments:</span>
                  <p className="text-gray-600 bg-gray-50 p-2 rounded mt-1">{timesheet.managerComments}</p>
                </div>
              )}
              {timesheet.rejectionReason && (
                <div>
                  <span className="font-medium text-red-600">Rejection Reason:</span>
                  <p className="text-red-600 bg-red-50 p-2 rounded mt-1">{timesheet.rejectionReason}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {timesheet.submittedAt && timesheet.status === 'submitted' && (
          <div className="border-t pt-4 mt-4 text-sm text-gray-500">
            Submitted: {new Date(timesheet.submittedAt).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TimesheetStatusCard;