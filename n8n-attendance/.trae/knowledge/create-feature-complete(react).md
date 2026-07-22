# Create Feature Complete Guide

## Feature Development Workflow

### Step 1: Feature Planning & Architecture

#### Define Feature Requirements
```typescript
// Feature: User Profile Management
// Requirements:
// - View user profile
// - Edit profile information
// - Upload profile picture
// - Change password
// - Account settings
```

#### Create Feature Structure
```
src/features/profile/
├── components/
│   ├── ProfileForm.tsx
│   ├── ProfileCard.tsx
│   ├── AvatarUpload.tsx
│   ├── PasswordChangeForm.tsx
│   └── SettingsPanel.tsx
├── hooks/
│   ├── useProfile.ts
│   ├── useAvatarUpload.ts
│   └── usePasswordChange.ts
├── stores/
│   └── profileStore.ts
├── services/
│   └── profileService.ts
├── types/
│   └── profile.types.ts
├── utils/
│   └── profileHelpers.ts
└── __tests__/
    ├── ProfileForm.test.tsx
    ├── useProfile.test.ts
    └── profileStore.test.ts
```

### Step 2: Type Definitions

#### Define TypeScript Interfaces
```typescript
// src/features/profile/types/profile.types.ts
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  phone?: string;
  dateOfBirth?: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
}

export interface UpdateProfileRequest {
  name?: string;
  bio?: string;
  location?: string;
  website?: string;
  phone?: string;
  dateOfBirth?: string;
  preferences?: Partial<UserPreferences>;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AvatarUploadResponse {
  url: string;
  filename: string;
}
```

### Step 3: Service Layer Implementation

#### API Service
```typescript
// src/features/profile/services/profileService.ts
import { httpClient } from '@services/httpClient';
import { 
  UserProfile, 
  UpdateProfileRequest, 
  ChangePasswordRequest, 
  AvatarUploadResponse 
} from '../types/profile.types';

export const profileService = {
  async getProfile(): Promise<UserProfile> {
    return httpClient.get<UserProfile>('/api/profile');
  },

  async updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    return httpClient.put<UserProfile>('/api/profile', data);
  },

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    return httpClient.post<void>('/api/profile/change-password', data);
  },

  async uploadAvatar(file: File): Promise<AvatarUploadResponse> {
    const formData = new FormData();
    formData.append('avatar', file);
    
    return httpClient.post<AvatarUploadResponse>('/api/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  async deleteAvatar(): Promise<void> {
    return httpClient.delete<void>('/api/profile/avatar');
  },

  async deleteAccount(): Promise<void> {
    return httpClient.delete<void>('/api/profile');
  },
};
```

### Step 4: State Management with Zustand

#### Profile Store
```typescript
// src/features/profile/stores/profileStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { profileService } from '../services/profileService';
import { UserProfile, UpdateProfileRequest } from '../types/profile.types';

interface ProfileState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  uploadingAvatar: boolean;
  changingPassword: boolean;
}

interface ProfileActions {
  fetchProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  deleteAvatar: () => Promise<void>;
  changePassword: (data: ChangePasswordRequest) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

const initialState: ProfileState = {
  profile: null,
  loading: false,
  error: null,
  uploadingAvatar: false,
  changingPassword: false,
};

export const useProfileStore = create<ProfileState & ProfileActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        fetchProfile: async () => {
          set({ loading: true, error: null });
          try {
            const profile = await profileService.getProfile();
            set({ profile, loading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to fetch profile',
              loading: false,
            });
          }
        },

        updateProfile: async (data: UpdateProfileRequest) => {
          const originalProfile = get().profile;
          
          // Optimistic update
          if (originalProfile) {
            set({
              profile: { 
                ...originalProfile, 
                ...data,
                updatedAt: new Date().toISOString(),
              },
            });
          }

          try {
            const updatedProfile = await profileService.updateProfile(data);
            set({ profile: updatedProfile });
          } catch (error) {
            // Rollback on error
            set({ 
              profile: originalProfile,
              error: error instanceof Error ? error.message : 'Failed to update profile',
            });
            throw error;
          }
        },

        uploadAvatar: async (file: File) => {
          set({ uploadingAvatar: true, error: null });
          try {
            const response = await profileService.uploadAvatar(file);
            const currentProfile = get().profile;
            
            if (currentProfile) {
              set({
                profile: {
                  ...currentProfile,
                  avatar: response.url,
                  updatedAt: new Date().toISOString(),
                },
                uploadingAvatar: false,
              });
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to upload avatar',
              uploadingAvatar: false,
            });
            throw error;
          }
        },

        deleteAvatar: async () => {
          const originalProfile = get().profile;
          
          // Optimistic update
          if (originalProfile) {
            set({
              profile: {
                ...originalProfile,
                avatar: undefined,
                updatedAt: new Date().toISOString(),
              },
            });
          }

          try {
            await profileService.deleteAvatar();
          } catch (error) {
            // Rollback on error
            set({ profile: originalProfile });
            throw error;
          }
        },

        changePassword: async (data) => {
          set({ changingPassword: true, error: null });
          try {
            await profileService.changePassword(data);
            set({ changingPassword: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to change password',
              changingPassword: false,
            });
            throw error;
          }
        },

        clearError: () => set({ error: null }),
        reset: () => set(initialState),
      }),
      {
        name: 'profile-storage',
        partialize: (state) => ({
          profile: state.profile,
        }),
      }
    ),
    { name: 'profile-store' }
  )
);

// Selectors
export const useProfile = () => useProfileStore((state) => state.profile);
export const useProfileLoading = () => useProfileStore((state) => state.loading);
export const useProfileError = () => useProfileStore((state) => state.error);
export const useAvatarUploading = () => useProfileStore((state) => state.uploadingAvatar);
export const usePasswordChanging = () => useProfileStore((state) => state.changingPassword);

export const useProfileActions = () => useProfileStore((state) => ({
  fetchProfile: state.fetchProfile,
  updateProfile: state.updateProfile,
  uploadAvatar: state.uploadAvatar,
  deleteAvatar: state.deleteAvatar,
  changePassword: state.changePassword,
  clearError: state.clearError,
}));
```

### Step 5: Custom Hooks

#### Profile Management Hook
```typescript
// src/features/profile/hooks/useProfile.ts
import { useEffect } from 'react';
import { useProfileStore, useProfileActions } from '../stores/profileStore';

export function useProfileData() {
  const profile = useProfileStore((state) => state.profile);
  const loading = useProfileStore((state) => state.loading);
  const error = useProfileStore((state) => state.error);
  const { fetchProfile } = useProfileActions();

  useEffect(() => {
    if (!profile) {
      fetchProfile();
    }
  }, [profile, fetchProfile]);

  return { profile, loading, error, refetch: fetchProfile };
}

export function useProfileForm() {
  const { updateProfile } = useProfileActions();
  const loading = useProfileStore((state) => state.loading);
  const error = useProfileStore((state) => state.error);

  const handleSubmit = async (data: UpdateProfileRequest) => {
    try {
      await updateProfile(data);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Update failed' 
      };
    }
  };

  return { handleSubmit, loading, error };
}
```

#### Avatar Upload Hook
```typescript
// src/features/profile/hooks/useAvatarUpload.ts
import { useCallback, useState } from 'react';
import { useProfileActions, useAvatarUploading } from '../stores/profileStore';

interface UseAvatarUploadReturn {
  uploadAvatar: (file: File) => Promise<boolean>;
  deleteAvatar: () => Promise<boolean>;
  uploading: boolean;
  error: string | null;
}

export function useAvatarUpload(): UseAvatarUploadReturn {
  const [error, setError] = useState<string | null>(null);
  const { uploadAvatar: upload, deleteAvatar: remove } = useProfileActions();
  const uploading = useAvatarUploading();

  const uploadAvatar = useCallback(async (file: File): Promise<boolean> => {
    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return false;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('File size must be less than 5MB');
      return false;
    }

    try {
      setError(null);
      await upload(file);
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
      return false;
    }
  }, [upload]);

  const deleteAvatar = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      await remove();
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Delete failed');
      return false;
    }
  }, [remove]);

  return {
    uploadAvatar,
    deleteAvatar,
    uploading,
    error,
  };
}
```

### Step 6: Component Implementation

#### Profile Form Component
```typescript
// src/features/profile/components/ProfileForm.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Textarea } from '@components/ui/Textarea';
import { useProfile, useProfileForm } from '../hooks/useProfile';
import { UpdateProfileRequest } from '../types/profile.types';

export const ProfileForm: React.FC = () => {
  const { profile } = useProfile();
  const { handleSubmit: onSubmit, loading } = useProfileForm();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<UpdateProfileRequest>({
    defaultValues: {
      name: profile?.name || '',
      bio: profile?.bio || '',
      location: profile?.location || '',
      website: profile?.website || '',
      phone: profile?.phone || '',
    },
  });

  React.useEffect(() => {
    if (profile) {
      reset({
        name: profile.name,
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        phone: profile.phone || '',
      });
    }
  }, [profile, reset]);

  const handleFormSubmit = async (data: UpdateProfileRequest) => {
    const result = await onSubmit(data);
    if (result.success) {
      // Show success message
      console.log('Profile updated successfully');
    }
  };

  if (!profile) {
    return <div>Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <Input
            {...register('name', { required: 'Name is required' })}
            error={errors.name?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <Input
            value={profile.email}
            disabled
            className="bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <Input
            {...register('location')}
            placeholder="City, Country"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Website
          </label>
          <Input
            {...register('website')}
            type="url"
            placeholder="https://example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <Input
            {...register('phone')}
            type="tel"
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Bio
        </label>
        <Textarea
          {...register('bio')}
          rows={4}
          placeholder="Tell us about yourself..."
          maxLength={500}
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          loading={loading}
          disabled={!isDirty}
        >
          Save Changes
        </Button>
      </div>
    </form>
  );
};
```

#### Avatar Upload Component
```typescript
// src/features/profile/components/AvatarUpload.tsx
import React, { useRef } from 'react';
import { Button } from '@components/ui/Button';
import { useProfile } from '../hooks/useProfile';
import { useAvatarUpload } from '../hooks/useAvatarUpload';

export const AvatarUpload: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile } = useProfile();
  const { uploadAvatar, deleteAvatar, uploading, error } = useAvatarUpload();

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAvatar(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to remove your profile picture?')) {
      await deleteAvatar();
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <div className="relative">
        <img
          src={profile?.avatar || '/default-avatar.png'}
          alt="Profile"
          className="w-20 h-20 rounded-full object-cover"
        />
        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleUpload}
            disabled={uploading}
          >
            Upload Photo
          </Button>
          {profile?.avatar && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={uploading}
            >
              Remove
            </Button>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <p className="text-xs text-gray-500">
          JPG, PNG up to 5MB
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};
```

### Step 7: Testing Implementation

#### Component Tests
```typescript
// src/features/profile/__tests__/ProfileForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileForm } from '../components/ProfileForm';
import { useProfile, useProfileForm } from '../hooks/useProfile';

// Mock hooks
jest.mock('../hooks/useProfile');
const mockUseProfile = useProfile as jest.MockedFunction<typeof useProfile>;
const mockUseProfileForm = useProfileForm as jest.MockedFunction<typeof useProfileForm>;

const mockProfile = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  bio: 'Software Developer',
  location: 'New York',
  website: 'https://johndoe.com',
  phone: '+1234567890',
};

describe('ProfileForm', () => {
  beforeEach(() => {
    mockUseProfile.mockReturnValue({
      profile: mockProfile,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseProfileForm.mockReturnValue({
      handleSubmit: jest.fn().mockResolvedValue({ success: true }),
      loading: false,
      error: null,
    });
  });

  it('renders form with profile data', () => {
    render(<ProfileForm />);
    
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Software Developer')).toBeInTheDocument();
  });

  it('submits form with updated data', async () => {
    const mockHandleSubmit = jest.fn().mockResolvedValue({ success: true });
    mockUseProfileForm.mockReturnValue({
      handleSubmit: mockHandleSubmit,
      loading: false,
      error: null,
    });

    render(<ProfileForm />);
    
    const nameInput = screen.getByDisplayValue('John Doe');
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
    
    const submitButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockHandleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Jane Doe',
        })
      );
    });
  });
});
```

#### Hook Tests
```typescript
// src/features/profile/__tests__/useProfile.test.ts
import { renderHook, act } from '@testing-library/react';
import { useProfileForm } from '../hooks/useProfile';
import { profileService } from '../services/profileService';

jest.mock('../services/profileService');
const mockProfileService = profileService as jest.Mocked<typeof profileService>;

describe('useProfileForm', () => {
  it('handles successful profile update', async () => {
    const updatedProfile = { name: 'Updated Name' };
    mockProfileService.updateProfile.mockResolvedValue({
      ...mockProfile,
      ...updatedProfile,
    });

    const { result } = renderHook(() => useProfileForm());

    let response;
    await act(async () => {
      response = await result.current.handleSubmit(updatedProfile);
    });

    expect(response).toEqual({ success: true });
    expect(mockProfileService.updateProfile).toHaveBeenCalledWith(updatedProfile);
  });

  it('handles profile update error', async () => {
    const error = new Error('Update failed');
    mockProfileService.updateProfile.mockRejectedValue(error);

    const { result } = renderHook(() => useProfileForm());

    let response;
    await act(async () => {
      response = await result.current.handleSubmit({ name: 'Test' });
    });

    expect(response).toEqual({
      success: false,
      error: 'Update failed',
    });
  });
});
```

### Step 8: Integration & Documentation

#### Feature Export
```typescript
// src/features/profile/index.ts
export { ProfileForm } from './components/ProfileForm';
export { AvatarUpload } from './components/AvatarUpload';
export { PasswordChangeForm } from './components/PasswordChangeForm';

export { useProfile, useProfileForm } from './hooks/useProfile';
export { useAvatarUpload } from './hooks/useAvatarUpload';

export { useProfileStore } from './stores/profileStore';
export { profileService } from './services/profileService';

export type { 
  UserProfile, 
  UpdateProfileRequest, 
  ChangePasswordRequest 
} from './types/profile.types';
```

#### Usage Documentation
```typescript
// Example usage in a page component
import React from 'react';
import { ProfileForm, AvatarUpload } from '@features/profile';

export const ProfilePage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
        
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Profile Picture</h2>
          <AvatarUpload />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
          <ProfileForm />
        </div>
      </div>
    </div>
  );
};
```

This complete feature guide demonstrates how to build a full-featured React component with TypeScript, Zustand state management, comprehensive testing, and proper error handling following modern React development practices.