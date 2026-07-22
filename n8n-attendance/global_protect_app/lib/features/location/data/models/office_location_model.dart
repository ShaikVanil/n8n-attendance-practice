import '../../domain/entities/office_location.dart';
import '../../domain/entities/location.dart';
import 'location_model.dart';

class OfficeLocationModel extends OfficeLocation {
  const OfficeLocationModel({
    required super.id,
    required super.name,
    required super.center,
    required super.radiusInMeters,
    required super.address,
    super.isActive,
    super.wifiNetworks,
    super.timezone,
    super.geofenceEnabled,
    super.distanceFromUser,
  });

  factory OfficeLocationModel.fromJson(Map<String, dynamic> json) {
    return OfficeLocationModel(
      id: json['id'],
      name: json['name'],
      center: LocationModel(
        latitude: double.tryParse(json['latitude']?.toString() ?? '0.0') ?? 0.0,
        longitude: double.tryParse(json['longitude']?.toString() ?? '0.0') ?? 0.0,
        accuracy: 5.0,
        timestamp: DateTime.now(),
      ),
      radiusInMeters: double.tryParse(json['geofenceRadiusMeters']?.toString() ?? '100.0') ?? 100.0,
      address: json['address'] ?? '',
      isActive: json['isActive'] ?? true,
      wifiNetworks: json['wifiNetworks'] != null 
          ? List<String>.from(json['wifiNetworks']) 
          : [],
      timezone: json['timezone'] ?? 'UTC',
      geofenceEnabled: json['geofenceEnabled'] ?? true,
      distanceFromUser: null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'latitude': center.latitude,
      'longitude': center.longitude,
      'geofence_radius_meters': radiusInMeters,
      'address': address,
      'isActive': isActive,
      'wifiNetworks': wifiNetworks,
      'timezone': timezone,
      'geofence_enabled': geofenceEnabled,
      'distance': distanceFromUser,
    };
  }
}