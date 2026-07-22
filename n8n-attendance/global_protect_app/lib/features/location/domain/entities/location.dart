import 'package:equatable/equatable.dart';
import 'dart:math';

enum LocationSource {
  gps,
  network,
  wifi,
  passive,
  fused,
  unknown
}

enum LocationAccuracyLevel {
  excellent, // <= 10m
  good,      // 11-50m
  fair,      // 51-100m
  poor       // > 100m
}

class Location extends Equatable {
  final double latitude;
  final double longitude;
  final double accuracy;
  final DateTime timestamp;
  final String? address;
  final LocationSource source;
  final String? provider;
  final double? altitude;
  final double? speed;
  final double? bearing;

  const Location({
    required this.latitude,
    required this.longitude,
    required this.accuracy,
    required this.timestamp,
    this.address,
    this.source = LocationSource.unknown,
    this.provider,
    this.altitude,
    this.speed,
    this.bearing,
  });

  LocationAccuracyLevel get accuracyLevel {
    if (accuracy <= 10) return LocationAccuracyLevel.excellent;
    if (accuracy <= 50) return LocationAccuracyLevel.good;
    if (accuracy <= 100) return LocationAccuracyLevel.fair;
    return LocationAccuracyLevel.poor;
  }

  bool get isHighAccuracy => accuracyLevel == LocationAccuracyLevel.excellent || 
                            accuracyLevel == LocationAccuracyLevel.good;

  String get sourceDisplayName {
    switch (source) {
      case LocationSource.gps:
        return 'GPS';
      case LocationSource.network:
        return 'Network';
      case LocationSource.wifi:
        return 'WiFi';
      case LocationSource.passive:
        return 'Passive';
      case LocationSource.fused:
        return 'Fused';
      case LocationSource.unknown:
        return 'Unknown';
    }
  }

  @override
  List<Object?> get props => [
        latitude,
        longitude,
        accuracy,
        timestamp,
        address,
        source,
        provider,
        altitude,
        speed,
        bearing,
      ];

  double distanceTo(Location other) {
    // Calculate distance using Haversine formula
    const double earthRadius = 6371000; // meters
    
    final double lat1Rad = latitude * (3.14159265359 / 180);
    final double lat2Rad = other.latitude * (3.14159265359 / 180);
    final double deltaLatRad = (other.latitude - latitude) * (3.14159265359 / 180);
    final double deltaLngRad = (other.longitude - longitude) * (3.14159265359 / 180);

    final double a = sin(deltaLatRad / 2) * sin(deltaLatRad / 2) +
        cos(lat1Rad) * cos(lat2Rad) *
        sin(deltaLngRad / 2) * sin(deltaLngRad / 2);
      final double c = 2 * atan2(sqrt(a), sqrt(1 - a));
    final double distance = earthRadius * c;

    return distance;
  }

  bool isWithinRadius(Location center, double radiusInMeters) {
    return distanceTo(center) <= radiusInMeters;
  }
}
