import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface RejectReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  timesheetId: string;
  employeeName: string;
}

const RejectReasonModal: React.FC<RejectReasonModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  timesheetId,
  employeeName
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
      onClose();
    } catch (error) {
      console.error('Error rejecting timesheet:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Reject Timesheet
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Employee: <span className="font-medium">{employeeName}</span>
          </p>
          <p className="text-sm text-gray-600">
            Please provide a reason for rejecting this timesheet:
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows={4}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={!reason.trim() || isSubmitting}
            >
              {isSubmitting ? 'Rejecting...' : 'Reject Timesheet'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RejectReasonModal;