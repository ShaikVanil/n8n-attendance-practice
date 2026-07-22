import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:global_protect_app/features/location/domain/entities/location.dart';
import 'package:global_protect_app/features/location/domain/usecases/get_nearest_office_usecase.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:geolocator/geolocator.dart';
import '../../../../core/usecases/usecase.dart';
import '../../../../core/services/gps_error_recovery_service.dart';
import '../../domain/usecases/get_current_location_usecase.dart';
import '../../domain/usecases/request_location_permission_usecase.dart';
import '../../domain/usecases/validate_location_usecase.dart';
import 'location_event.dart';
import 'location_state.dart';

class LocationBloc extends Bloc<LocationEvent, LocationState> {
  final GetCurrentLocationUseCase getCurrentLocationUseCase;
  final RequestLocationPermissionUseCase requestLocationPermissionUseCase;
  final ValidateLocationUseCase validateLocationUseCase;
  final GetNearestOfficeUseCase getNearestOfficeUseCase;

  LocationBloc({
    required this.getCurrentLocationUseCase,
    required this.requestLocationPermissionUseCase,
    required this.validateLocationUseCase,
    required this.getNearestOfficeUseCase,
  }) : super(LocationInitial()) {
    on<GetCurrentLocationEvent>(_onGetCurrentLocation);
    on<RequestLocationPermissionEvent>(_onRequestLocationPermission);
    on<ValidateLocationEvent>(_onValidateLocation);
    on<GetNearestOfficeEvent>(_onGetNearestOffice);
    on<CheckLocationPermissionEvent>(_onCheckLocationPermission);
    on<CheckLocationServiceEvent>(_onCheckLocationService);
    on<OpenLocationSettingsEvent>(_onOpenLocationSettings);
    on<ShowPermissionExplanationEvent>(_onShowPermissionExplanation);
    on<RetryLocationEvent>(_onRetryLocation);
    on<FallbackToWiFiEvent>(_onFallbackToWiFi);
    on<RequestManualOverrideEvent>(_onRequestManualOverride);
    on<GetLocationImprovementSuggestionsEvent>(_onGetLocationImprovementSuggestions);
    on<ContactTechnicalSupportEvent>(_onContactTechnicalSupport);
  }

  Future<void> _onGetCurrentLocation(
    GetCurrentLocationEvent event,
    Emitter<LocationState> emit,
  ) async {
    emit(LocationLoading());

    // Check permission first
    final permissionStatus = await Permission.location.status;
    
    if (permissionStatus.isDenied) {
      emit(LocationPermissionExplanationRequired(
        reason: 'Location permission is required to verify your office location for clock-in.',
      ));
      return;
    }
    
    if (permissionStatus.isPermanentlyDenied) {
      emit(LocationPermissionDenied(
        message: 'Location permission has been permanently denied. Please enable it in settings.',
        isPermanentlyDenied: true,
      ));
      return;
    }

    try {
      final result = await getCurrentLocationUseCase(NoParams());
    
    // Handle the result properly
    if (result.isLeft()) {
      final failure = result.fold((l) => l, (r) => null)!;
      emit(LocationError(message: failure.message));
      return;
    }
    
    final location = result.fold((l) => null, (r) => r)!;
    
    // Validate location for clock-in
    final validationResult = await validateLocationUseCase(
      ValidateLocationParams(userLocation: location),
    );
    
    if (validationResult.isLeft()) {
      final failure = validationResult.fold((l) => l, (r) => null)!;
      emit(LocationError(message: failure.message));
    } else {
      final isValid = validationResult.fold((l) => false, (r) => r);
      emit(LocationLoaded(
        location: location,
        accuracy: location.accuracy,
        isValidForClockIn: isValid,
      ));
    }
  } catch (error) {
    final errorDetails = GPSErrorRecoveryService.analyzeGPSError(error);
    
    emit(LocationGPSError(
      errorDetails: errorDetails,
      attemptCount: 1,
      canRetry: errorDetails.canRetry,
      hasAlternativeMethod: errorDetails.hasAlternativeMethod,
      timestamp: DateTime.now(),
    ));
  }
  }

  Future<void> _onRetryLocation(
    RetryLocationEvent event,
    Emitter<LocationState> emit,
  ) async {
    final currentState = state;
    int attemptCount = 1;
    
    if (currentState is LocationGPSError) {
      attemptCount = currentState.attemptCount + 1;
    }

    emit(LocationRetrying(
      attemptNumber: attemptCount,
      reason: currentState is LocationGPSError ? currentState.errorDetails.message : 'Unknown',
      maxAttempts: event.customConfig?.maxRetries ?? 3,
      nextRetryIn: event.customConfig?.initialDelay ?? const Duration(seconds: 5),
    ));

    if (event.useAlternativeMethod) {
      // Try WiFi fallback
      add(const FallbackToWiFiEvent());
      return;
    }

    try {
      final startTime = DateTime.now();
      
      // Use GPS Error Recovery Service retry mechanism
      final position = await GPSErrorRecoveryService.retryGPSLocation(
        locationFunction: () async {
          final result = await getCurrentLocationUseCase(NoParams());
          return result.fold(
            (failure) => throw Exception(failure.message),
            (location) => Position(
              latitude: location.latitude,
              longitude: location.longitude,
              timestamp: DateTime.now(),
              accuracy: location.accuracy,
              altitude: 0,
              altitudeAccuracy: 0,
              headingAccuracy: 0,
              heading: 0,
              speed: 0,
              speedAccuracy: 0,
            ),
          );
        },
        config: event.customConfig ?? const RetryConfig(),
      );

      if (position != null) {
        final location = Location(
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy,
          timestamp: position.timestamp,
        );

        final recoveryTime = DateTime.now().difference(startTime);
        
        emit(LocationRecoverySuccess(
          location: location,
          recoveryMethod: 'GPS Retry',
          attemptsUsed: attemptCount,
          recoveryTime: recoveryTime,
        ));

        // Validate the recovered location
        add(ValidateLocationEvent(location));
      }
    } catch (error) {
      final errorDetails = GPSErrorRecoveryService.analyzeGPSError(error);
      
      emit(LocationGPSError(
        errorDetails: errorDetails,
        attemptCount: attemptCount,
        canRetry: errorDetails.canRetry && attemptCount < 3,
        hasAlternativeMethod: errorDetails.hasAlternativeMethod,
        timestamp: DateTime.now(),
      ));
    }
  }

  Future<void> _onFallbackToWiFi(
    FallbackToWiFiEvent event,
    Emitter<LocationState> emit,
  ) async {
    final isWiFiAvailable = await GPSErrorRecoveryService.isWiFiFallbackAvailable();
    
    if (isWiFiAvailable) {
      emit(LocationFallbackAvailable(
        fallbackMethod: 'WiFi-based Location',
        message: 'GPS is unavailable. You can use WiFi-based clock-in instead.',
        instructions: [
          'Make sure you are connected to the office WiFi network',
          'Tap "Use WiFi Clock-in" to proceed',
          'Your location will be verified using WiFi network detection',
        ],
      ));
    } else {
      emit(LocationManualOverrideRequired(
        reason: 'Both GPS and WiFi location methods are unavailable',
        instructions: [
          'Contact your supervisor for manual clock-in approval',
          'Provide your current location and reason for manual override',
          'Keep this app open to show the error details',
        ],
        supportInfo: GPSErrorRecoveryService.getTechnicalSupportInfo(),
      ));
    }
  }

  Future<void> _onRequestManualOverride(
    RequestManualOverrideEvent event,
    Emitter<LocationState> emit,
  ) async {
    emit(LocationManualOverrideRequired(
      reason: event.reason,
      instructions: [
        'Contact your supervisor or HR department',
        'Explain the technical issue: "${event.reason}"',
        'Request manual clock-in approval',
        'Show this screen as proof of the technical issue',
      ],
      supportInfo: GPSErrorRecoveryService.getTechnicalSupportInfo(),
    ));
  }

  Future<void> _onGetLocationImprovementSuggestions(
    GetLocationImprovementSuggestionsEvent event,
    Emitter<LocationState> emit,
  ) async {
    final suggestions = GPSErrorRecoveryService.generateLocationImprovementSuggestions(
      isIndoors: true, // This could be detected or user-provided
      hasWiFi: await GPSErrorRecoveryService.isWiFiFallbackAvailable(),
      lastKnownAccuracy: null, // Could be from previous location attempt
    );

    emit(LocationImprovementSuggestions(
      suggestions: suggestions,
      canRetry: true,
      estimatedWaitTime: const Duration(minutes: 2),
    ));
  }

  Future<void> _onContactTechnicalSupport(
    ContactTechnicalSupportEvent event,
    Emitter<LocationState> emit,
  ) async {
    final supportInfo = GPSErrorRecoveryService.getTechnicalSupportInfo();
    
    emit(LocationTechnicalSupportContacted(
      supportInfo: supportInfo,
      issueDescription: event.issueDescription,
      diagnosticInfo: event.diagnosticInfo,
      ticketId: 'GPS-${DateTime.now().millisecondsSinceEpoch}',
    ));
  }

  
Future<void> _onGetNearestOffice(
    GetNearestOfficeEvent event,
    Emitter<LocationState> emit,
  ) async {
    try {
      // Don't emit LocationLoading - preserve current location state
      // emit(LocationLoading()); // Remove this line
      
      final result = await getNearestOfficeUseCase(GetNearestOfficeParams(userLocation: event.userLocation));
      
      result.fold(
        (failure) {
          // Emit error but preserve location data if available
          if (state is LocationLoaded) {
            final currentState = state as LocationLoaded;
            emit(LocationLoadedWithOfficeError(
              location: currentState.location,
              accuracy: currentState.accuracy,
              isValidForClockIn: currentState.isValidForClockIn,
              officeError: failure.message,
            ));
          } else {
            emit(LocationError(message: failure.message));
          }
        },
        (office) {
          if (office != null) {
            emit(NearestOfficeDetected(
              office: office,
              distance: office.distanceFromUser ?? 0.0,
              userLocation: event.userLocation, // Add this line
            ));
          } else {
            // Preserve location state even when no office found
            if (state is LocationLoaded) {
              final currentState = state as LocationLoaded;
              emit(LocationLoadedWithoutOffice(
                location: currentState.location,
                accuracy: currentState.accuracy,
                isValidForClockIn: false, // Can't clock in without office
              ));
            } else {
              emit(LocationError(message: 'No nearby office found'));
            }
          }
        });
      }
   catch (e) {
    if (state is LocationLoaded) {
      final currentState = state as LocationLoaded;
      emit(LocationLoadedWithOfficeError(
        location: currentState.location,
        accuracy: currentState.accuracy,
        isValidForClockIn: currentState.isValidForClockIn,
        officeError: 'Failed to get nearest office: ${e.toString()}',
      ));
    } else {
      emit(LocationError(message: 'Failed to get nearest office: ${e.toString()}'));
    }
  }
}
  
  Future<void> _onRequestLocationPermission(
    RequestLocationPermissionEvent event,
    Emitter<LocationState> emit,
  ) async {
    if (event.showExplanation) {
      emit(LocationPermissionExplanationRequired(
        reason: 'We need location access to verify you are at the office when clocking in.',
      ));
      return;
    }
    
    emit(LocationLoading());

    final result = await requestLocationPermissionUseCase(NoParams());
    
    result.fold(
      (failure) {
        final permissionStatus = Permission.location.status;
        permissionStatus.then((status) {
          if (status.isPermanentlyDenied) {
            emit(LocationPermissionDenied(
              message: 'Location permission permanently denied. Please enable in settings.',
              isPermanentlyDenied: true,
            ));
          } else {
            emit(LocationPermissionDenied(
              message: failure.message,
              shouldShowRationale: true,
            ));
          }
        });
      },
      (granted) {
        if (granted) {
          emit(LocationPermissionGranted(permissionType: 'whileInUse'));
          add(GetCurrentLocationEvent());
        } else {
          emit(LocationPermissionDenied(
            message: 'Location permission is required for clock-in functionality',
            shouldShowRationale: true,
          ));
        }
      },
    );
  }

  Future<void> _onValidateLocation(
    ValidateLocationEvent event,
    Emitter<LocationState> emit,
  ) async {
    final result = await validateLocationUseCase(
      ValidateLocationParams(userLocation: event.location),
    );
    
    result.fold(
      (failure) => emit(LocationError(message: failure.message)),
      (isValid) => emit(LocationValidationResult(
        isValid: isValid,
        message: isValid
            ? 'Location is valid for clock-in'
            : 'You must be at the office to clock in',
      )),
    );
  }
  
  Future<void> _onCheckLocationPermission(
    CheckLocationPermissionEvent event,
    Emitter<LocationState> emit,
  ) async {
    final status = await Permission.location.status;
    
    if (status.isGranted) {
      emit(LocationPermissionGranted(permissionType: 'whileInUse'));
    } else if (status.isPermanentlyDenied) {
      emit(LocationPermissionDenied(
        message: 'Location permission permanently denied',
        isPermanentlyDenied: true,
      ));
    } else {
      emit(LocationPermissionDenied(
        message: 'Location permission not granted',
        shouldShowRationale: status.isDenied,
      ));
    }
  }
  
  Future<void> _onCheckLocationService(
    CheckLocationServiceEvent event,
    Emitter<LocationState> emit,
  ) async {
    // This would typically check if location services are enabled
    // Implementation depends on the specific location service package used
  }
  
  Future<void> _onOpenLocationSettings(
    OpenLocationSettingsEvent event,
    Emitter<LocationState> emit,
  ) async {
    await openAppSettings();
  }
  
  Future<void> _onShowPermissionExplanation(
    ShowPermissionExplanationEvent event,
    Emitter<LocationState> emit,
  ) async {
    emit(LocationPermissionExplanationRequired(reason: event.reason));
  }
  
  @override
  Stream<LocationState> mapEventToState(LocationEvent event) async* {
    if (event is RequestLocationAccuracyFeedback) {
      yield* _mapRequestLocationAccuracyFeedbackToState(event);
    } else if (event is DetectLocationSource) {
      yield* _mapDetectLocationSourceToState(event);
    }
  }

  Stream<LocationState> _mapRequestLocationAccuracyFeedbackToState(
    RequestLocationAccuracyFeedback event,
  ) async* {
    final location = event.location;
    final accuracyLevel = location.accuracyLevel;
    final tips = _generateImprovementTips(location);
    final shouldSuggestAlternatives = accuracyLevel == LocationAccuracyLevel.poor;

    yield LocationAccuracyFeedback(
      location: location,
      accuracyLevel: accuracyLevel,
      improvementTips: tips,
      shouldSuggestAlternatives: shouldSuggestAlternatives,
    );
  }

  Stream<LocationState> _mapDetectLocationSourceToState(
    DetectLocationSource event,
  ) async* {
    try {
      // Detect current location source and provider information
      final sourceInfo = await _detectLocationSource();
      
      yield LocationSourceDetected(
        source: sourceInfo['source'],
        provider: sourceInfo['provider'],
        sourceDetails: sourceInfo['details'],
      );
    } catch (e) {
      yield LocationError(message: 'Failed to detect location source: ${e.toString()}');
    }
  }

  List<String> _generateImprovementTips(Location location) {
    final tips = <String>[];
    final accuracyLevel = location.accuracyLevel;
    final source = location.source;

    if (accuracyLevel == LocationAccuracyLevel.poor || 
        accuracyLevel == LocationAccuracyLevel.fair) {
      tips.add('Move to an open area with clear sky view');
      tips.add('Ensure location services are set to high accuracy');
      tips.add('Wait a few moments for GPS to stabilize');
      
      if (source != LocationSource.gps) {
        tips.add('Enable GPS for better accuracy');
      }
    }

    if (source == LocationSource.network || source == LocationSource.wifi) {
      tips.add('Connect to office WiFi for improved location detection');
    }

    if (accuracyLevel == LocationAccuracyLevel.poor) {
      tips.add('Consider using WiFi-based clock-in as an alternative');
      tips.add('Check if you\'re in a building that blocks GPS signals');
    }

    return tips;
  }

  Future<Map<String, dynamic>> _detectLocationSource() async {
    // Implementation to detect current location source
    // This would use platform-specific code to determine the actual source
    return {
      'source': LocationSource.gps,
      'provider': 'geolocator',
      'details': {
        'satellites': 8,
        'signal_strength': 'strong',
      },
    };
  }
}