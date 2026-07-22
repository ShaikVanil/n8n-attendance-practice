import React from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { WiFiDetectionResult } from '../services/wifiDetectionService';

interface WiFiStatusIndicatorProps {
  wifiResult: WiFiDetectionResult | null;
  className?: string;
}

const WiFiStatusIndicator: React.FC<WiFiStatusIndicatorProps> = ({ wifiResult, className = '' }) => {
  if (!wifiResult) {
    return (
      <div className={`flex items-center space-x-2 text-gray-500 ${className}`}>
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">WiFi status unknown</span>
      </div>
    );
  }

  const getStatusColor = () => {
    if (!wifiResult.isConnected) return 'text-red-500';
    if (wifiResult.matchedOffice) {
      return wifiResult.matchedOffice.confidence >= 70 ? 'text-green-500' : 'text-yellow-500';
    }
    return 'text-blue-500';
  };

  const getStatusText = () => {
    if (!wifiResult.isConnected) return 'Not connected';
    if (wifiResult.matchedOffice) {
      return `Connected to ${wifiResult.matchedOffice.name} (${wifiResult.matchedOffice.confidence}%)`;
    }
    if (wifiResult.currentNetwork) {
      return `Connected to ${wifiResult.currentNetwork.ssid}`;
    }
    return 'Connected';
  };

  const getIcon = () => {
    if (!wifiResult.isConnected) {
      return <WifiOff className="w-4 h-4" />;
    }
    return <Wifi className="w-4 h-4" />;
  };

  return (
    <div className={`flex items-center space-x-2 ${getStatusColor()} ${className}`}>
      {getIcon()}
      <span className="text-sm font-medium">{getStatusText()}</span>
      {wifiResult.currentNetwork?.signalStrength && (
        <span className="text-xs text-gray-500">
          ({wifiResult.currentNetwork.signalStrength}%)
        </span>
      )}
    </div>
  );
};

export default WiFiStatusIndicator;