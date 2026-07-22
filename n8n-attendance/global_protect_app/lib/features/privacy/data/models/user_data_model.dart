import '../../domain/entities/user_data.dart';

class UserDataModel extends UserData {
  const UserDataModel({
    required String userId,
    required List<LocationRecord> locationHistory,
    required List<AttendanceRecord> attendanceHistory,
    required DateTime dataRetentionUntil,
    required int totalDataPoints,
  }) : super(
          userId: userId,
          locationHistory: locationHistory,
          attendanceHistory: attendanceHistory,
          dataRetentionUntil: dataRetentionUntil,
          totalDataPoints: totalDataPoints,
        );

  factory UserDataModel.fromJson(Map<String, dynamic> json) {
    return UserDataModel(
      userId: json['userId'],
      locationHistory: (json['locationHistory'] as List)
          .map((item) => LocationRecordModel.fromJson(item))
          .toList(),
      attendanceHistory: (json['attendanceHistory'] as List)
          .map((item) => AttendanceRecordModel.fromJson(item))
          .toList(),
      dataRetentionUntil: DateTime.parse(json['dataRetentionUntil']),
      totalDataPoints: json['totalDataPoints'],
    );
  }
}

class LocationRecordModel extends LocationRecord {
  const LocationRecordModel({
    required double latitude,
    required double longitude,
    required DateTime timestamp,
    required String purpose,
  }) : super(
          latitude: latitude,
          longitude: longitude,
          timestamp: timestamp,
          purpose: purpose,
        );

  factory LocationRecordModel.fromJson(Map<String, dynamic> json) {
    return LocationRecordModel(
      latitude: json['latitude'].toDouble(),
      longitude: json['longitude'].toDouble(),
      timestamp: DateTime.parse(json['timestamp']),
      purpose: json['purpose'],
    );
  }
}

class AttendanceRecordModel extends AttendanceRecord {
  const AttendanceRecordModel({
    required DateTime clockIn,
    DateTime? clockOut,
    required String status,
    String? notes,
  }) : super(
          clockIn: clockIn,
          clockOut: clockOut,
          status: status,
          notes: notes,
        );

  factory AttendanceRecordModel.fromJson(Map<String, dynamic> json) {
    return AttendanceRecordModel(
      clockIn: DateTime.parse(json['clockIn']),
      clockOut: json['clockOut'] != null ? DateTime.parse(json['clockOut']) : null,
      status: json['status'],
      notes: json['notes'],
    );
  }
}