import 'package:flutter/material.dart';

import '../../domain/entities/attendance_record.dart';
import '../../../../core/services/timezone_service.dart';
import '../../../../core/injection/injection_container.dart';

class AttendanceRecordModel extends AttendanceRecord {
  const AttendanceRecordModel({
    required super.id,
    required super.userId,
    required super.clockInTime,
    super.clockOutTime,
    super.clockInLocation,
    super.clockOutLocation,
    super.notes,
    super.totalHours,
    required super.status,
  });

  factory AttendanceRecordModel.fromJson(Map<String, dynamic> json) {
    final timezoneService = sl<TimezoneService>();
    
    return AttendanceRecordModel(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      clockInTime: timezoneService.parseApiTimeToOfficeTime(json['check_in_time'] as String),
      clockOutTime: json['check_out_time'] != null
          ? timezoneService.parseApiTimeToOfficeTime(json['check_out_time'] as String)
          : null,
      clockInLocation: json['check_in_location'] as String?,
      clockOutLocation: json['check_out_location'] as String?,
      notes: json['notes'] as String?,
      totalHours: json['total_hours'] != null
          ? _parseTotalHours(json['total_hours'])
          : null,
      status: _mapBackendStatusToEnum(json['status'] as String),
    );
  }

  // Add helper method to map backend status to enum
  static AttendanceStatus _mapBackendStatusToEnum(String backendStatus) {
    switch (backendStatus.toLowerCase()) {
      case 'active':
        return AttendanceStatus.clockedIn;
      case 'completed':
        return AttendanceStatus.clockedOut;
      default:
        return AttendanceStatus.clockedOut;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'clockInTime': DateTime(
        DateTime.now().year,
        DateTime.now().month,
        DateTime.now().day,
        clockInTime?.hour ?? 0,
        clockInTime?.minute ?? 0,
      ).toIso8601String(),
      'clockOutTime': clockOutTime != null
          ? DateTime(
              DateTime.now().year,
              DateTime.now().month,
              DateTime.now().day,
              clockOutTime!.hour,
              clockOutTime!.minute,
            ).toIso8601String()
          : null,
      'clockInLocation': clockInLocation,
      'clockOutLocation': clockOutLocation,
      'notes': notes,
      'totalHours': totalHours?.inMilliseconds,
      'status': status.name,
    };
  }

  AttendanceRecord toEntity() {
    return AttendanceRecord(
      id: id,
      userId: userId,
      clockInTime: clockInTime,
      clockOutTime: clockOutTime,
      clockInLocation: clockInLocation,
      clockOutLocation: clockOutLocation,
      notes: notes,
      totalHours: totalHours,
      status: status,
    );
  }
  
  // Add factory method for today's summary from status API
  // Update the fromTodaySummary factory to set clockOutTime properly
  factory AttendanceRecordModel.fromTodaySummary(Map<String, dynamic> json) {
    final todayTotalHours = (json['today_total_hours'] as num?)?.toDouble() ?? 0.0;
    
    return AttendanceRecordModel(
      id: 'today-summary', // Temporary ID for today's summary
      userId: '', // Will be filled from user context
      clockInTime: DateTime.now().subtract(Duration(hours: 8)), // Approximate start of day
      clockOutTime: DateTime.now(), // Set to current time to indicate completed work
      clockInLocation: null,
      clockOutLocation: null,
      notes: null,
      totalHours: Duration(minutes: (todayTotalHours * 60).toInt()), // Convert hours to Duration
      status: AttendanceStatus.clockedOut, // Always clockedOut for summary
    );
  }

  // Add helper method to parse total_hours from string
  static Duration? _parseTotalHours(dynamic totalHours) {
    if (totalHours == null) return null;
    
    try {
      // Handle both string and number formats
      double hours;
      if (totalHours is String) {
        hours = double.parse(totalHours);
      } else if (totalHours is num) {
        hours = totalHours.toDouble();
      } else {
        return null;
      }
      
      // Convert decimal hours to Duration
      final totalMinutes = (hours * 60).round();
      return Duration(minutes: totalMinutes);
    } catch (e) {
      print('Error parsing total_hours: $e');
      return null;
    }
  }
}