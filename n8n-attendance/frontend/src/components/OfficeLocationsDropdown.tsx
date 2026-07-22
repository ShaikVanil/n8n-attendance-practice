import React, { useState, useEffect } from 'react';
import { locationService, OfficeLocation } from '../services/locationService';
import { Alert } from './ui/Alert';

interface OfficeLocationsDropdownProps {
  value?: string;
  onValueChange?: (locationId: string) => void;
  placeholder?: string;
  showCapacity?: boolean;
  disabled?: boolean;
  className?: string;
  currentLocationId?: string;
}

export const OfficeLocationsDropdown: React.FC<OfficeLocationsDropdownProps> = ({
  value,
  onValueChange,
  placeholder = "Select office location",
  showCapacity = false,
  disabled = false,
  className = "",
  currentLocationId
}) => {
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedLocations = await locationService.getOfficeLocations();
      
      // Filter only active locations and sort alphabetically
      const activeLocations = fetchedLocations
        .filter(location => location.isActive)
        .sort((a, b) => a.name.localeCompare(b.name));
      
      setLocations(activeLocations);
    } catch (err) {
      setError('Failed to load office locations. Please try again.');
      console.error('Error fetching office locations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (locationId: string) => {
    if (onValueChange && !disabled) {
      onValueChange(locationId);
    }
    setIsOpen(false);
  };

  const getSelectedLocationName = () => {
    if (!value) return null;
    const selectedLocation = locations.find(loc => loc.id === value);
    return selectedLocation?.name || null;
  };

  const isCurrentLocation = (locationId: string) => {
    return currentLocationId === locationId;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isOpen && !target.closest('.office-locations-dropdown')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (loading) {
    return (
      <div className={`w-full ${className}`}>
        <div className="w-full px-3 py-2 text-left border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500">
          Loading locations...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`w-full ${className}`}>
        <Alert className="mb-2 text-red-600 bg-red-50 border-red-200">
          {error}
        </Alert>
        <button
          onClick={fetchLocations}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className={`w-full ${className}`}>
        <div className="w-full px-3 py-2 text-left border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500">
          No office locations available
        </div>
      </div>
    );
  }

  const selectedLocationName = getSelectedLocationName();

  return (
    <div className={`relative w-full office-locations-dropdown ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 text-left border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'
        } ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {selectedLocationName ? (
              <>
                <span className="text-gray-900">{selectedLocationName}</span>
                {isCurrentLocation(value!) && (
                  <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    Current
                  </span>
                )}
              </>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown Content */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {locations.map((location) => (
            <div
              key={location.id}
              onClick={() => handleLocationSelect(location.id)}
              className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                value === location.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
              } ${isCurrentLocation(location.id) ? 'border-l-4 border-green-500' : ''}`}
            >
              <div className="flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{location.name}</span>
                  {isCurrentLocation(location.id) && (
                    <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                {location.address && (
                  <span className="text-sm text-gray-600 mt-1">
                    {location.address}
                  </span>
                )}
                {showCapacity && (
                  <span className="text-xs text-gray-500 mt-1">
                    Timezone: {location.timezone}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OfficeLocationsDropdown;