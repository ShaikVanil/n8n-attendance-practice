import 'package:global_protect_app/core/services/gps_error_recovery_service.dart';
import 'package:global_protect_app/features/location/domain/entities/office_location.dart';

import '../../domain/entities/location.dart';

abstract class LocationState {}

class LocationInitial extends LocationState {}

class LocationLoading extends LocationState {}

class LocationLoaded extends LocationState {
  final Location location;
  final double accuracy;
  final bool isValidForClockIn;

  LocationLoaded({
    required this.location,
    required this.accuracy,
    required this.isValidForClockIn,
  });
}

class LocationLoadedWithOfficeError extends LocationState {
  final Location location;
  final double accuracy;
  final bool isValidForClockIn;
  final String officeError;

  LocationLoadedWithOfficeError({
    required this.location,
    required this.accuracy,
    required this.isValidForClockIn,
    required this.officeError,
  });
}

class LocationLoadedWithoutOffice extends LocationState {
  final Location location;
  final double accuracy;
  final bool isValidForClockIn;

  LocationLoadedWithoutOffice({
    required this.location,
    required this.accuracy,
    required this.isValidForClockIn,
  });
}

// Enhanced permission states
class LocationPermissionDenied extends LocationState {
  final String message;
  final bool isPermanentlyDenied;
  final bool shouldShowRationale;

  LocationPermissionDenied({
    required this.message,
    this.isPermanentlyDenied = false,
    this.shouldShowRationale = false,
  });
}

class LocationPermissionGranted extends LocationState {
  final String permissionType; // 'whileInUse' or 'always'

  LocationPermissionGranted({required this.permissionType});
}

class LocationServiceDisabled extends LocationState {
  final String message;

  LocationServiceDisabled({required this.message});
}

class LocationError extends LocationState {
  final String message;
  final String? errorCode;

  LocationError({required this.message, this.errorCode});
}

class LocationValidationResult extends LocationState {
  final bool isValid;
  final String message;

  LocationValidationResult({
    required this.isValid,
    required this.message,
  });
}

class LocationPermissionExplanationRequired extends LocationState {
  final String reason;

  LocationPermissionExplanationRequired({required this.reason});
}

class OfficeLocationsLoaded extends LocationState {
  final List<OfficeLocation> offices;
  final OfficeLocation? nearestOffice;
  final OfficeLocation? selectedOffice;

  OfficeLocationsLoaded({
    required this.offices,
    this.nearestOffice,
    this.selectedOffice,
  });

  @override
  List<Object?> get props => [offices, nearestOffice, selectedOffice];
}

class NearestOfficeDetected extends LocationState {
  final OfficeLocation office;
  final double distance;
  final Location userLocation; // Add this field

  NearestOfficeDetected({
    required this.office,
    required this.distance,
    required this.userLocation, // Add this parameter
  });

  @override
  List<Object> get props => [office, distance, userLocation]; // Update props
}

class OfficeSelected extends LocationState {
  final OfficeLocation office;

  OfficeSelected(this.office);

  @override
  List<Object> get props => [office];
}

class LocationAccuracyFeedback extends LocationState {
  final Location location;
  final LocationAccuracyLevel accuracyLevel;
  final List<String> improvementTips;
  final bool shouldSuggestAlternatives;

  LocationAccuracyFeedback({
    required this.location,
    required this.accuracyLevel,
    required this.improvementTips,
    this.shouldSuggestAlternatives = false,
  });

  @override
  List<Object> get props => [location, accuracyLevel, improvementTips, shouldSuggestAlternatives];
}

class LocationSourceDetected extends LocationState {
  final LocationSource source;
  final String provider;
  final Map<String, dynamic> sourceDetails;

  LocationSourceDetected({
    required this.source,
    required this.provider,
    required this.sourceDetails,
  });

  @override
  List<Object> get props => [source, provider, sourceDetails];
}


// Add new states for GPS error recovery
class LocationGPSError extends LocationState {
  final GPSErrorDetails errorDetails;
  final int attemptCount;
  final bool canRetry;
  final bool hasAlternativeMethod;
  final DateTime timestamp;

  LocationGPSError({
    required this.errorDetails,
    required this.attemptCount,
    required this.canRetry,
    required this.hasAlternativeMethod,
    required this.timestamp,
  });
}

class LocationRetrying extends LocationState {
  final int attemptNumber;
  final int maxAttempts;
  final Duration nextRetryIn;
  final String reason;

  LocationRetrying({
    required this.attemptNumber,
    required this.maxAttempts,
    required this.nextRetryIn,
    required this.reason,
  });
}

class LocationFallbackAvailable extends LocationState {
  final String fallbackMethod;
  final String message;
  final List<String> instructions;

  LocationFallbackAvailable({
    required this.fallbackMethod,
    required this.message,
    required this.instructions,
  });
}

class LocationManualOverrideRequired extends LocationState {
  final String reason;
  final List<String> instructions;
  final Map<String, String> supportInfo;

  LocationManualOverrideRequired({
    required this.reason,
    required this.instructions,
    required this.supportInfo,
  });
}

class LocationRecoverySuccess extends LocationState {
  final Location location;
  final String recoveryMethod;
  final int attemptsUsed;
  final Duration recoveryTime;

  LocationRecoverySuccess({
    required this.location,
    required this.recoveryMethod,
    required this.attemptsUsed,
    required this.recoveryTime,
  });
}

class LocationImprovementSuggestions extends LocationState {
  final List<String> suggestions;
  final bool canRetry;
  final Duration estimatedWaitTime;

  LocationImprovementSuggestions({
    required this.suggestions,
    required this.canRetry,
    required this.estimatedWaitTime,
  });
}

class LocationTechnicalSupportContacted extends LocationState {
  final Map<String, String> supportInfo;
  final String issueDescription;
  final Map<String, dynamic> diagnosticInfo;
  final String ticketId;

  LocationTechnicalSupportContacted({
    required this.supportInfo,
    required this.issueDescription,
    required this.diagnosticInfo,
    required this.ticketId,
  });
}
