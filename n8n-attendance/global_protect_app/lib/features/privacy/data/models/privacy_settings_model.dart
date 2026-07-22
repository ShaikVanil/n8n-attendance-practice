import '../../domain/entities/privacy_settings.dart';

class PrivacySettingsModel extends PrivacySettings {
  const PrivacySettingsModel({
    required bool limitLocationToWorkHours,
    required bool useHighAccuracyLocation,
    required bool allowDataCollection,
    required DateTime lastUpdated,
  }) : super(
          limitLocationToWorkHours: limitLocationToWorkHours,
          useHighAccuracyLocation: useHighAccuracyLocation,
          allowDataCollection: allowDataCollection,
          lastUpdated: lastUpdated,
        );

  factory PrivacySettingsModel.fromJson(Map<String, dynamic> json) {
    return PrivacySettingsModel(
      limitLocationToWorkHours: json['limitLocationToWorkHours'] ?? false,
      useHighAccuracyLocation: json['useHighAccuracyLocation'] ?? true,
      allowDataCollection: json['allowDataCollection'] ?? true,
      lastUpdated: DateTime.parse(json['lastUpdated']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'limitLocationToWorkHours': limitLocationToWorkHours,
      'useHighAccuracyLocation': useHighAccuracyLocation,
      'allowDataCollection': allowDataCollection,
      'lastUpdated': lastUpdated.toIso8601String(),
    };
  }

  factory PrivacySettingsModel.fromEntity(PrivacySettings entity) {
    return PrivacySettingsModel(
      limitLocationToWorkHours: entity.limitLocationToWorkHours,
      useHighAccuracyLocation: entity.useHighAccuracyLocation,
      allowDataCollection: entity.allowDataCollection,
      lastUpdated: entity.lastUpdated,
    );
  }
}