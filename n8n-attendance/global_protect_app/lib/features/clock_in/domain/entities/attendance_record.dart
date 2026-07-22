import 'package:equatable/equatable.dart';
import 'package:global_protect_app/core/injection/injection_container.dart';
import 'package:global_protect_app/core/services/timezone_service.dart';


class AttendanceRecord extends Equatable {
  final String id;
  final String userId;
  final DateTime clockInTime;
  final DateTime? clockOutTime;
  final String? clockInLocation;
  final String? clockOutLocation;
  final String? notes;
  final Duration? totalHours;
  final AttendanceStatus status;

  const AttendanceRecord({
    required this.id,
    required this.userId,
    required this.clockInTime,
    this.clockOutTime,
    this.clockInLocation,
    this.clockOutLocation,
    this.notes,
    this.totalHours,
    required this.status,
  });

  Duration get workedDuration {
    if (clockOutTime != null) {
      final now = DateTime.now();
      final clockOutDateTime = DateTime(now.year, now.month, now.day, clockOutTime!.hour, clockOutTime!.minute);
      final clockInDateTime = DateTime(now.year, now.month, now.day, clockInTime!.hour, clockInTime!.minute);
      return clockOutDateTime.difference(clockInDateTime);
    }
    final now = DateTime.now();
    return now.difference(DateTime(now.year, now.month, now.day, clockInTime!.hour, clockInTime!.minute));
  }

  String get formattedWorkedTime {
    final duration = workedDuration;
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    return '${hours}h ${minutes}m';
  }

  // Add these new getters
  String get formattedClockInTime {
    final timezoneService = sl<TimezoneService>();
    return timezoneService.formatTimeForDisplay(clockInTime, pattern: 'HH:mm');
  }

  String get formattedClockOutTime {
    if (clockOutTime == null) return '--:--';
    final timezoneService = sl<TimezoneService>();
    return timezoneService.formatTimeForDisplay(clockOutTime!, pattern: 'HH:mm');
  }

  String get formattedClockInDateTime {
    final timezoneService = sl<TimezoneService>();
    return timezoneService.formatTimeForDisplay(clockInTime);
  }

  String get formattedClockOutDateTime {
    if (clockOutTime == null) return 'Not clocked out';
    final timezoneService = sl<TimezoneService>();
    return timezoneService.formatTimeForDisplay(clockOutTime!);
  }

  @override
  List<Object?> get props => [
        id,
        userId,
        clockInTime,
        clockOutTime,
        clockInLocation,
        clockOutLocation,
        notes,
        totalHours,
        status,
      ];
}

enum AttendanceStatus {
  clockedIn,
  clockedOut,
  break_out,
}