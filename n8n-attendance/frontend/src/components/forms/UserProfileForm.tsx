import React, { useState, useEffect } from 'react';
import { User } from '../../types/user';
import { UpdateUserRequest } from '../../services/userService';
import { useAuthStore } from '../../stores/authStore';
import OfficeLocationsDropdown from '../OfficeLocationsDropdown';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

interface UserProfileFormProps {
  user: User;
  onUpdate?: (updatedUser: User) => void;
  onCancel?: () => void;
}

const UserProfileForm: React.FC<UserProfileFormProps> = ({
  user,
  onUpdate,
  onCancel,
}) => {
  const { updateProfile } = useAuthStore();
  const [formData, setFormData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    currentLocationId: user.currentLocationId || '',
    preferredLocationId: user.preferredLocationId || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        currentLocationId: user.currentLocationId || '',
        preferredLocationId: user.preferredLocationId || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const updateData: UpdateUserRequest = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        currentLocationId: formData.currentLocationId,
        preferredLocationId: formData.preferredLocationId,
      };

      const updatedUser = await updateProfile(updateData);
      setSuccess(true);
      
      if (onUpdate) {
        onUpdate(updatedUser);
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (locationId: string, isPreferred: boolean = false) => {
    if (isPreferred) {
      setFormData(prev => ({ ...prev, preferredLocationId: locationId }));
    } else {
      setFormData(prev => ({ ...prev, currentLocationId: locationId }));
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>User Profile Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert variant="default" className="bg-green-50 text-green-800 border-green-200">
              Profile updated successfully!
            </Alert>
          )}

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <Input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Enter your first name"
                  required
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <Input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Enter your last name"
                  required
                  disabled={loading}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email address"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Office Location Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Office Location Settings</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Current Office Location
              </label>
              <OfficeLocationsDropdown
                value={formData.currentLocationId}
                onValueChange={(locationId) => setFormData(prev => ({ ...prev, currentLocationId: locationId }))}
                placeholder="Select current office location"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Preferred Office Location
              </label>
              <OfficeLocationsDropdown
                value={formData.preferredLocationId}
                onValueChange={(locationId) => setFormData(prev => ({ ...prev, preferredLocationId: locationId }))}
                placeholder="Select preferred office location"
                disabled={loading}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default UserProfileForm;