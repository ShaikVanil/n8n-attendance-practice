import React, { useState, useEffect } from 'react';
import { locationService, LocationTransfer } from '../services/locationService';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { Alert } from './ui/Alert';

interface LocationTransferHistoryProps {
  userId?: string; // If provided, shows history for specific user (admin view)
}

export const LocationTransferHistory: React.FC<LocationTransferHistoryProps> = ({ userId }) => {
  const [transfers, setTransfers] = useState<LocationTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    loadTransferHistory();
  }, [userId]);

  const loadTransferHistory = async () => {
    try {
      setLoading(true);
      const transferHistory = await locationService.getLocationTransfers();
      setTransfers(transferHistory);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load transfer history');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransfers = transfers.filter(transfer => {
    if (filter === 'all') return true;
    return transfer.status === filter;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading transfer history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>
            {userId ? 'Employee Transfer History' : 'My Transfer History'}
          </CardTitle>
          
          {/* Filter Buttons */}
          <div className="flex space-x-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  filter === status
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4 bg-red-50 border-red-200 text-red-800">
            {error}
          </Alert>
        )}

        {filteredTransfers.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 text-lg mb-2">
              {filter === 'all' ? 'No transfer requests found' : `No ${filter} transfer requests`}
            </div>
            <p className="text-gray-400">
              {filter === 'all' 
                ? 'You haven\'t submitted any location transfer requests yet.' 
                : `You don\'t have any ${filter} transfer requests.`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransfers.map((transfer) => (
              <div key={transfer.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <Badge className={getStatusBadgeColor(transfer.status)}>
                      {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
                    </Badge>
                    {transfer.isTemporary && (
                      <Badge className="bg-blue-100 text-blue-800">
                        Temporary
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      Requested: {formatDateTime(transfer.createdAt)}
                    </p>
                    {transfer.approvedAt && (
                      <p className="text-xs text-gray-500">
                        Processed: {formatDateTime(transfer.approvedAt)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">From Location:</p>
                    <p className="text-sm text-gray-600">
                      {(transfer as any).from_location_name || 'No previous location'}
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

                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    {transfer.reason}
                  </p>
                </div>

                {transfer.approvedBy && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      {transfer.status === 'approved' ? 'Approved by:' : 'Rejected by:'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {(transfer as any).approved_by_name || 'Unknown'}
                    </p>
                  </div>
                )}

                {(transfer as any).comments && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Manager Comments:</p>
                    <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded border-l-4 border-blue-200">
                      {(transfer as any).comments}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LocationTransferHistory;