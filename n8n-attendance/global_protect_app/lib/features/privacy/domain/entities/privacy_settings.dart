import 'package:equatable/equatable.dart';

class PrivacySettings extends Equatable {
  final bool limitLocationToWorkHours;
  final bool useHighAccuracyLocation;
  final bool allowDataCollection;
  final DateTime lastUpdated;

  const PrivacySettings({
    required this.limitLocationToWorkHours,
    required this.useHighAccuracyLocation,
    required this.allowDataCollection,
    required this.lastUpdated,
  });

  PrivacySettings copyWith({
    bool? limitLocationToWorkHours,
    bool? useHighAccuracyLocation,
    bool? allowDataCollection,
    DateTime? lastUpdated,
  }) {
    return PrivacySettings(
      limitLocationToWorkHours: limitLocationToWorkHours ?? this.limitLocationToWorkHours,
      useHighAccuracyLocation: useHighAccuracyLocation ?? this.useHighAccuracyLocation,
      allowDataCollection: allowDataCollection ?? this.allowDataCollection,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }

  @override
  List<Object?> get props => [
        limitLocationToWorkHours,
        useHighAccuracyLocation,
        allowDataCollection,
        lastUpdated,
      ];
}