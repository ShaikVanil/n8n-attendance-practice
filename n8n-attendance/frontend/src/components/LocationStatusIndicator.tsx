import React from 'react';
import { MapPin, MapPinOff, AlertCircle } from 'lucide-react';

interface LocationStatusIndicatorProps {
  userLocation: { latitude: number; longitude: number } | null;
  isValid?: boolean;
  distance?: number;
  accuracy?: number;
  className?: string;
}

const LocationStatusIndicator: React.FC<LocationStatusIndicatorProps> = ({
  userLocation,
  isValid,
  distance,
  accuracy,
  className = ''
}) => {
  const getStatusColor = () => {
    if (!userLocation) return 'text-red-500';
    if (isValid === true) return 'text-green-500';
    if (isValid === false) return 'text-yellow-500';
    return 'text-blue-500';
  };

  const getStatusText = () => {
    if (!userLocation) return 'Location not available';
    if (isValid === true) return 'Location validated';
    if (isValid === false) {
      return distance ? `${Math.round(distance)}m from office` : 'Location not valid';
    }
    return 'Location detected';
  };

  const getIcon = () => {
    if (!userLocation) {
      return <MapPinOff className="w-4 h-4" />;
    }
    if (isValid === false) {
      return <AlertCircle className="w-4 h-4" />;
    }
    return <MapPin className="w-4 h-4" />;
  };

  return (
    <div className={`flex items-center space-x-2 ${getStatusColor()} ${className}`}>
      {getIcon()}
      <span className="text-sm font-medium">{getStatusText()}</span>
      {accuracy && (
        <span className="text-xs text-gray-500">
          (±{Math.round(accuracy)}m)
        </span>
      )}
    </div>
  );
};

export default LocationStatusIndicator;