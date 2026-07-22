import 'package:equatable/equatable.dart';
import 'location.dart';

class OfficeLocation extends Equatable {
  final String id;
  final String name;
  final Location center;
  final double radiusInMeters;
  final String address;
  final bool isActive;
  final List<String> wifiNetworks;
  final String timezone;
  final bool geofenceEnabled;
  final double? distanceFromUser;

  const OfficeLocation({
    required this.id,
    required this.name,
    required this.center,
    required this.radiusInMeters,
    required this.address,
    this.isActive = true,
    this.wifiNetworks = const [],
    this.timezone = 'UTC',
    this.geofenceEnabled = true,
    this.distanceFromUser,
  });

  bool isLocationWithinBounds(Location userLocation) {
    return userLocation.isWithinRadius(center, radiusInMeters);
  }

  OfficeLocation copyWith({
    String? id,
    String? name,
    Location? center,
    double? radiusInMeters,
    String? address,
    bool? isActive,
    List<String>? wifiNetworks,
    String? timezone,
    bool? geofenceEnabled,
    double? distanceFromUser,
  }) {
    return OfficeLocation(
      id: id ?? this.id,
      name: name ?? this.name,
      center: center ?? this.center,
      radiusInMeters: radiusInMeters ?? this.radiusInMeters,
      address: address ?? this.address,
      isActive: isActive ?? this.isActive,
      wifiNetworks: wifiNetworks ?? this.wifiNetworks,
      timezone: timezone ?? this.timezone,
      geofenceEnabled: geofenceEnabled ?? this.geofenceEnabled,
      distanceFromUser: distanceFromUser ?? this.distanceFromUser,
    );
  }

  @override
  List<Object?> get props => [
        id,
        name,
        center,
        radiusInMeters,
        address,
        isActive,
        wifiNetworks,
        timezone,
        geofenceEnabled,
        distanceFromUser,
      ];
}