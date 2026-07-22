import '../../domain/entities/location.dart';
import 'package:geolocator/geolocator.dart' as geolocator;

class LocationModel extends Location {
  const LocationModel({
    required super.latitude,
    required super.longitude,
    required super.accuracy,
    required super.timestamp,
    super.address,
    super.source,
    super.provider,
    super.altitude,
    super.speed,
    super.bearing,
  });

  factory LocationModel.fromJson(Map<String, dynamic> json) {
    return LocationModel(
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      accuracy: (json['accuracy'] as num).toDouble(),
      timestamp: DateTime.parse(json['timestamp']),
      address: json['address'],
      source: _parseLocationSource(json['source']),
      provider: json['provider'],
      altitude: json['altitude']?.toDouble(),
      speed: json['speed']?.toDouble(),
      bearing: json['bearing']?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'latitude': latitude,
      'longitude': longitude,
      'accuracy': accuracy,
      'timestamp': timestamp.toIso8601String(),
      'address': address,
      'source': source.name,
      'provider': provider,
      'altitude': altitude,
      'speed': speed,
      'bearing': bearing,
    };
  }

  factory LocationModel.fromGeolocatorPosition(
    geolocator.Position position, {
    String? address,
  }) {
    return LocationModel(
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      timestamp: position.timestamp ?? DateTime.now(),
      address: address,
      source: _mapGeolocatorSource(position),
      provider: 'geolocator',
      altitude: position.altitude,
      speed: position.speed,
      bearing: position.heading,
    );
  }

  static LocationSource _parseLocationSource(String? source) {
    switch (source?.toLowerCase()) {
      case 'gps':
        return LocationSource.gps;
      case 'network':
        return LocationSource.network;
      case 'wifi':
        return LocationSource.wifi;
      case 'passive':
        return LocationSource.passive;
      case 'fused':
        return LocationSource.fused;
      default:
        return LocationSource.unknown;
    }
  }

  static LocationSource _mapGeolocatorSource(geolocator.Position position) {
    // Determine source based on accuracy and other factors
    if (position.accuracy <= 10) {
      return LocationSource.gps;
    } else if (position.accuracy <= 100) {
      return LocationSource.fused;
    } else {
      return LocationSource.network;
    }
  }
}