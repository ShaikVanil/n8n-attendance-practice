import 'package:equatable/equatable.dart';
import 'package:global_protect_app/core/services/data_validation_service.dart';
import 'package:global_protect_app/core/services/sync_service.dart';
import 'package:global_protect_app/features/clock_in/domain/entities/attendance_record.dart';

abstract class AttendanceState extends Equatable {
  const AttendanceState();

  @override
  List<Object?> get props => [];
}

class AttendanceInitial extends AttendanceState {}

class AttendanceLoading extends AttendanceState {}

class AttendanceLoaded extends AttendanceState {
  final AttendanceRecord? currentAttendance;
  final bool isOnline;
  final int pendingOfflineRequests;
  final String connectionType;
  final DateTime lastSyncTime;

  AttendanceLoaded({
    this.currentAttendance,
    required this.isOnline,
    this.pendingOfflineRequests = 0,
    this.connectionType = 'unknown',
    DateTime? lastSyncTime,
  }) : lastSyncTime = lastSyncTime ?? DateTime(2024, 1, 1);

  // Fix the isClockedIn getter to exclude summary records
  bool get isClockedIn => 
    currentAttendance != null && 
    currentAttendance!.clockOutTime == null &&
    currentAttendance!.id != 'today-summary'; // Exclude summary records

  @override
  List<Object?> get props => [
        currentAttendance,
        isOnline,
        pendingOfflineRequests,
        connectionType,
        lastSyncTime
      ];

  AttendanceLoaded copyWith({
    AttendanceRecord? currentAttendance,
    bool? isOnline,
    int? pendingOfflineRequests,
    String? connectionType,
    DateTime? lastSyncTime,
  }) {
    return AttendanceLoaded(
      currentAttendance: currentAttendance ?? this.currentAttendance,
      isOnline: isOnline ?? this.isOnline,
      pendingOfflineRequests:
          pendingOfflineRequests ?? this.pendingOfflineRequests,
      connectionType: connectionType ?? this.connectionType,
      lastSyncTime: lastSyncTime ?? this.lastSyncTime,
    );
  }
}

class AttendanceOfflineMode extends AttendanceState {
  final int queuedRequests;
  final String message;
  final DateTime offlineSince;

  AttendanceOfflineMode({
    required this.queuedRequests,
    required this.message,
    DateTime? offlineSince,
  }) : offlineSince = offlineSince ?? DateTime(2024, 1, 1);

  @override
  List<Object?> get props => [queuedRequests, message, offlineSince];
}

class AttendanceSyncing extends AttendanceState {
  final int totalRequests;
  final int syncedRequests;
  final String currentSyncItem;

  const AttendanceSyncing({
    required this.totalRequests,
    this.syncedRequests = 0,
    this.currentSyncItem = '',
  });

  @override
  List<Object?> get props => [totalRequests, syncedRequests, currentSyncItem];
}

class AttendanceSyncCompleted extends AttendanceState {
  final SyncResult result;
  final DateTime syncTime;

  AttendanceSyncCompleted({
    required this.result,
    DateTime? syncTime,
  }) : syncTime = syncTime ?? DateTime(2024, 1, 1);

  @override
  List<Object?> get props => [result, syncTime];
}

class AttendanceNetworkStatusChanged extends AttendanceState {
  final bool isOnline;
  final String connectionType;
  final int pendingRequests;

  const AttendanceNetworkStatusChanged({
    required this.isOnline,
    required this.connectionType,
    this.pendingRequests = 0,
  });

  @override
  List<Object?> get props => [isOnline, connectionType, pendingRequests];
}

class ClockOutSuccess extends AttendanceState {
  final AttendanceRecord attendance;
  final Duration totalWorkedTime;

  const ClockOutSuccess({
    required this.attendance,
    required this.totalWorkedTime,
  });

  @override
  List<Object> get props => [attendance, totalWorkedTime];
}

class ClockInSuccess extends AttendanceState {
  final AttendanceRecord attendance;
  final Duration? workedDuration;

  const ClockInSuccess({
    required this.attendance,
    this.workedDuration,
  });

  @override
  List<Object?> get props => [attendance, workedDuration];
}

class AttendanceError extends AttendanceState {
  final String message;
  final bool isOfflineError;
  final bool canRetry;

  const AttendanceError({
    required this.message,
    this.isOfflineError = false,
    this.canRetry = true,
  });

  @override
  List<Object?> get props => [message, isOfflineError, canRetry];
}

class AttendanceValidationError extends AttendanceState {
  final String message;
  final ValidationSeverity severity;
  final String? suggestion;
  final bool canProceed;

  const AttendanceValidationError({
    required this.message,
    required this.severity,
    this.suggestion,
    this.canProceed = false,
  });

  @override
  List<Object?> get props => [message, severity, suggestion, canProceed];
}

class AttendanceValidationWarning extends AttendanceState {
  final String message;
  final String? suggestion;
  final Map<String, dynamic> confirmationData;

  const AttendanceValidationWarning({
    required this.message,
    this.suggestion,
    required this.confirmationData,
  });

  @override
  List<Object?> get props => [message, suggestion, confirmationData];
}

class AttendanceValidationSuccess extends AttendanceState {
  final String message;

  const AttendanceValidationSuccess({required this.message});

  @override
  List<Object?> get props => [message];
}
