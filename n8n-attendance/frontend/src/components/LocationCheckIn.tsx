import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import OfficeLocationsDropdown from './OfficeLocationsDropdown';
import { useAuthStore } from '../stores/authStore';
import LocationSelector from './LocationSelector';
import MapView from './MapView';
import { OfficeLocationWithDistance } from '../services/locationService';
import api from '../services/api';

interface GPSCoordinates {
  latitude: number;
  longitude: number;
}

interface LocationValidationResult {
  isValid: boolean;
  office: any;
  distance: number | null;
  error?: string;
}

interface LocationCheckInProps {
  onCheckIn: (data: {
    type: 'manual';
    location: string;
    latitude: number;
    longitude: number;
    notes?: string;
  }) => Promise<void>;
  loading?: boolean;
}

const LocationCheckIn: React.FC<LocationCheckInProps> = ({ onCheckIn, loading = false }) => {
  const { user } = useAuthStore();
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const [userLocation, setUserLocation] = useState<GPSCoordinates | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<LocationValidationResult | null>(null);
  const [notes, setNotes] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(true);
  const [selectedOfficeName, setSelectedOfficeName] = useState<string>(''); // New state for selected office name
  const [showMap, setShowMap] = useState(false);
  const [offices, setOffices] = useState<OfficeLocationWithDistance[]>([]);

  useEffect(() => {
    if (user?.preferredLocationId) {
      setSelectedOffice(user.preferredLocationId);
      // You might need to fetch the office name here if it's not available from user object
      // For now, we'll assume it will be set when LocationSelector is used or validation occurs
    }
  }, [user]);

  const getCurrentLocation = (): Promise<GPSCoordinates> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          let errorMessage = 'Unable to get your location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location services.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  };

  const validateLocation = async (coordinates: GPSCoordinates, officeId: string): Promise<LocationValidationResult> => {
    try {
      const { data } = await api.post('/locations/validate', {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        officeId,
      });
      return data;
    } catch (error) {
      console.error('Location validation error:', error);
      return {
        isValid: false,
        office: null,
        distance: null,
        error: 'Failed to validate location',
      };
    }
  };

  const handleGetLocation = async () => {
    if (!selectedOffice) {
      setLocationError('Please select an office location first');
      return;
    }

    setGettingLocation(true);
    setLocationError(null);
    setValidationResult(null);

    try {
      const coordinates = await getCurrentLocation();
      setUserLocation(coordinates);

      // Validate location against selected office (selectedOffice is officeId: string)
      const validation = await validateLocation(coordinates, selectedOffice);
      setValidationResult(validation);

      if (!validation.isValid) {
        setLocationError(
          validation.error ||
            `You are ${Math.round(validation.distance || 0)}m away from the office. You need to be within ${validation.office?.geofence_radius_meters || 100}m to check in.`
        );
      } else {
        setSelectedOfficeName(validation.office?.name || ''); // Set name on successful validation
      }
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : 'Failed to get location');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleLocationSelect = (office: OfficeLocationWithDistance) => {
    setSelectedOffice(office.id);
    setSelectedOfficeName(office.name); // Set the name when selected
    setShowLocationSelector(false);
    
    // Store preference in localStorage with timestamp
    localStorage.setItem('preferredOfficeLocation', JSON.stringify({
      officeId: office.id,
      timestamp: Date.now()
    }));
  };

  const handleChangeLocation = () => {
    setSelectedOffice(''); // reset to empty string; selectedOffice is a string id
    setSelectedOfficeName(''); // Clear the name as well
    setShowLocationSelector(true);
    setValidationResult(null); // Clear validation result
    setUserLocation(null); // Clear user location
    setLocationError(null); // Clear any previous errors
  };

  const handleCheckIn = async () => {
    if (!selectedOffice) {
      setLocationError('Please select an office location first');
      return;
    }

    setGettingLocation(true);
    setLocationError(null);
    setValidationResult(null);

    try {
      const coordinates = await getCurrentLocation();
      setUserLocation(coordinates);

      // Validate location against selected office (selectedOffice is officeId: string)
      const validation = await validateLocation(coordinates, selectedOffice);
      setValidationResult(validation);

      if (!validation.isValid) {
        setLocationError(
          validation.error ||
            `You are ${Math.round(validation.distance || 0)}m away from the office. You need to be within ${validation.office?.geofence_radius_meters || 100}m to check in.`
        );
      }
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : 'Failed to get location');
    } finally {
      setGettingLocation(false);
    }
  };

  // Load preferred location on component mount
  useEffect(() => {
    const loadPreferredLocation = () => {
      const stored = localStorage.getItem('preferredOfficeLocation');
      if (stored) {
        try {
          const preference = JSON.parse(stored);
          // Check if preference is less than 24 hours old
          if (Date.now() - preference.timestamp < 24 * 60 * 60 * 1000) {
            setSelectedOffice(preference.officeId); // Set the ID
            // You might need to fetch the full office object here to get the name
            // For now, we'll rely on validation to set the name or assume it's handled elsewhere
            setShowLocationSelector(false);
          } else {
            // If preference is too old, clear it
            localStorage.removeItem('preferredOfficeLocation');
          }
        } catch (error) {
          console.error('Error loading location preference:', error);
          localStorage.removeItem('preferredOfficeLocation'); // Clear invalid data
        }
      }
    };

    loadPreferredLocation();
  }, []);

  // Load offices for map view
  useEffect(() => {
    const loadOffices = async () => {
      if (userLocation) {
        try {
          const { data } = await api.get('/locations/with-distances', {
            params: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude
            }
          });
          setOffices(data);
        } catch (error) {
          console.error('Error loading offices for map:', error);
        }
      } else {
        setOffices([]); // Clear offices if location is unavailable
      }
    };

    loadOffices();
  }, [userLocation]);

  const canCheckIn = userLocation && validationResult?.isValid && selectedOffice && !gettingLocation;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Manual Check-in with Location Validation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Office Selection */}
        {showLocationSelector ? (
          <LocationSelector
            onLocationSelect={handleLocationSelect}
            selectedLocationId={selectedOffice}
            className="w-full"
          />
        ) : (
          <div className="flex items-center justify-between">
            <span>Selected: {selectedOfficeName || 'Office'}</span>
            <Button variant="ghost" onClick={handleChangeLocation}>
              Change
            </Button>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Office Location *
          </label>
          <OfficeLocationsDropdown
            value={selectedOffice}
            onValueChange={setSelectedOffice}
            placeholder="Select your office location"
            disabled={loading || gettingLocation}
          />
        </div>

        {/* Location Status */}
        <div className="space-y-2">
          <Button
            onClick={handleGetLocation}
            disabled={!selectedOffice || gettingLocation || loading}
            className="w-full"
            variant={userLocation ? 'outline' : 'default'}
          >
            {gettingLocation ? 'Getting Location...' : 
             userLocation ? 'Update Location' : 'Get My Location'}
          </Button>

          {userLocation && (
            <div className="text-sm text-gray-600">
              📍 Location: {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
            </div>
          )}
        </div>

        {/* Validation Results */}
        {validationResult && (
          <div className="space-y-2">
            {validationResult.isValid ? (
              <Alert variant="default" className="border-green-200 bg-green-50">
                ✅ Location validated! You are within the office boundary.
                {validationResult.distance && (
                  <div className="text-sm mt-1">
                    Distance from office: {Math.round(validationResult.distance)}m
                  </div>
                )}
              </Alert>
            ) : (
              <Alert variant="destructive">
                ❌ Location validation failed
                {validationResult.distance && (
                  <div className="text-sm mt-1">
                    You are {Math.round(validationResult.distance)}m from the office.
                    Required: within {validationResult.office?.geofence_radius_meters || 100}m
                  </div>
                )}
              </Alert>
            )}
          </div>
        )}

        {/* Error Display */}
        {locationError && (
          <Alert variant="destructive">
            {locationError}
          </Alert>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about your check-in..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            disabled={loading}
          />
        </div>

        {/* Check-in Button */}
        <Button
          onClick={handleCheckIn}
          disabled={!canCheckIn || loading}
          className="w-full"
        >
          {loading ? 'Checking In...' : 'Check In'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default LocationCheckIn;