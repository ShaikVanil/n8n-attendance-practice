abstract class AttendanceEvent {}

class GetCurrentAttendanceEvent extends AttendanceEvent {}

class ClockInEvent extends AttendanceEvent {
  final String location;
  final String? notes;
    final String? officeId;

  ClockInEvent({
    required this.location,
    this.notes,
    this.officeId,
  });
}

class ClockOutEvent extends AttendanceEvent {
  final String attendanceId;
  final String? notes;
  final String? location;

  ClockOutEvent({
    required this.attendanceId,
    this.notes,
    this.location,
  });
}

class GetAttendanceHistoryEvent extends AttendanceEvent {}

class RefreshAttendanceEvent extends AttendanceEvent {}

// New events for Story 4.2
class SyncOfflineRequestsEvent extends AttendanceEvent {}

class NetworkStatusChangedEvent extends AttendanceEvent {
  final bool isOnline;
  final String connectionType;

  NetworkStatusChangedEvent({
    required this.isOnline,
    required this.connectionType,
  });
}

class CheckNetworkStatusEvent extends AttendanceEvent {}

class ForceSyncEvent extends AttendanceEvent {}

class ValidateClockInDataEvent extends AttendanceEvent {
  final String location;
  final String? notes;

  ValidateClockInDataEvent({
    required this.location,
    this.notes,
  });
}

class ValidateClockOutDataEvent extends AttendanceEvent {
  final String attendanceId;
  final String? notes;
  final String? location;

  ValidateClockOutDataEvent({
    required this.attendanceId,
    this.notes,
    this.location,
  });
}

class ConfirmUnusualPatternEvent extends AttendanceEvent {
  final String confirmationType;
  final Map<String, dynamic> confirmationData;

  ConfirmUnusualPatternEvent({
    required this.confirmationType,
    required this.confirmationData,
  });
}