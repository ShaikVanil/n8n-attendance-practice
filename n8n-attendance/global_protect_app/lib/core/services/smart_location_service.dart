import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'battery_optimization_service.dart';

class SmartLocationService {
  static final SmartLocationService _instance = SmartLocationService._internal();
  factory SmartLocationService() => _instance;
  SmartLocationService._internal();

  final BatteryOptimizationService _batteryService = BatteryOptimizationService();
  
  bool _isLocationServiceActive = false;
  Position? _lastKnownPosition;
  DateTime? _lastLocationUpdate;
  StreamSubscription<Position>? _positionSubscription;
  Timer? _locationTimeoutTimer;

  bool get isLocationServiceActive => _isLocationServiceActive;
  Position? get lastKnownPosition => _lastKnownPosition;

  // Smart location activation - only when needed
  Future<Position?> getCurrentLocationForClockIn() async {
    _batteryService.trackActivity('location_request_clockin');
    
    try {
      // Check if we have a recent location (within 5 minutes)
      if (_lastKnownPosition != null && 
          _lastLocationUpdate != null &&
          DateTime.now().difference(_lastLocationUpdate!).inMinutes < 5) {
        if (kDebugMode) {
          print('Using cached location to save battery');
        }
        return _lastKnownPosition;
      }

      // Get location with battery-optimized settings
      final position = await _getLocationWithOptimization();
      _lastKnownPosition = position;
      _lastLocationUpdate = DateTime.now();
      
      return position;
    } catch (e) {
      if (kDebugMode) {
        print('Error getting location: $e');
      }
      return null;
    }
  }

  Future<Position> _getLocationWithOptimization() async {
    final batteryOptimizedSettings = LocationSettings(
      accuracy: _getBatteryOptimizedAccuracy(),
      distanceFilter: _getBatteryOptimizedDistanceFilter(),
      timeLimit: const Duration(seconds: 30), // Prevent hanging
    );

    return await Geolocator.getCurrentPosition(
      desiredAccuracy: batteryOptimizedSettings.accuracy,
      forceAndroidLocationManager: _batteryService.shouldReduceLocationAccuracy(),
      timeLimit: batteryOptimizedSettings.timeLimit,
    );
  }

  LocationAccuracy _getBatteryOptimizedAccuracy() {
    if (_batteryService.shouldReduceLocationAccuracy()) {
      return LocationAccuracy.low; // ~500m accuracy, less battery usage
    } else {
      return LocationAccuracy.high; // ~5m accuracy
    }
  }

  int _getBatteryOptimizedDistanceFilter() {
    if (_batteryService.shouldReduceLocationAccuracy()) {
      return 100; // Only update if moved 100m
    } else {
      return 10; // Update if moved 10m
    }
  }

  // Start location monitoring only during work hours
  Future<void> startWorkHoursLocationMonitoring() async {
    if (_isLocationServiceActive) return;
    
    _batteryService.trackActivity('location_monitoring_start');
    
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        await Geolocator.requestPermission();
      }

      final settings = LocationSettings(
        accuracy: _getBatteryOptimizedAccuracy(),
        distanceFilter: _getBatteryOptimizedDistanceFilter(),
      );

      _positionSubscription = Geolocator.getPositionStream(
        locationSettings: settings,
      ).listen(
        (Position position) {
          _lastKnownPosition = position;
          _lastLocationUpdate = DateTime.now();
          
          if (kDebugMode) {
            print('Location updated: ${position.latitude}, ${position.longitude}');
          }
        },
        onError: (error) {
          if (kDebugMode) {
            print('Location stream error: $error');
          }
        },
      );

      _isLocationServiceActive = true;
      
      // Auto-stop after work hours (8 hours)
      _locationTimeoutTimer = Timer(const Duration(hours: 8), () {
        stopLocationMonitoring();
      });
      
    } catch (e) {
      if (kDebugMode) {
        print('Error starting location monitoring: $e');
      }
    }
  }

  void stopLocationMonitoring() {
    if (!_isLocationServiceActive) return;
    
    _batteryService.trackActivity('location_monitoring_stop');
    
    _positionSubscription?.cancel();
    _locationTimeoutTimer?.cancel();
    _isLocationServiceActive = false;
    
    if (kDebugMode) {
      print('Location monitoring stopped to save battery');
    }
  }

  // Check if location is needed based on time and battery
  bool shouldRequestLocation() {
    final now = DateTime.now();
    final workHours = now.hour >= 8 && now.hour <= 18; // 8 AM to 6 PM
    
    if (!workHours) {
      return false; // Don't use location outside work hours
    }
    
    if (_batteryService.shouldDisableBackgroundTasks()) {
      return false; // Critical battery - disable location
    }
    
    return true;
  }

  void dispose() {
    stopLocationMonitoring();
  }
}