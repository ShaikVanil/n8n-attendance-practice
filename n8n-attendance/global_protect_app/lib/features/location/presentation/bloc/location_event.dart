import 'package:equatable/equatable.dart';
import 'package:global_protect_app/core/services/gps_error_recovery_service.dart';
import 'package:global_protect_app/features/location/domain/entities/location.dart';
import 'package:global_protect_app/features/location/domain/entities/office_location.dart';

abstract class LocationEvent extends Equatable {
  const LocationEvent();

  @override
  List<Object> get props => [];
}

class GetCurrentLocationEvent extends LocationEvent {}

class RequestLocationPermissionEvent extends LocationEvent {
  final bool showExplanation;

  const RequestLocationPermissionEvent({this.showExplanation = false});
}

class ValidateLocationEvent extends LocationEvent {
  final Location location;

  const ValidateLocationEvent(this.location);

  @override
  List<Object> get props => [location];
}

class GetOfficeLocationsEvent extends LocationEvent {}

class GetNearestOfficeEvent extends LocationEvent {
  final Location userLocation;

  const GetNearestOfficeEvent(this.userLocation);

  @override
  List<Object> get props => [userLocation];
}

class SelectOfficeEvent extends LocationEvent {
  final OfficeLocation office;

  const SelectOfficeEvent(this.office);

  @override
  List<Object> get props => [office];
}

class CheckLocationPermissionEvent extends LocationEvent {}

class CheckLocationServiceEvent extends LocationEvent {}

class OpenLocationSettingsEvent extends LocationEvent {}

class ShowPermissionExplanationEvent extends LocationEvent {
  final String reason;
  
  ShowPermissionExplanationEvent({required this.reason});
}

class RequestLocationAccuracyFeedback extends LocationEvent {
  final Location location;

  const RequestLocationAccuracyFeedback(this.location);

  @override
  List<Object> get props => [location];
}

class DetectLocationSource extends LocationEvent {
  const DetectLocationSource();

  @override
  List<Object> get props => [];
}

class RequestAlternativeClockInMethods extends LocationEvent {
  const RequestAlternativeClockInMethods();

  @override
  List<Object> get props => [];
}

class RetryLocationEvent extends LocationEvent {
  final bool useAlternativeMethod;
  final RetryConfig? customConfig;

  const RetryLocationEvent({
    this.useAlternativeMethod = false,
    this.customConfig,
  });
}

class FallbackToWiFiEvent extends LocationEvent {
  const FallbackToWiFiEvent();
}

class RequestManualOverrideEvent extends LocationEvent {
  final String reason;
  final String? supervisorId;

  const RequestManualOverrideEvent({
    required this.reason,
    this.supervisorId,
  });
}

class GetLocationImprovementSuggestionsEvent extends LocationEvent {
  const GetLocationImprovementSuggestionsEvent();
}

class ContactTechnicalSupportEvent extends LocationEvent {
  final String issueDescription;
  final Map<String, dynamic> diagnosticInfo;

  const ContactTechnicalSupportEvent({
    required this.issueDescription,
    required this.diagnosticInfo,
  });
}