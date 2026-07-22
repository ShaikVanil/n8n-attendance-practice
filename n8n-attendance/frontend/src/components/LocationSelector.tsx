import React, { useState, useEffect } from 'react';
import { getOfficesWithDistances, OfficeLocationWithDistance } from '../services/locationService';
import { getCurrentPosition } from '../utils/geolocation';

interface LocationSelectorProps {
  onLocationSelect: (location: OfficeLocationWithDistance) => void;
  selectedLocationId?: string;
  className?: string;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  onLocationSelect,
  selectedLocationId,
  className = ''
}) => {
  const [offices, setOffices] = useState<OfficeLocationWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const loadOfficesWithDistances = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get user's current position
        const position = await getCurrentPosition();
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        // Fetch offices with distances
        const officesData = await getOfficesWithDistances(latitude, longitude);
        setOffices(officesData);
      } catch (err) {
        console.error('Error loading offices:', err);
        setError('Failed to load office locations. Please check your location permissions.');
      } finally {
        setLoading(false);
      }
    };

    loadOfficesWithDistances();
  }, []);

  const handleLocationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const locationId = event.target.value;
    const selectedOffice = offices.find(office => office.id === locationId);
    if (selectedOffice) {
      onLocationSelect(selectedOffice);
    }
  };

  const formatDistance = (distance: number): string => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">Loading office locations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-600 text-sm ${className}`}>
        {error}
      </div>
    );
  }

  return (
    <div className={className}>
      <label htmlFor="office-selector" className="block text-sm font-medium text-gray-700 mb-2">
        Select Office Location
      </label>
      <select
        id="office-selector"
        value={selectedLocationId || ''}
        onChange={handleLocationChange}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Choose an office location...</option>
        {offices.map((office) => (
          <option
            key={office.id}
            value={office.id}
            disabled={!office.isAuthorized}
          >
            {office.name} - {formatDistance(office.distance)}
            {office.isCurrentLocation && ' (Current)'}
            {!office.isAuthorized && ' (Unauthorized)'}
          </option>
        ))}
      </select>
      
      {selectedLocationId && (
        <div className="mt-2 text-sm text-gray-600">
          {(() => {
            const selected = offices.find(o => o.id === selectedLocationId);
            if (!selected) return null;
            
            return (
              <div className="space-y-1">
                <p><strong>Address:</strong> {selected.address}</p>
                <p><strong>Distance:</strong> {formatDistance(selected.distance)}</p>
                <p className={`font-medium ${
                  selected.isAuthorized ? 'text-green-600' : 'text-red-600'
                }`}>
                  {selected.authorizationReason}
                </p>
              </div>
            );
          })()
          }
        </div>
      )}
    </div>
  );
};

export default LocationSelector;