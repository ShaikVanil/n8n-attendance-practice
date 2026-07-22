import 'package:equatable/equatable.dart';

class UserData extends Equatable {
  final String userId;
  final List<LocationRecord> locationHistory;
  final List<AttendanceRecord> attendanceHistory;
  final DateTime dataRetentionUntil;
  final int totalDataPoints;

  const UserData({
    required this.userId,
    required this.locationHistory,
    required this.attendanceHistory,
    required this.dataRetentionUntil,
    required this.totalDataPoints,
  });

  @override
  List<Object?> get props => [
        userId,
        locationHistory,
        attendanceHistory,
        dataRetentionUntil,
        totalDataPoints,
      ];
}

class LocationRecord extends Equatable {
  final double latitude;
  final double longitude;
  final DateTime timestamp;
  final String purpose; // 'clock_in', 'clock_out'

  const LocationRecord({
    required this.latitude,
    required this.longitude,
    required this.timestamp,
    required this.purpose,
  });

  @override
  List<Object?> get props => [latitude, longitude, timestamp, purpose];
}

class AttendanceRecord extends Equatable {
  final DateTime clockIn;
  final DateTime? clockOut;
  final String status;
  final String? notes;

  const AttendanceRecord({
    required this.clockIn,
    this.clockOut,
    required this.status,
    this.notes,
  });

  @override
  List<Object?> get props => [clockIn, clockOut, status, notes];
}