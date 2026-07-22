import React, { useState, useEffect } from 'react';
import { User } from '../types/user';
import { UserService } from '../services/userService'; // Changed from userService to UserService
import { toast } from 'react-hot-toast';

interface ManagerAssignmentProps {
  user: User;
  onUpdate: () => void;
  onClose: () => void;
}

const ManagerAssignment: React.FC<ManagerAssignmentProps> = ({ user, onUpdate, onClose }) => {
  const [managers, setManagers] = useState<User[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<string>(user.managerId || '');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadManagers();
  }, []);

  // Add this useEffect to update selectedManagerId when user prop changes
  useEffect(() => {
    setSelectedManagerId(user.managerId || '');
  }, [user.managerId]);

  const loadManagers = async () => {
    try {
      setLoading(true);
      const managersData = await UserService.getManagers(); // Use UserService
      const filteredManagers = managersData.data.filter(manager => manager.id !== user.id);
      setManagers(filteredManagers);
    } catch (error) {
      toast.error('Failed to load managers');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await UserService.assignManager(user.id, selectedManagerId || null); // Use UserService
      toast.success('Manager assignment updated successfully');
      onUpdate();
      onClose();
    } catch (error) {
      toast.error('Failed to update manager assignment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">
            Assign Manager to {user.firstName} {user.lastName}
        </h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Manager
          </label>
          {loading ? (
            <div className="text-center py-4">Loading managers...</div>
          ) : (
            <select
              value={selectedManagerId}
              onChange={(e) => setSelectedManagerId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No Manager</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.firstName} {manager.lastName} ({manager.role}) - {manager.officeLocation}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManagerAssignment;