import 'package:equatable/equatable.dart';

abstract class PrivacyEvent extends Equatable {
  const PrivacyEvent();

  @override
  List<Object?> get props => [];
}

class LoadPrivacySettingsEvent extends PrivacyEvent {}

class UpdateLocationSharingEvent extends PrivacyEvent {
  final bool limitToWorkHours;

  const UpdateLocationSharingEvent({required this.limitToWorkHours});

  @override
  List<Object?> get props => [limitToWorkHours];
}

class UpdateLocationAccuracyEvent extends PrivacyEvent {
  final bool useHighAccuracy;

  const UpdateLocationAccuracyEvent({required this.useHighAccuracy});

  @override
  List<Object?> get props => [useHighAccuracy];
}

class LoadUserDataEvent extends PrivacyEvent {}

class RequestDataDeletionEvent extends PrivacyEvent {}