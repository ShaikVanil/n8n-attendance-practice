import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/services.dart';

class ConnectionQualityService {
  static const _platform = MethodChannel('connection_quality');
  
  final StreamController<ConnectionQuality> _qualityController = 
      StreamController<ConnectionQuality>.broadcast();
  
  Stream<ConnectionQuality> get qualityStream => _qualityController.stream;
  
  Timer? _qualityCheckTimer;
  
  void startMonitoring() {
    _qualityCheckTimer = Timer.periodic(
      const Duration(seconds: 10),
      (_) => _checkConnectionQuality(),
    );
  }
  
  void stopMonitoring() {
    _qualityCheckTimer?.cancel();
  }
  
  Future<void> _checkConnectionQuality() async {
    try {
      final connectivity = await Connectivity().checkConnectivity();
      final quality = await _determineQuality(connectivity);
      _qualityController.add(quality);
    } catch (e) {
      _qualityController.add(ConnectionQuality.poor);
    }
  }
  
  Future<ConnectionQuality> _determineQuality(ConnectivityResult connectivity) async {
    switch (connectivity) {
      case ConnectivityResult.wifi:
        return await _checkWiFiQuality();
      case ConnectivityResult.mobile:
        return await _checkMobileQuality();
      case ConnectivityResult.ethernet:
        return ConnectionQuality.excellent;
      case ConnectivityResult.none:
        return ConnectionQuality.none;
      default:
        return ConnectionQuality.poor;
    }
  }
  
  Future<ConnectionQuality> _checkWiFiQuality() async {
    try {
      // Try to get WiFi signal strength from platform
      final signalStrength = await _platform.invokeMethod<int>('getWiFiSignalStrength');
      
      if (signalStrength != null) {
        if (signalStrength > -50) return ConnectionQuality.excellent;
        if (signalStrength > -70) return ConnectionQuality.good;
        return ConnectionQuality.poor;
      }
      
      return ConnectionQuality.good; // Default for WiFi
    } catch (e) {
      return ConnectionQuality.good;
    }
  }
  
  Future<ConnectionQuality> _checkMobileQuality() async {
    try {
      // Try to get mobile signal strength from platform
      final signalStrength = await _platform.invokeMethod<int>('getMobileSignalStrength');
      
      if (signalStrength != null) {
        if (signalStrength > 75) return ConnectionQuality.good;
        if (signalStrength > 50) return ConnectionQuality.poor;
        return ConnectionQuality.poor;
      }
      
      return ConnectionQuality.good; // Default for mobile
    } catch (e) {
      return ConnectionQuality.good;
    }
  }
  
  String getQualityGuidance(ConnectionQuality quality) {
    switch (quality) {
      case ConnectionQuality.excellent:
        return 'Excellent connection. All features available.';
      case ConnectionQuality.good:
        return 'Good connection. Clock-in should work smoothly.';
      case ConnectionQuality.poor:
        return 'Poor connection. Clock-in may be slower. Consider moving closer to WiFi.';
      case ConnectionQuality.none:
        return 'No connection. Clock-in will be queued for later sync.';
    }
  }
  
  void dispose() {
    _qualityController.close();
    stopMonitoring();
  }
}

enum ConnectionQuality {
  none,
  poor,
  good,
  excellent,
}