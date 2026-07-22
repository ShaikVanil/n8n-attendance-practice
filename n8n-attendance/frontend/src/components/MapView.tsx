import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { OfficeLocationWithDistance } from '../services/locationService';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapViewProps {
  offices: OfficeLocationWithDistance[];
  userLocation: { lat: number; lng: number } | null;
  selectedOfficeId?: string;
  onOfficeSelect?: (office: OfficeLocationWithDistance) => void;
  className?: string;
}

// Custom icons
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const officeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const selectedOfficeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map updates
const MapUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
};

// Component to handle real-time location updates
const LocationTracker: React.FC<{ 
  userLocation: { lat: number; lng: number } | null;
  onLocationUpdate: (location: { lat: number; lng: number }) => void;
}> = ({ userLocation, onLocationUpdate }) => {
  useEffect(() => {
    let watchId: number;
    
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          onLocationUpdate(newLocation);
        },
        (error) => {
          console.error('Error watching position:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    }
    
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [onLocationUpdate]);
  
  return null;
};

const MapView: React.FC<MapViewProps> = ({
  offices,
  userLocation,
  selectedOfficeId,
  onOfficeSelect,
  className = ''
}) => {
  const [currentLocation, setCurrentLocation] = useState(userLocation);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 0]);
  const [mapZoom, setMapZoom] = useState(13);
  
  // Update map center when user location or offices change
  useEffect(() => {
    if (currentLocation) {
      setMapCenter([currentLocation.lat, currentLocation.lng]);
    } else if (offices.length > 0) {
      // Center on first office if no user location
      setMapCenter([offices[0].latitude, offices[0].longitude]);
    }
  }, [currentLocation, offices]);
  
  // Handle real-time location updates
  const handleLocationUpdate = (location: { lat: number; lng: number }) => {
    setCurrentLocation(location);
  };
  
  // Calculate distance between two points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  };
  
  // Check if user is within office geofence
  const isWithinGeofence = (office: OfficeLocationWithDistance): boolean => {
    if (!currentLocation) return false;
    
    const distance = calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      office.latitude,
      office.longitude
    );
    
    return distance <= (office.geofence_radius_meters || 100);
  };
  
  // Get status color for office
  const getOfficeStatusColor = (office: OfficeLocationWithDistance): string => {
    if (!office.isAuthorized) return 'gray';
    if (office.id === selectedOfficeId) {
      return isWithinGeofence(office) ? '#22c55e' : '#f59e0b';
    }
    return '#ef4444';
  };
  
  if (offices.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-100 rounded-lg ${className}`}>
        <p className="text-gray-500">No office locations available</p>
      </div>
    );
  }
  
  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '400px', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater center={mapCenter} zoom={mapZoom} />
        <LocationTracker 
          userLocation={currentLocation} 
          onLocationUpdate={handleLocationUpdate} 
        />
        
        {/* User location marker */}
        {currentLocation && (
          <Marker 
            position={[currentLocation.lat, currentLocation.lng]} 
            icon={userIcon}
          >
            <Popup>
              <div className="text-center">
                <strong>Your Location</strong>
                <br />
                {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Office markers and geofences */}
        {offices.map((office) => {
          const isSelected = office.id === selectedOfficeId;
          const withinGeofence = isWithinGeofence(office);
          const distance = currentLocation ? calculateDistance(
            currentLocation.lat,
            currentLocation.lng,
            office.latitude,
            office.longitude
          ) : null;
          
          return (
            <React.Fragment key={office.id}>
              {/* Office marker */}
              <Marker
                position={[office.latitude, office.longitude]}
                icon={isSelected ? selectedOfficeIcon : officeIcon}
                eventHandlers={{
                  click: () => onOfficeSelect?.(office)
                }}
              >
                <Popup>
                  <div className="text-center space-y-2">
                    <strong>{office.name}</strong>
                    <br />
                    <span className="text-sm text-gray-600">{office.address}</span>
                    {distance !== null && (
                      <>
                        <br />
                        <span className="text-sm">
                          Distance: {distance < 1000 ? `${Math.round(distance)}m` : `${(distance/1000).toFixed(1)}km`}
                        </span>
                      </>
                    )}
                    <br />
                    <span className={`text-sm font-medium ${
                      office.isAuthorized ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {office.authorizationReason}
                    </span>
                    {isSelected && (
                      <>
                        <br />
                        <span className={`text-sm font-bold ${
                          withinGeofence ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {withinGeofence ? '✅ Within check-in zone' : '⚠️ Outside check-in zone'}
                        </span>
                      </>
                    )}
                  </div>
                </Popup>
              </Marker>
              
              {/* Geofence circle */}
              <Circle
                center={[office.latitude, office.longitude]}
                radius={office.geofence_radius_meters || 100}
                pathOptions={{
                  color: getOfficeStatusColor(office),
                  fillColor: getOfficeStatusColor(office),
                  fillOpacity: isSelected ? 0.2 : 0.1,
                  weight: isSelected ? 3 : 2,
                  dashArray: office.isAuthorized ? undefined : '5, 5'
                }}
              />
            </React.Fragment>
          );
        })}
      </MapContainer>
      
      {/* Status indicator */}
      {currentLocation && selectedOfficeId && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
          {(() => {
            const selectedOffice = offices.find(o => o.id === selectedOfficeId);
            if (!selectedOffice) return null;
            
            const withinGeofence = isWithinGeofence(selectedOffice);
            const distance = calculateDistance(
              currentLocation.lat,
              currentLocation.lng,
              selectedOffice.latitude,
              selectedOffice.longitude
            );
            
            return (
              <div className="text-sm space-y-1">
                <div className="font-medium">{selectedOffice.name}</div>
                <div className={`font-bold ${
                  withinGeofence ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {withinGeofence ? '✅ In Zone' : '⚠️ Outside Zone'}
                </div>
                <div className="text-gray-600">
                  {distance < 1000 ? `${Math.round(distance)}m` : `${(distance/1000).toFixed(1)}km`} away
                </div>
                {!withinGeofence && (
                  <div className="text-xs text-gray-500">
                    Need to be within {selectedOffice.geofence_radius_meters || 100}m
                  </div>
                )}
              </div>
            );
          })()
          }
        </div>
      )}
    </div>
  );
};

export default MapView;