import 'dart:async';
import 'dart:developer' as developer;

class PerformanceService {
  static final PerformanceService _instance = PerformanceService._internal();
  factory PerformanceService() => _instance;
  PerformanceService._internal();

  final Map<String, DateTime> _startTimes = {};
  final Map<String, Duration> _measurements = {};

  void startMeasurement(String key) {
    _startTimes[key] = DateTime.now();
    developer.log('Performance: Started measuring $key', name: 'Performance');
  }

  Duration? endMeasurement(String key) {
    final startTime = _startTimes[key];
    if (startTime == null) return null;

    final duration = DateTime.now().difference(startTime);
    _measurements[key] = duration;
    _startTimes.remove(key);
    
    developer.log('Performance: $key took ${duration.inMilliseconds}ms', name: 'Performance');
    return duration;
  }

  Map<String, Duration> getAllMeasurements() => Map.from(_measurements);

  Duration? getMeasurement(String key) => _measurements[key];

  void clearMeasurements() {
    _measurements.clear();
    _startTimes.clear();
  }

  bool isAppLaunchUnder3Seconds() {
    final appLaunchTime = _measurements['app_launch'];
    return appLaunchTime != null && appLaunchTime.inSeconds < 3;
  }
}