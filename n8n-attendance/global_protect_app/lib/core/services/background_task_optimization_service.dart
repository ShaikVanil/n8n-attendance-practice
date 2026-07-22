import 'dart:async';
import 'dart:isolate';
import 'package:flutter/foundation.dart';
import 'battery_optimization_service.dart';

class BackgroundTaskOptimizationService {
  static final BackgroundTaskOptimizationService _instance = 
      BackgroundTaskOptimizationService._internal();
  factory BackgroundTaskOptimizationService() => _instance;
  BackgroundTaskOptimizationService._internal();

  final BatteryOptimizationService _batteryService = BatteryOptimizationService();
  final Map<String, Timer> _scheduledTasks = {};
  final Map<String, Isolate> _backgroundIsolates = {};
  
  bool _isBackgroundProcessingEnabled = true;

  bool get isBackgroundProcessingEnabled => _isBackgroundProcessingEnabled;

  void initialize() {
    _updateBackgroundProcessingState();
    
    // Monitor battery changes and adjust background processing
    Timer.periodic(const Duration(minutes: 5), (timer) {
      _updateBackgroundProcessingState();
    });
  }

  void _updateBackgroundProcessingState() {
    final shouldDisable = _batteryService.shouldDisableBackgroundTasks();
    
    if (shouldDisable && _isBackgroundProcessingEnabled) {
      _disableBackgroundProcessing();
    } else if (!shouldDisable && !_isBackgroundProcessingEnabled) {
      _enableBackgroundProcessing();
    }
  }

  void _disableBackgroundProcessing() {
    _isBackgroundProcessingEnabled = false;
    _batteryService.trackActivity('background_processing_disabled');
    
    // Cancel all non-critical background tasks
    _cancelNonCriticalTasks();
    
    if (kDebugMode) {
      print('Background processing disabled to save battery');
    }
  }

  void _enableBackgroundProcessing() {
    _isBackgroundProcessingEnabled = true;
    _batteryService.trackActivity('background_processing_enabled');
    
    if (kDebugMode) {
      print('Background processing enabled');
    }
  }

  void _cancelNonCriticalTasks() {
    final nonCriticalTasks = _scheduledTasks.keys
        .where((taskId) => !taskId.contains('critical'))
        .toList();
    
    for (final taskId in nonCriticalTasks) {
      cancelTask(taskId);
    }
  }

  // Schedule a background task with battery optimization
  void scheduleTask({
    required String taskId,
    required Duration interval,
    required VoidCallback task,
    bool isCritical = false,
  }) {
    // Cancel existing task if it exists
    cancelTask(taskId);
    
    // Don't schedule non-critical tasks if background processing is disabled
    if (!isCritical && !_isBackgroundProcessingEnabled) {
      if (kDebugMode) {
        print('Skipping non-critical task $taskId - background processing disabled');
      }
      return;
    }
    
    // Adjust interval based on battery status
    final adjustedInterval = _getAdjustedInterval(interval, isCritical);
    
    _scheduledTasks[taskId] = Timer.periodic(adjustedInterval, (timer) {
      if (!_isBackgroundProcessingEnabled && !isCritical) {
        timer.cancel();
        _scheduledTasks.remove(taskId);
        return;
      }
      
      _batteryService.trackActivity('background_task_$taskId');
      task();
    });
    
    if (kDebugMode) {
      print('Scheduled task $taskId with interval ${adjustedInterval.inSeconds}s');
    }
  }

  Duration _getAdjustedInterval(Duration originalInterval, bool isCritical) {
    if (isCritical) {
      return originalInterval; // Don't adjust critical tasks
    }
    
    if (_batteryService.batteryLevel <= 10) {
      return Duration(seconds: originalInterval.inSeconds * 4); // 4x slower
    } else if (_batteryService.isLowBatteryMode) {
      return Duration(seconds: originalInterval.inSeconds * 2); // 2x slower
    } else if (_batteryService.isPowerSavingMode) {
      return Duration(seconds: (originalInterval.inSeconds * 1.5).round()); // 1.5x slower
    }
    
    return originalInterval;
  }

  // Cancel a scheduled task
  void cancelTask(String taskId) {
    final timer = _scheduledTasks.remove(taskId);
    timer?.cancel();
    
    if (kDebugMode && timer != null) {
      print('Cancelled task $taskId');
    }
  }

  // Run a task in a background isolate (for CPU-intensive work)
  Future<T> runInBackground<T>({
    required String taskId,
    required Future<T> Function() task,
    bool isCritical = false,
  }) async {
    if (!isCritical && !_isBackgroundProcessingEnabled) {
      throw StateError('Background processing is disabled to save battery');
    }
    
    _batteryService.trackActivity('isolate_task_$taskId');
    
    try {
      // For now, run in main isolate with lower priority
      // In a real implementation, you'd use compute() or custom isolates
      return await task();
    } catch (e) {
      if (kDebugMode) {
        print('Background task $taskId failed: $e');
      }
      rethrow;
    }
  }

  // Optimize task scheduling based on app lifecycle
  void onAppPaused() {
    _batteryService.trackActivity('app_paused');
    
    // Reduce background task frequency when app is paused
    for (final entry in _scheduledTasks.entries) {
      if (!entry.key.contains('critical')) {
        // Cancel non-critical tasks when app is in background
        entry.value.cancel();
      }
    }
    
    if (kDebugMode) {
      print('Reduced background tasks - app paused');
    }
  }

  void onAppResumed() {
    _batteryService.trackActivity('app_resumed');
    
    // Resume background tasks when app becomes active
    _updateBackgroundProcessingState();
    
    if (kDebugMode) {
      print('Resumed background tasks - app active');
    }
  }

  // Get background task statistics
  Map<String, dynamic> getTaskStats() {
    return {
      'active_tasks': _scheduledTasks.length,
      'background_processing_enabled': _isBackgroundProcessingEnabled,
      'active_isolates': _backgroundIsolates.length,
    };
  }

  void dispose() {
    // Cancel all tasks
    for (final timer in _scheduledTasks.values) {
      timer.cancel();
    }
    _scheduledTasks.clear();
    
    // Kill all isolates
    for (final isolate in _backgroundIsolates.values) {
      isolate.kill();
    }
    _backgroundIsolates.clear();
  }
}