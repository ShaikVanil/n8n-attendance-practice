import { useState, useEffect, useCallback } from 'react';
import { wifiDetectionService, SmartClockInStatus, WiFiDetectionResult } from '../services/wifiDetectionService';
import { getCurrentPosition } from '../utils/geolocation';
import { useWiFiContext } from '../contexts/WiFiContext';
import { useAttendanceStore } from '../stores/attendanceStore';
import { CheckInRequest } from '../types/attendance';
import { locationOnlyService } from '../services/locationOnlyService';

export interface UseSmartClockInReturn {
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
  performSmartClockIn: () => Promise<boolean>;
  getLocationPermission: () => Promise<boolean>;
}

export const useSmartClockIn = (): UseSmartClockInReturn => {
  const wifiContext = useWiFiContext();
  const { checkIn } = useAttendanceStore();

  const performSmartClockIn = useCallback(async (): Promise<boolean> => {
    console.log('🚀 [SmartClockIn] Starting smart clock-in process');
    
    try {
      const { status, wifiResult, userLocation } = wifiContext;
      
      console.log('📊 [SmartClockIn] Current context state:', {
        status: status ? {
          canAutoClockIn: status.canAutoClockIn,
          currentMode: status.currentMode,
          isFallbackMode: status.isFallbackMode,
          fallbackReason: status.fallbackReason,
          message: status.message,
          recommendedAction: status.recommendedAction,
          wifiStatus: status.wifiStatus,
          locationStatus: status.locationStatus
        } : null,
        wifiResult: wifiResult ? {
          isConnected: wifiResult.isConnected,
          matchedOffice: wifiResult.matchedOffice,
          currentNetwork: wifiResult.currentNetwork
        } : null,
        userLocation
      });
      
      if (!status?.canAutoClockIn) {
        console.error('❌ [SmartClockIn] Auto clock-in not available:', {
          canAutoClockIn: status?.canAutoClockIn,
          message: status?.message,
          recommendedAction: status?.recommendedAction,
          fallbackReason: status?.fallbackReason
        });
        throw new Error('Auto clock-in not available');
      }

      console.log('✅ [SmartClockIn] Auto clock-in is available, proceeding...');

      const checkInMethod = status.isFallbackMode ? 'location_only' : 'wifi_location';
      const notes = status.isFallbackMode 
        ? `Fallback clock-in via location only (${status.fallbackReason})`
        : `Smart clock-in via ${status.wifiStatus.isMatched ? 'WiFi + Location' : 'WiFi only'}`;

      console.log('📝 [SmartClockIn] Preparing check-in data:', {
        checkInMethod,
        notes,
        isFallbackMode: status.isFallbackMode
      });

      const checkInData: CheckInRequest = {
        checkInType: 'automatic',
        notes,
        location: status.isFallbackMode 
          ? status.locationStatus.matchedOffice?.id
          : (status.wifiStatus.isMatched ? wifiResult?.matchedOffice?.id : undefined),
        isFallbackMode: status.isFallbackMode,
        fallbackReason: status.fallbackReason
      };

      if (userLocation) {
        checkInData.latitude = userLocation.latitude;
        checkInData.longitude = userLocation.longitude;
        console.log('📍 [SmartClockIn] Added location data:', {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude
        });
      }

      console.log('📤 [SmartClockIn] Final check-in data:', checkInData);
      console.log('🔄 [SmartClockIn] Calling checkIn API...');

      await checkIn(checkInData);
      
      console.log('✅ [SmartClockIn] Check-in successful, refreshing status...');
      await wifiContext.refreshStatus();
      
      console.log('🎉 [SmartClockIn] Smart clock-in completed successfully');
      return true;
    } catch (error) {
      console.error('💥 [SmartClockIn] Smart clock-in failed:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }, [wifiContext, checkIn]);

  return {
    ...wifiContext,
    performSmartClockIn
  };
};