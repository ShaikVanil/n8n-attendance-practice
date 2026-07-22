import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

enum GPSErrorType {
  permissionDenied,
  permissionDeniedForever,
  serviceDisabled,
  timeout,
  positionUnavailable,
  networkError,
  accuracyTooLow,
  unknown
}

class GPSErrorDetails {
  final GPSErrorType type;
  final String message;
  final String userFriendlyMessage;
  final List<String> suggestions;
  final bool canRetry;
  final bool hasAlternativeMethod;
  final Duration? retryDelay;

  const GPSErrorDetails({
    required this.type,
    required this.message,
    required this.userFriendlyMessage,
    required this.suggestions,
    required this.canRetry,
    required this.hasAlternativeMethod,
    this.retryDelay,
  });
}

class RetryConfig {
  final int maxRetries;
  final Duration initialDelay;
  final double backoffMultiplier;
  final Duration maxDelay;

  const RetryConfig({
    this.maxRetries = 3,
    this.initialDelay = const Duration(seconds: 2),
    this.backoffMultiplier = 2.0,
    this.maxDelay = const Duration(seconds: 30),
  });
}

class GPSErrorRecoveryService {
  static const String _supportEmail = 'admin@tqs.global';
  static const String _supportPhone = '+1-800-SUPPORT';
  
  /// Analyze GPS error and provide detailed recovery information
  static GPSErrorDetails analyzeGPSError(dynamic error) {
    if (error is LocationServiceDisabledException) {
      return const GPSErrorDetails(
        type: GPSErrorType.serviceDisabled,
        message: 'Location services are disabled',
        userFriendlyMessage: 'Location services are turned off on your device',
        suggestions: [
          'Go to Settings > Privacy & Security > Location Services',
          'Turn on Location Services',
          'Make sure this app has location permission',
          'Restart the app after enabling location services'
        ],
        canRetry: true,
        hasAlternativeMethod: true,
        retryDelay: Duration(seconds: 5),
      );
    }
    
    if (error is PermissionDeniedException) {
      return const GPSErrorDetails(
        type: GPSErrorType.permissionDenied,
        message: 'Location permission denied',
        userFriendlyMessage: 'Location access is required for clock-in verification',
        suggestions: [
          'Tap "Allow" when prompted for location access',
          'Go to Settings > Apps > Global Protect > Permissions',
          'Enable Location permission',
          'Use WiFi-based clock-in as an alternative'
        ],
        canRetry: true,
        hasAlternativeMethod: true,
        retryDelay: Duration(seconds: 3),
      );
    }
    
    if (error is PermissionRequestInProgressException) {
      return const GPSErrorDetails(
        type: GPSErrorType.permissionDenied,
        message: 'Permission request in progress',
        userFriendlyMessage: 'Please respond to the location permission request',
        suggestions: [
          'Look for the permission dialog',
          'Tap "Allow" to grant location access',
          'If no dialog appears, check app settings'
        ],
        canRetry: true,
        hasAlternativeMethod: false,
        retryDelay: Duration(seconds: 2),
      );
    }
    
    if (error is TimeoutException) {
      return const GPSErrorDetails(
        type: GPSErrorType.timeout,
        message: 'GPS timeout',
        userFriendlyMessage: 'GPS is taking too long to get your location',
        suggestions: [
          'Move to an open area with clear sky view',
          'Step outside if you\'re indoors',
          'Wait a moment for GPS satellites to connect',
          'Try again in a few seconds',
          'Use WiFi-based clock-in if GPS continues to fail'
        ],
        canRetry: true,
        hasAlternativeMethod: true,
        retryDelay: Duration(seconds: 10),
      );
    }
    
    if (error is PositionUpdateException) {
      return const GPSErrorDetails(
        type: GPSErrorType.positionUnavailable,
        message: 'Position unavailable',
        userFriendlyMessage: 'Unable to determine your current location',
        suggestions: [
          'Check if you\'re in a building that blocks GPS signals',
          'Move closer to a window or go outside',
          'Ensure location services are set to high accuracy',
          'Connect to office WiFi for alternative location detection',
          'Try manual clock-in with supervisor approval'
        ],
        canRetry: true,
        hasAlternativeMethod: true,
        retryDelay: Duration(seconds: 15),
      );
    }
    
    // Default unknown error
    return const GPSErrorDetails(
      type: GPSErrorType.unknown,
      message: 'Unknown GPS error',
      userFriendlyMessage: 'Something went wrong with location detection',
      suggestions: [
        'Try restarting the app',
        'Check your internet connection',
        'Ensure location services are enabled',
        'Use WiFi-based clock-in as an alternative',
        'Contact technical support if the problem persists'
      ],
      canRetry: true,
      hasAlternativeMethod: true,
      retryDelay: Duration(seconds: 5),
    );
  }
  
  /// Retry GPS location with exponential backoff
  static Future<Position?> retryGPSLocation({
    required Future<Position> Function() locationFunction,
    RetryConfig config = const RetryConfig(),
  }) async {
    int attempts = 0;
    Duration currentDelay = config.initialDelay;
    
    while (attempts < config.maxRetries) {
      try {
        attempts++;
        debugPrint('GPS retry attempt $attempts/${config.maxRetries}');
        
        return await locationFunction();
      } catch (error) {
        final errorDetails = analyzeGPSError(error);
        
        if (!errorDetails.canRetry || attempts >= config.maxRetries) {
          debugPrint('GPS retry failed after $attempts attempts: ${errorDetails.message}');
          rethrow;
        }
        
        // Wait before next retry with exponential backoff
        final delayToUse = errorDetails.retryDelay ?? currentDelay;
        debugPrint('Waiting ${delayToUse.inSeconds}s before retry...');
        await Future.delayed(delayToUse);
        
        // Increase delay for next attempt
        currentDelay = Duration(
          milliseconds: min(
            (currentDelay.inMilliseconds * config.backoffMultiplier).round(),
            config.maxDelay.inMilliseconds,
          ),
        );
      }
    }
    
    return null;
  }
  
  /// Check if WiFi fallback is available
  static Future<bool> isWiFiFallbackAvailable() async {
    try {
      // This would check if the device is connected to a known office WiFi
      // Implementation depends on WiFi service
      return true; // Placeholder
    } catch (e) {
      return false;
    }
  }
  
  /// Get technical support contact information
  static Map<String, String> getTechnicalSupportInfo() {
    return {
      'email': _supportEmail,
      'phone': _supportPhone,
      'hours': 'Monday-Friday, 9 AM - 6 PM',
      'emergency': 'For urgent issues, contact your supervisor',
    };
  }
  
  /// Generate improvement suggestions based on current conditions
  static List<String> generateLocationImprovementSuggestions({
    bool isIndoors = false,
    bool hasWiFi = false,
    double? lastKnownAccuracy,
  }) {
    final suggestions = <String>[];
    
    if (isIndoors) {
      suggestions.addAll([
        'Move closer to a window for better GPS signal',
        'Step outside briefly to establish GPS connection',
        'Use WiFi-based location if connected to office network',
      ]);
    }
    
    if (lastKnownAccuracy != null && lastKnownAccuracy > 50) {
      suggestions.addAll([
        'Wait a few moments for GPS accuracy to improve',
        'Ensure location services are set to "High Accuracy"',
        'Clear view of the sky helps GPS performance',
      ]);
    }
    
    if (!hasWiFi) {
      suggestions.add('Connect to office WiFi for alternative location detection');
    }
    
    suggestions.addAll([
      'Make sure location services are enabled for this app',
      'Restart the app if location issues persist',
      'Check for app updates in the app store',
    ]);
    
    return suggestions;
  }
  
  /// Check if manual override should be offered
  static bool shouldOfferManualOverride(GPSErrorType errorType, int failedAttempts) {
    // Offer manual override after multiple failures or for certain error types
    return failedAttempts >= 2 || 
           errorType == GPSErrorType.permissionDeniedForever ||
           errorType == GPSErrorType.positionUnavailable;
  }
}