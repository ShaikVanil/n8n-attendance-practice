import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';
import { Badge } from './ui/Badge';
import { Trash2, Play, Settings, Plus, Calendar, Database } from 'lucide-react';
import { dataRetentionService } from '../services/dataRetentionService';

interface DataRetentionPolicy {
  id: string;
  data_type: string;
  retention_period_days: number;
  description?: string;
  legal_basis?: string;
  auto_delete: boolean;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

interface RetentionExecution {
  id: string;
  policy_id: string;
  execution_date: Date;
  records_processed: number;
  records_deleted: number;
  execution_status: 'running' | 'completed' | 'failed' | 'cancelled';
  error_message?: string;
  execution_duration_seconds?: number;
}

interface RetentionStatistics {
  totalPolicies: number;
  activePolicies: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalRecordsDeleted: number;
  lastExecutionDate?: Date;
}

const DataRetentionManager: React.FC = () => {
  const [policies, setPolicies] = useState<DataRetentionPolicy[]>([]);
  const [executions, setExecutions] = useState<RetentionExecution[]>([]);
  const [statistics, setStatistics] = useState<RetentionStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'policies' | 'executions' | 'statistics'>('policies');
  
  const [newPolicy, setNewPolicy] = useState({
    data_type: '',
    retention_period_days: 365,
    description: '',
    legal_basis: '',
    auto_delete: false,
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [policiesData, executionsData, statsData] = await Promise.all([
        dataRetentionService.getPolicies(),
        dataRetentionService.getExecutions(),
        dataRetentionService.getStatistics()
      ]);
      
      // Add null checks and default to empty arrays
      setPolicies(policiesData?.policies || []);
      setExecutions(executionsData?.executions || []);
      setStatistics(statsData || null);
    } catch (error) {
      console.error('Error loading data retention data:', error);
      // Set default empty states on error
      setPolicies([]);
      setExecutions([]);
      setStatistics(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePolicy = async () => {
    try {
      await dataRetentionService.createPolicy(newPolicy);
      setNewPolicy({
        data_type: '',
        retention_period_days: 365,
        description: '',
        legal_basis: '',
        auto_delete: false,
        is_active: true
      });
      setShowCreateForm(false);
      loadData();
    } catch (error) {
      console.error('Error creating policy:', error);
    }
  };

  const handleExecutePolicy = async (policyId: string) => {
    try {
      await dataRetentionService.executePolicy(policyId);
      loadData();
    } catch (error) {
      console.error('Error executing policy:', error);
    }
  };

  const handleExecuteAll = async () => {
    try {
      await dataRetentionService.executeAllPolicies();
      loadData();
    } catch (error) {
      console.error('Error executing all policies:', error);
    }
  };

  const handleDeletePolicy = async (policyId: string) => {
    if (window.confirm('Are you sure you want to delete this policy?')) {
      try {
        await dataRetentionService.deletePolicy(policyId);
        loadData();
      } catch (error) {
        console.error('Error deleting policy:', error);
      }
    }
  };

  const formatDataType = (dataType: string) => {
    return dataType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDuration = (days: number) => {
    if (days >= 365) {
      const years = Math.floor(days / 365);
      const remainingDays = days % 365;
      return remainingDays > 0 ? `${years}y ${remainingDays}d` : `${years} year${years > 1 ? 's' : ''}`;
    }
    return `${days} day${days > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading data retention policies...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Data Retention Management</h1>
        <div className="flex gap-2">
          <Button onClick={handleExecuteAll} variant="outline">
            <Play className="w-4 h-4 mr-2" />
            Execute All Policies
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Policy
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { key: 'policies', label: 'Policies', icon: Settings },
          { key: 'executions', label: 'Execution History', icon: Calendar },
          { key: 'statistics', label: 'Statistics', icon: Database }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSelectedTab(key as any)}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedTab === key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </button>
        ))}
      </div>

      {/* Create Policy Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Retention Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Data Type</label>
                <Select value={newPolicy.data_type} onValueChange={(value) => setNewPolicy({...newPolicy, data_type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select data type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attendance_records">Attendance Records</SelectItem>
                    <SelectItem value="audit_logs">Audit Logs</SelectItem>
                    <SelectItem value="automation_logs">Automation Logs</SelectItem>
                    <SelectItem value="compliance_violations">Compliance Violations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Retention Period (Days)</label>
                <Input
                  type="number"
                  value={newPolicy.retention_period_days.toString()}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setNewPolicy({...newPolicy, retention_period_days: Math.max(1, value)});
                  }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input
                value={newPolicy.description}
                onChange={(e) => setNewPolicy({...newPolicy, description: e.target.value})}
                placeholder="Policy description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Legal Basis</label>
              <Input
                value={newPolicy.legal_basis}
                onChange={(e) => setNewPolicy({...newPolicy, legal_basis: e.target.value})}
                placeholder="Legal or compliance basis"
              />
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newPolicy.auto_delete}
                  onChange={(e) => setNewPolicy({...newPolicy, auto_delete: e.target.checked})}
                  className="mr-2"
                />
                Auto Delete
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newPolicy.is_active}
                  onChange={(e) => setNewPolicy({...newPolicy, is_active: e.target.checked})}
                  className="mr-2"
                />
                Active
              </label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
              <Button onClick={handleCreatePolicy}>Create Policy</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content based on selected tab */}
      {selectedTab === 'policies' && (
        <div className="grid gap-4">
          {policies.map((policy) => (
            <Card key={policy.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold">{formatDataType(policy.data_type)}</h3>
                      // Fix for lines 275-276: Use proper Badge variants
                      <Badge variant={policy.is_active ? 'default' : 'outline'}>
                        {policy.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {policy.auto_delete && (
                        <Badge variant="outline">Auto Delete</Badge>
                      )}
                    </div>
                    <p className="text-gray-600">{policy.description}</p>
                    <div className="text-sm text-gray-500">
                      <p>Retention Period: {formatDuration(policy.retention_period_days)}</p>
                      {policy.legal_basis && <p>Legal Basis: {policy.legal_basis}</p>}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExecutePolicy(policy.id!)}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeletePolicy(policy.id!)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedTab === 'executions' && (
        <Card>
          <CardHeader>
            <CardTitle>Execution History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {executions.map((execution) => (
                <div key={execution.id} className="border-b pb-4 last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2">
                        // Fix for lines 330-331: Use only valid Badge variants
                        <Badge 
                          variant={
                            execution.execution_status === 'completed' ? 'default' : 'outline'
                          }
                        >
                          {execution.execution_status}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(execution.execution_date).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm mt-1">
                        Processed: {execution.records_processed} | Deleted: {execution.records_deleted}
                      </p>
                      {execution.error_message && (
                        <p className="text-sm text-red-600 mt-1">{execution.error_message}</p>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {execution.execution_duration_seconds && (
                        <span>{execution.execution_duration_seconds}s</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedTab === 'statistics' && statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{statistics.totalPolicies}</div>
              <p className="text-gray-600">Total Policies</p>
              <p className="text-sm text-green-600">{statistics.activePolicies} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{statistics.totalExecutions}</div>
              <p className="text-gray-600">Total Executions</p>
              <p className="text-sm text-green-600">{statistics.successfulExecutions} successful</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{statistics.totalRecordsDeleted.toLocaleString()}</div>
              <p className="text-gray-600">Records Deleted</p>
              {statistics.lastExecutionDate && (
                <p className="text-sm text-gray-500">
                  Last: {new Date(statistics.lastExecutionDate).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DataRetentionManager;