import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { wifiDetectionService, SmartClockInStatus, WiFiDetectionResult } from '../services/wifiDetectionService';
import { getCurrentPosition } from '../utils/geolocation';

interface WiFiContextType {
  status: SmartClockInStatus | null;
  wifiResult: WiFiDetectionResult | null;
  userLocation: { latitude: number; longitude: number } | null;
  isLoading: boolean;
  error: string | null;
  isMonitoring: boolean;
  isFallbackMode: boolean;
  fallbackReason: string | null;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  refreshStatus: () => Promise<void>;
  getLocationPermission: () => Promise<boolean>;
}

const WiFiContext = createContext<WiFiContextType | undefined>(undefined);

export const WiFiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<SmartClockInStatus | null>(null);
  const [wifiResult, setWifiResult] = useState<WiFiDetectionResult | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);

  const getCurrentLocation = useCallback(async (): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      const position = await getCurrentPosition();
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      setUserLocation(location);
      return location;
    } catch (error) {
      console.error('Failed to get location:', error);
      setError(error instanceof Error ? error.message : 'Failed to get location');
      return null;
    }
  }, []);

  const getLocationPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by this browser');
        return false;
      }

      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state === 'granted') {
          setLocationPermissionGranted(true);
          return true;
        }
      }

      const location = await getCurrentLocation();
      const granted = !!location;
      setLocationPermissionGranted(granted);
      return granted;
    } catch (error) {
      console.error('Location permission error:', error);
      setError('Location permission denied');
      setLocationPermissionGranted(false);
      return false;
    }
  }, [getCurrentLocation]);

  const updateStatus = useCallback(async (wifiData?: WiFiDetectionResult) => {
    console.log('🔄 [WiFiContext] Starting status update...', { wifiData });
    
    try {
      setIsLoading(true);
      setError(null);

      let currentLocation = userLocation;
      if (locationPermissionGranted && !currentLocation) {
        console.log('📍 [WiFiContext] Getting current location...');
        currentLocation = await getCurrentLocation();
        console.log('📍 [WiFiContext] Location obtained:', currentLocation);
      }

      console.log('🌐 [WiFiContext] Calling getSmartClockInStatus...', {
        locationPermissionGranted,
        currentLocation
      });
      
      const smartStatus = await wifiDetectionService.getSmartClockInStatus(currentLocation || undefined);
      
      console.log('📊 [WiFiContext] Smart status received:', {
        canAutoClockIn: smartStatus.canAutoClockIn,
        currentMode: smartStatus.currentMode,
        isFallbackMode: smartStatus.isFallbackMode,
        message: smartStatus.message,
        recommendedAction: smartStatus.recommendedAction,
        wifiStatus: smartStatus.wifiStatus,
        locationStatus: smartStatus.locationStatus
      });
      
      setStatus(smartStatus);

      if (wifiData) {
        console.log('📶 [WiFiContext] Setting WiFi result:', wifiData);
        setWifiResult(wifiData);
      }
    } catch (error) {
      console.error('💥 [WiFiContext] Failed to update smart clock-in status:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      setError(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setIsLoading(false);
    }
  }, [userLocation, locationPermissionGranted, getCurrentLocation]);

  const refreshStatus = useCallback(async () => {
    console.log('🔄 [WiFiContext] Manual status refresh requested');
    await updateStatus();
  }, [updateStatus]);

  const handleWiFiUpdate = useCallback((wifiData: WiFiDetectionResult) => {
    updateStatus(wifiData);
  }, [updateStatus]);

  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    wifiDetectionService.addListener(handleWiFiUpdate);
    wifiDetectionService.startMonitoring(30000);
    updateStatus();
  }, [isMonitoring, handleWiFiUpdate, updateStatus]);

  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;

    setIsMonitoring(false);
    wifiDetectionService.stopMonitoring();
  }, [isMonitoring]);

  useEffect(() => {
    getLocationPermission();
  }, [getLocationPermission]);

  // Add this new useEffect to initialize status on mount
  useEffect(() => {
    console.log('🚀 [WiFiContext] Initializing status on mount...');
    updateStatus();
  }, [updateStatus]);

  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  useEffect(() => {
    if (status) {
      setFallbackReason(status.fallbackReason || null);
    }
  }, [status]);

  return (
    <WiFiContext.Provider value={{
      status,
      wifiResult,
      userLocation,
      isLoading,
      error,
      isMonitoring,
      isFallbackMode: status?.isFallbackMode || false,
      fallbackReason,
      startMonitoring,
      stopMonitoring,
      refreshStatus,
      getLocationPermission
    }}>
      {children}
    </WiFiContext.Provider>
  );
};

export const useWiFiContext = () => {
  const context = useContext(WiFiContext);
  if (context === undefined) {
    throw new Error('useWiFiContext must be used within a WiFiProvider');
  }
  return context;
};