import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';
import { Badge } from './ui/Badge';
import { Calendar, Users, Clock, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { delegationService } from '../services/delegationService';
import { UserService, User } from '../services/userService';
import {
  ApprovalDelegation,
  CreateDelegationRequest,
  DelegationFilters
} from '../types/leave';

interface DelegationManagementProps {
  className?: string;
}

const DelegationManagement: React.FC<DelegationManagementProps> = ({ className }) => {
  const { user } = useAuthStore();
  const [delegations, setDelegations] = useState<ApprovalDelegation[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateDelegationRequest>({
    delegateId: '',
    delegationType: 'leave_approval', // Add default value
    startDate: '',
    endDate: '',
    reason: ''
  });

  useEffect(() => {
    loadDelegations();
    loadManagers();
  }, []);

  const loadDelegations = async () => {
    try {
      setLoading(true);
      const response = await delegationService.getMyDelegations();
      setDelegations(response.data);
    } catch (error) {
      console.error('Error loading delegations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadManagers = async () => {
    try {
      // Fix: Add getManagers method to UserService or use getUsers with role filter
      const response = await UserService.getUsers(1, 100); // Get all users
      const managers = response.users.filter(user => user.role === 'manager' || user.role === 'admin');
      setManagers(managers);
    } catch (error) {
      console.error('Error loading managers:', error);
    }
  };

  const handleCreateDelegation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await delegationService.createDelegation(formData);
      setShowForm(false);
      setFormData({
        delegateId: '',
        delegationType: 'leave_approval', // Add default value
        startDate: '',
        endDate: '',
        reason: ''
      });
      await loadDelegations();
    } catch (error) {
      console.error('Error creating delegation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateDelegation = async (delegationId: string) => {
    try {
      setLoading(true);
      await delegationService.deactivateDelegation(delegationId);
      await loadDelegations();
    } catch (error) {
      console.error('Error deactivating delegation:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (delegation: ApprovalDelegation) => {
    const now = new Date();
    const startDate = new Date(delegation.startDate);
    const endDate = delegation.endDate ? new Date(delegation.endDate) : null;

    if (!delegation.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (now < startDate) {
      return <Badge variant="outline">Scheduled</Badge>;
    }
    if (endDate && now > endDate) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Approval Delegation
            </CardTitle>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'Delegate Authority'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleCreateDelegation} className="space-y-4 mb-6 p-4 border rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="delegateId">Delegate To</Label>
                  <Select
                    value={formData.delegateId}
                    onValueChange={(value) => setFormData({ ...formData, delegateId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.firstName} {manager.lastName} ({manager.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="reason">Reason</Label>
                  <Input
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Vacation, business trip, etc."
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Creating...' : 'Create Delegation'}
              </Button>
            </form>
          )}

          <div className="space-y-4">
            {loading && delegations.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading delegations...</p>
              </div>
            ) : delegations.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No delegations found</p>
                <p className="text-sm text-gray-500">Create a delegation to get started</p>
              </div>
            ) : (
              delegations.map((delegation) => {
                const delegateManager = managers.find(m => m.id === delegation.delegateId);
                return (
                  <div key={delegation.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">
                          {delegateManager?.firstName} {delegateManager?.lastName || 'Unknown Manager'}
                        </span>
                        {getStatusBadge(delegation)}
                      </div>
                      {delegation.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeactivateDelegation(delegation.id)}
                          disabled={loading}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(delegation.startDate)} - {delegation.endDate ? formatDate(delegation.endDate) : 'Ongoing'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Created: {formatDate(delegation.createdAt)}
                      </div>
                      <div>
                        Reason: {delegation.reason}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DelegationManagement;