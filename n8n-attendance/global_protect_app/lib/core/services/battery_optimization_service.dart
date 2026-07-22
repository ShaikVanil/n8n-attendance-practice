import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:battery_plus/battery_plus.dart';
import 'package:device_info_plus/device_info_plus.dart';

class BatteryOptimizationService {
  static final BatteryOptimizationService _instance = BatteryOptimizationService._internal();
  factory BatteryOptimizationService() => _instance;
  BatteryOptimizationService._internal();

  final Battery _battery = Battery();
  final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();
  
  bool _isPowerSavingMode = false;
  bool _isLowBatteryMode = false;
  int _batteryLevel = 100;
  BatteryState _batteryState = BatteryState.unknown;
  
  final Map<String, DateTime> _lastActivityTimes = {};
  final Map<String, int> _batteryUsageStats = {};
  
  StreamSubscription<BatteryState>? _batteryStateSubscription;
  Timer? _batteryMonitorTimer;

  // Getters
  bool get isPowerSavingMode => _isPowerSavingMode;
  bool get isLowBatteryMode => _isLowBatteryMode;
  int get batteryLevel => _batteryLevel;
  BatteryState get batteryState => _batteryState;
  Map<String, int> get batteryUsageStats => Map.from(_batteryUsageStats);

  Future<void> initialize() async {
    await _updateBatteryInfo();
    await _checkPowerSavingMode();
    _startBatteryMonitoring();
  }

  Future<void> _updateBatteryInfo() async {
    try {
      _batteryLevel = await _battery.batteryLevel;
      _batteryState = await _battery.batteryState;
      _isLowBatteryMode = _batteryLevel <= 20;
      
      if (kDebugMode) {
        print('Battery: ${_batteryLevel}%, State: $_batteryState, Low: $_isLowBatteryMode');
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error updating battery info: $e');
      }
    }
  }

  Future<void> _checkPowerSavingMode() async {
    try {
      if (Platform.isAndroid) {
        final androidInfo = await _deviceInfo.androidInfo;
        // Check if device is in power saving mode
        _isPowerSavingMode = _isLowBatteryMode; // Simplified check
      } else if (Platform.isIOS) {
        // iOS Low Power Mode detection would require native implementation
        _isPowerSavingMode = _isLowBatteryMode;
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error checking power saving mode: $e');
      }
    }
  }

  void _startBatteryMonitoring() {
    // Monitor battery state changes
    _batteryStateSubscription = _battery.onBatteryStateChanged.listen((BatteryState state) {
      _batteryState = state;
      _updateBatteryInfo();
    });

    // Periodic battery level check
    _batteryMonitorTimer = Timer.periodic(const Duration(minutes: 5), (timer) {
      _updateBatteryInfo();
      _checkPowerSavingMode();
    });
  }

  // Battery optimization strategies
  bool shouldReduceLocationAccuracy() {
    return _isPowerSavingMode || _isLowBatteryMode;
  }

  bool shouldReduceNetworkRequests() {
    return _isPowerSavingMode || _isLowBatteryMode;
  }

  bool shouldDisableBackgroundTasks() {
    return _isPowerSavingMode || _batteryLevel <= 15;
  }

  Duration getLocationUpdateInterval() {
    if (_batteryLevel <= 10) {
      return const Duration(minutes: 10); // Very conservative
    } else if (_isLowBatteryMode) {
      return const Duration(minutes: 5); // Conservative
    } else if (_isPowerSavingMode) {
      return const Duration(minutes: 2); // Moderate
    } else {
      return const Duration(minutes: 1); // Normal
    }
  }

  Duration getNetworkRequestInterval() {
    if (_batteryLevel <= 10) {
      return const Duration(minutes: 15);
    } else if (_isLowBatteryMode) {
      return const Duration(minutes: 10);
    } else if (_isPowerSavingMode) {
      return const Duration(minutes: 5);
    } else {
      return const Duration(minutes: 2);
    }
  }

  // Activity tracking for battery usage statistics
  void trackActivity(String activityName) {
    _lastActivityTimes[activityName] = DateTime.now();
    _batteryUsageStats[activityName] = (_batteryUsageStats[activityName] ?? 0) + 1;
  }

  // Get battery usage recommendations
  List<String> getBatteryOptimizationRecommendations() {
    final recommendations = <String>[];
    
    if (_isLowBatteryMode) {
      recommendations.add('Enable power saving mode to extend battery life');
      recommendations.add('Reduce location accuracy for clock-in/out');
      recommendations.add('Limit background app refresh');
    }
    
    if (_batteryLevel <= 10) {
      recommendations.add('Critical battery level - consider charging soon');
      recommendations.add('Non-essential features have been disabled');
    }
    
    if (_isPowerSavingMode) {
      recommendations.add('Power saving mode is active');
      recommendations.add('Some features may be limited to save battery');
    }
    
    return recommendations;
  }

  void dispose() {
    _batteryStateSubscription?.cancel();
    _batteryMonitorTimer?.cancel();
  }
}