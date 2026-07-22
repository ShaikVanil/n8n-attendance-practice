import React from 'react';
import { Wifi, WifiOff, MapPin, MapPinOff, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useSmartClockIn } from '../hooks/useSmartClockIn';

interface ConnectivityStatusDashboardProps {
  className?: string;
}

export const ConnectivityStatusDashboard: React.FC<ConnectivityStatusDashboardProps> = ({
  className = ''
}) => {
  const { status, wifiResult, userLocation, isLoading } = useSmartClockIn();

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  const getWiFiStatusIcon = () => {
    if (status?.wifiStatus.isDetected) {
      return status.wifiStatus.isMatched ? 
        <CheckCircle className="w-5 h-5 text-green-500" /> : 
        <Wifi className="w-5 h-5 text-yellow-500" />;
    }
    return <WifiOff className="w-5 h-5 text-red-500" />;
  };

  const getLocationStatusIcon = () => {
    if (status?.locationStatus.isDetected) {
      return status.locationStatus.isValid ? 
        <CheckCircle className="w-5 h-5 text-green-500" /> : 
        <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
    return <MapPinOff className="w-5 h-5 text-red-500" />;
  };

  const getWiFiStatusText = () => {
    if (!status?.wifiStatus.isDetected) {
      return 'Not connected to WiFi';
    }
    if (status.wifiStatus.isMatched) {
      return `Connected to ${status.wifiStatus.officeName} (${status.wifiStatus.confidence}% confidence)`;
    }
    return `Connected to WiFi (not office network)`;
  };

  const getLocationStatusText = () => {
    if (!status?.locationStatus.isDetected) {
      return 'Location not available';
    }
    if (status.locationStatus.isValid) {
      const officeName = status.locationStatus.matchedOffice?.name || 'office';
      return `Within ${officeName} boundaries`;
    }
    const distance = status.locationStatus.distance;
    if (distance !== undefined) {
      return `${Math.round(distance)}m from nearest office`;
    }
    return 'Outside office boundaries';
  };

  const getClockInAvailabilityMessage = () => {
    if (!status) return 'Status unavailable';
    return status.message;
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Connectivity Status</h3>
      
      {/* WiFi Status */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          {getWiFiStatusIcon()}
          <div>
            <p className="font-medium text-gray-900">WiFi Connection</p>
            <p className="text-sm text-gray-600">{getWiFiStatusText()}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            status?.wifiStatus.isMatched 
              ? 'bg-green-100 text-green-800' 
              : status?.wifiStatus.isDetected 
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {status?.wifiStatus.isMatched ? 'Office Network' : 
             status?.wifiStatus.isDetected ? 'Other Network' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Location Status */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          {getLocationStatusIcon()}
          <div>
            <p className="font-medium text-gray-900">Location Status</p>
            <p className="text-sm text-gray-600">{getLocationStatusText()}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            status?.locationStatus.isValid 
              ? 'bg-green-100 text-green-800' 
              : status?.locationStatus.isDetected 
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {status?.locationStatus.isValid ? 'In Range' : 
             status?.locationStatus.isDetected ? 'Out of Range' : 'Unavailable'}
          </span>
        </div>
      </div>

      {/* Clock-in Availability */}
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          {status?.canAutoClockIn ? 
            <CheckCircle className="w-4 h-4 text-blue-600" /> : 
            <XCircle className="w-4 h-4 text-blue-600" />
          }
          <p className="font-medium text-blue-900">
            Clock-in {status?.canAutoClockIn ? 'Available' : 'Unavailable'}
          </p>
        </div>
        <p className="text-sm text-blue-700">{getClockInAvailabilityMessage()}</p>
        
        {status?.isFallbackMode && (
          <div className="mt-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-amber-700 font-medium">
              Fallback Mode: {status.fallbackReason}
            </span>
          </div>
        )}
      </div>

      {/* Real-time indicator */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        <span>Real-time monitoring active</span>
      </div>
    </div>
  );
};

export default ConnectivityStatusDashboard;