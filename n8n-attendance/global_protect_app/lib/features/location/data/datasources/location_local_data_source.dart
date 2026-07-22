import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../../../core/error/exceptions.dart';
import '../models/location_model.dart';
import '../models/office_location_model.dart';

abstract class LocationLocalDataSource {
  Future<LocationModel> getCurrentLocation();
  Future<bool> isLocationPermissionGranted();
  Future<bool> requestLocationPermission();
  Future<bool> isLocationServiceEnabled();
  Future<List<OfficeLocationModel>> getCachedOfficeLocations();
  Future<void> cacheOfficeLocations(List<OfficeLocationModel> locations);
}

class LocationLocalDataSourceImpl implements LocationLocalDataSource {
  @override
  Future<LocationModel> getCurrentLocation() async {
    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 10),
      );

      return LocationModel.fromGeolocatorPosition(position);
    } catch (e) {
      throw LocationException(
          'Failed to get current location: ${e.toString()}');
    }
  }

  @override
  Future<bool> isLocationPermissionGranted() async {
    final permission = await Permission.location.status;
    return permission == PermissionStatus.granted;
  }

  @override
  Future<bool> requestLocationPermission() async {
    final permission = await Permission.location.request();
    return permission == PermissionStatus.granted;
  }

  @override
  Future<bool> isLocationServiceEnabled() async {
    return await Geolocator.isLocationServiceEnabled();
  }

  @override
  Future<List<OfficeLocationModel>> getCachedOfficeLocations() async {
    // For now, return a default office location
    // In a real app, this would come from local storage
    return [
      OfficeLocationModel(
        id: 'office_1',
        name: 'Main Office',
        center: LocationModel(
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 5.0,
          timestamp: DateTime.now(),
        ),
        radiusInMeters: 100.0,
        address: '123 Main St, San Francisco, CA',
      ),
    ];
  }

  @override
  Future<void> cacheOfficeLocations(List<OfficeLocationModel> locations) async {
    // Implementation for caching office locations
    // This would typically use Hive or SharedPreferences
  }
}
