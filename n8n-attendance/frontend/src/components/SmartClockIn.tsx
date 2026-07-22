import React, { useEffect, useState } from 'react';
import { useSmartClockIn } from '../hooks/useSmartClockIn';
import { useAttendanceStore } from '../stores/attendanceStore';
import WiFiStatusIndicator from './WiFiStatusIndicator';
import LocationStatusIndicator from './LocationStatusIndicator';
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { RefreshCw, Zap, MapPin, Wifi, WifiOff, Clock } from 'lucide-react';

interface SmartClockInProps {
  className?: string;
}

const SmartClockIn: React.FC<SmartClockInProps> = ({ className = '' }) => {
  const { status: attendanceStatus } = useAttendanceStore();
  const {
    status,
    wifiResult,
    userLocation,
    isLoading,
    error,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    refreshStatus,
    performSmartClockIn,
    getLocationPermission
  } = useSmartClockIn();

  const [showDetails, setShowDetails] = useState(false);
  const [lastClockInAttempt, setLastClockInAttempt] = useState<Date | null>(null);

  // Remove auto-start monitoring - let WiFiProvider handle this
  // useEffect(() => {
  //   if (!attendanceStatus?.is_checked_in) {
  //     startMonitoring();
  //   }
  //   return () => {
  //     stopMonitoring();
  //   };
  // }, [attendanceStatus?.is_checked_in, startMonitoring, stopMonitoring]);

  const handleSmartClockIn = async () => {
    const success = await performSmartClockIn();
    if (success) {
      setLastClockInAttempt(new Date());
    }
  };

  const handleRequestLocationPermission = async () => {
    await getLocationPermission();
    await refreshStatus();
  };

  // Add manual start monitoring button for user control
  const handleStartMonitoring = () => {
    if (!isMonitoring) {
      startMonitoring();
    }
  };

  const handleStopMonitoring = () => {
    if (isMonitoring) {
      stopMonitoring();
    }
  };

  const getActionButtonProps = () => {
    if (attendanceStatus?.is_checked_in) {
      return {
        text: 'Already Checked In',
        variant: 'outline' as const,
        disabled: true,
        icon: <Clock className="w-4 h-4" />
      };
    }

    if (!status) {
      return {
        text: 'Loading...',
        variant: 'outline' as const,
        disabled: true,
        icon: <RefreshCw className="w-4 h-4 animate-spin" />
      };
    }

    switch (status.recommendedAction) {
      case 'auto':
        return {
          text: 'Smart Clock In',
          variant: 'default' as const,
          disabled: isLoading,
          icon: <Zap className="w-4 h-4" />,
          onClick: handleSmartClockIn
        };
      case 'manual':
        return {
          text: 'Manual Check-in Required',
          variant: 'outline' as const,
          disabled: true,
          icon: <MapPin className="w-4 h-4" />
        };
      case 'blocked':
        return {
          text: 'Check-in Not Available',
          variant: 'outline' as const,
          disabled: true,
          icon: <MapPin className="w-4 h-4" />
        };
      default:
        return {
          text: 'Check Status',
          variant: 'outline' as const,
          disabled: isLoading,
          icon: <RefreshCw className="w-4 h-4" />,
          onClick: refreshStatus
        };
    }
  };

  const buttonProps = getActionButtonProps();

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-blue-500" />
            <span>Smart Clock-In</span>
          </span>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide' : 'Details'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshStatus}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Message */}
        {status && (
          <Alert variant={status.canAutoClockIn ? 'default' : 'destructive'}>
            {status.message}
          </Alert>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            {error}
          </Alert>
        )}

        {/* Status Indicators */}
        <div className="space-y-3">
          <WiFiStatusIndicator wifiResult={wifiResult} />
          <LocationStatusIndicator
            userLocation={userLocation}
            isValid={status?.locationStatus.isValid}
            distance={status?.locationStatus.distance}
            accuracy={status?.locationStatus.accuracy}
          />
        </div>

        {/* Action Button */}
        <Button
          variant={buttonProps.variant}
          disabled={buttonProps.disabled}
          onClick={buttonProps.onClick}
          className="w-full"
        >
          {buttonProps.icon}
          <span className="ml-2">{buttonProps.text}</span>
        </Button>

        {/* Location Permission Request */}
        {!userLocation && (
          <Button
            variant="outline"
            onClick={handleRequestLocationPermission}
            className="w-full"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Enable Location Services
          </Button>
        )}

        {/* Monitoring Status */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Monitoring: {isMonitoring ? 'Active' : 'Inactive'}</span>
          {lastClockInAttempt && (
            <span>Last attempt: {lastClockInAttempt.toLocaleTimeString()}</span>
          )}
        </div>

        {/* Detailed Status */}
        {showDetails && status && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
            <h4 className="font-medium text-gray-900">Detection Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">WiFi Status:</span>
                <div className="text-gray-600">
                  <div>Detected: {status.wifiStatus.isDetected ? 'Yes' : 'No'}</div>
                  <div>Matched: {status.wifiStatus.isMatched ? 'Yes' : 'No'}</div>
                  {status.wifiStatus.confidence > 0 && (
                    <div>Confidence: {status.wifiStatus.confidence}%</div>
                  )}
                </div>
              </div>
              <div>
                <span className="font-medium">Location Status:</span>
                <div className="text-gray-600">
                  <div>Detected: {status.locationStatus.isDetected ? 'Yes' : 'No'}</div>
                  <div>Valid: {status.locationStatus.isValid ? 'Yes' : 'No'}</div>
                  {status.locationStatus.distance && (
                    <div>Distance: {Math.round(status.locationStatus.distance)}m</div>
                  )}
                </div>
              </div>
            </div>
            {wifiResult && (
              <div className="mt-2">
                <span className="font-medium">Detection Method:</span>
                <span className="ml-2 text-gray-600 capitalize">{wifiResult.detectionMethod}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
      // Add monitoring control buttons in the UI
      <div className="flex gap-2 mb-4">
        {!isMonitoring ? (
          <Button
            onClick={handleStartMonitoring}
            variant="outline"
            size="sm"
          >
            <Wifi className="w-4 h-4 mr-2" />
            Start WiFi Monitoring
          </Button>
        ) : (
          <Button
            onClick={handleStopMonitoring}
            variant="outline"
            size="sm"
          >
            <WifiOff className="w-4 h-4 mr-2" />
            Stop WiFi Monitoring
          </Button>
        )}
        
        <Button
          onClick={refreshStatus}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>
    </Card>
  );
};

export default SmartClockIn;