import React from 'react';
import { AlertTriangle, MapPin, Wifi, WifiOff } from 'lucide-react';

interface FallbackModeIndicatorProps {
  isFallbackMode: boolean;
  fallbackReason?: string;
  currentMode: 'primary' | 'fallback';
  className?: string;
}

export const FallbackModeIndicator: React.FC<FallbackModeIndicatorProps> = ({
  isFallbackMode,
  fallbackReason,
  currentMode,
  className = ''
}) => {
  if (!isFallbackMode) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg ${className}`}>
        <Wifi className="w-4 h-4 text-green-600" />
        <span className="text-sm font-medium text-green-800">Primary Mode Active</span>
        <span className="text-xs text-green-600">WiFi + Location</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg ${className}`}>
      <AlertTriangle className="w-4 h-4 text-amber-600" />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-amber-800">Fallback Mode Active</span>
        <div className="flex items-center gap-2 text-xs text-amber-600">
          <MapPin className="w-3 h-3" />
          <span>Location Only</span>
          {fallbackReason && (
            <>
              <span>•</span>
              <span>{fallbackReason}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};