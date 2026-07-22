import React, { useState, useEffect } from 'react';
import { locationService, LocationTransfer } from '../services/locationService';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Alert } from './ui/Alert';

interface ManagerLocationTransferApprovalProps {
  onTransferProcessed?: () => void;
}

export const ManagerLocationTransferApproval: React.FC<ManagerLocationTransferApprovalProps> = ({ 
  onTransferProcessed 
}) => {
  const [pendingTransfers, setPendingTransfers] = useState<LocationTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [selectedTransfer, setSelectedTransfer] = useState<LocationTransfer | null>(null);
  const [reviewComments, setReviewComments] = useState<string>('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');

  useEffect(() => {
    loadPendingTransfers();
  }, []);

  const loadPendingTransfers = async () => {
    try {
      setLoading(true);
      const transfers = await locationService.getPendingLocationTransfers();
      setPendingTransfers(transfers);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load pending transfers');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewTransfer = async (transferId: string, action: 'approve' | 'reject') => {
    setProcessingId(transferId);
    
    try {
      await locationService.reviewLocationTransfer(transferId, action, reviewComments);
      
      // Remove the processed transfer from the list
      setPendingTransfers(prev => prev.filter(t => t.id !== transferId));
      
      // Close modal and reset state
      setShowReviewModal(false);
      setSelectedTransfer(null);
      setReviewComments('');
      
      onTransferProcessed?.();
    } catch (error: any) {
      setError(error.response?.data?.error || `Failed to ${action} transfer`);
    } finally {
      setProcessingId(null);
    }
  };

  const openReviewModal = (transfer: LocationTransfer, action: 'approve' | 'reject') => {
    setSelectedTransfer(transfer);
    setReviewAction(action);
    setShowReviewModal(true);
    setReviewComments('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading pending transfers...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pending Location Transfer Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 bg-red-50 border-red-200 text-red-800">
              {error}
            </Alert>
          )}

          {pendingTransfers.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 text-lg mb-2">No pending transfer requests</div>
              <p className="text-gray-400">All transfer requests have been processed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingTransfers.map((transfer) => (
                <div key={transfer.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {(transfer as any).user_name || 'Unknown User'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {(transfer as any).user_email || ''}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {transfer.status}
                      </Badge>
                      {transfer.isTemporary && (
                        <Badge className="bg-blue-100 text-blue-800">
                          Temporary
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">From Location:</p>
                      <p className="text-sm text-gray-600">
                        {(transfer as any).from_location_name || 'No current location'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">To Location:</p>
                      <p className="text-sm text-gray-600">
                        {(transfer as any).to_location_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Transfer Date:</p>
                      <p className="text-sm text-gray-600">
                        {formatDate(transfer.transferDate)}
                      </p>
                    </div>
                    {transfer.isTemporary && transfer.temporaryEndDate && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Return Date:</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(transfer.temporaryEndDate)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {transfer.reason}
                    </p>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openReviewModal(transfer, 'reject')}
                      disabled={processingId === transfer.id}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => openReviewModal(transfer, 'approve')}
                      disabled={processingId === transfer.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {processingId === transfer.id ? 'Processing...' : 'Approve'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      {showReviewModal && selectedTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {reviewAction === 'approve' ? 'Approve' : 'Reject'} Transfer Request
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Employee:</strong> {(selectedTransfer as any).user_name}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Transfer:</strong> {(selectedTransfer as any).from_location_name || 'No current location'} → {(selectedTransfer as any).to_location_name}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments {reviewAction === 'reject' ? '(Required)' : '(Optional)'}
              </label>
              <textarea
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                placeholder={`Add comments for ${reviewAction === 'approve' ? 'approval' : 'rejection'}...`}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedTransfer(null);
                  setReviewComments('');
                }}
                disabled={processingId === selectedTransfer.id}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleReviewTransfer(selectedTransfer.id, reviewAction)}
                disabled={processingId === selectedTransfer.id || (reviewAction === 'reject' && !reviewComments.trim())}
                className={reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {processingId === selectedTransfer.id ? 'Processing...' : `${reviewAction === 'approve' ? 'Approve' : 'Reject'} Transfer`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ManagerLocationTransferApproval;