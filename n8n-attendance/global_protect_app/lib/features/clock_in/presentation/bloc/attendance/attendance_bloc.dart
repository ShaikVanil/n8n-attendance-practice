import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:global_protect_app/core/error/failures.dart';
import 'package:global_protect_app/core/services/notification_service.dart';
import 'package:global_protect_app/features/clock_in/domain/entities/attendance_record.dart';
import 'package:global_protect_app/features/clock_in/domain/usecases/clock_in_usecase.dart';
import 'package:global_protect_app/features/notifications/domain/entities/notification.dart';
import '../../../../../core/usecases/usecase.dart';
import '../../../../../core/network/network_info.dart';
import '../../../../../core/services/sync_service.dart';
import '../../../domain/usecases/clock_out_usecase.dart';
import '../../../domain/usecases/get_current_attendance_usecase.dart';
import '../../../domain/repositories/attendance_repository.dart';
import 'attendance_event.dart';
import 'attendance_state.dart';
import '../../../../../core/services/data_validation_service.dart';

class AttendanceBloc extends Bloc<AttendanceEvent, AttendanceState> {
  final ClockInUseCase clockInUseCase;
  final ClockOutUseCase clockOutUseCase;
  final GetCurrentAttendanceUseCase getCurrentAttendanceUseCase;
  final NetworkInfo networkInfo;
  final SyncService syncService;
  final NotificationService notificationService; // Add this
  final AttendanceRepository attendanceRepository;
  final DataValidationService _validationService;

  StreamSubscription<ConnectivityResult>? _connectivitySubscription;
  StreamSubscription<SyncStatus>? _syncStatusSubscription;

  AttendanceBloc({
    required this.clockInUseCase,
    required this.clockOutUseCase,
    required this.getCurrentAttendanceUseCase,
    required this.networkInfo,
    required this.syncService,
    required this.notificationService,
    required this.attendanceRepository,
    required DataValidationService validationService,
  })  : _validationService = validationService,
        super(AttendanceInitial()) {
    on<GetCurrentAttendanceEvent>(_onGetCurrentAttendance);
    on<ClockInEvent>(_onClockIn); // ADD THIS LINE
    on<ClockOutEvent>(_onClockOut);
    on<RefreshAttendanceEvent>(_onRefreshAttendance);
    on<SyncOfflineRequestsEvent>(_onSyncOfflineRequests);
    on<NetworkStatusChangedEvent>(_onNetworkStatusChanged);
    on<CheckNetworkStatusEvent>(_onCheckNetworkStatus);
    on<ForceSyncEvent>(_onForceSync);
    on<ValidateClockInDataEvent>(_onValidateClockInData);
    on<ValidateClockOutDataEvent>(_onValidateClockOutData);
    on<ConfirmUnusualPatternEvent>(_onConfirmUnusualPattern);

    _initializeNetworkMonitoring();
  }

  void _initializeNetworkMonitoring() {
    // Monitor connectivity changes
    _connectivitySubscription =
        networkInfo.onConnectivityChanged.listen((result) {
      final isOnline = result != ConnectivityResult.none;
      final connectionType = result.toString().split('.').last;

      add(NetworkStatusChangedEvent(
        isOnline: isOnline,
        connectionType: connectionType,
      ));
    });

    // Monitor sync status changes
    _syncStatusSubscription = syncService.syncStatusStream.listen((syncStatus) {
      if (syncStatus == SyncStatus.syncing) {
        // Get pending count and emit syncing state
        _emitSyncingState();
      } else if (syncStatus == SyncStatus.idle) {
        // Refresh attendance to get updated pending count
        add(GetCurrentAttendanceEvent());
      }
    });
  }

  Future<void> _emitSyncingState() async {
    final pendingResult =
        await attendanceRepository.getPendingOfflineRequests();
    pendingResult.fold(
      (failure) => emit(AttendanceError(message: failure.message)),
      (requests) => emit(AttendanceSyncing(
        totalRequests: requests.length,
        syncedRequests: 0,
        currentSyncItem: requests.isNotEmpty ? 'Syncing clock-in data...' : '',
      )),
    );
  }

  Future<void> _onGetCurrentAttendance(
    GetCurrentAttendanceEvent event,
    Emitter<AttendanceState> emit,
  ) async {
    emit(AttendanceLoading());

    final result = await getCurrentAttendanceUseCase(NoParams());
    final isOnline = await networkInfo.isConnected;
    final pendingCountResult =
        await attendanceRepository.getOfflineRequestCount();

    result.fold(
      (failure) {
        if (failure.message.contains('No internet')) {
          pendingCountResult.fold(
            (countFailure) => emit(AttendanceError(message: failure.message)),
            (count) => emit(AttendanceOfflineMode(
              queuedRequests: count,
              message: 'You are offline. Clock-in requests will be queued.',
              offlineSince: DateTime.now(),
            )),
          );
        } else {
          emit(AttendanceError(message: failure.message));
        }
      },
      (attendance) {
        pendingCountResult.fold(
          (countFailure) => emit(AttendanceLoaded(
            currentAttendance: attendance,
            isOnline: isOnline,
            pendingOfflineRequests: 0,
            lastSyncTime: DateTime.now(),
          )),
          (count) => emit(AttendanceLoaded(
            currentAttendance: attendance,
            isOnline: isOnline,
            pendingOfflineRequests: count,
            lastSyncTime: DateTime.now(),
          )),
        );
      },
    );
  }

  Future<void> _onClockOut(
    ClockOutEvent event,
    Emitter<AttendanceState> emit,
  ) async {
    emit(AttendanceLoading());

    final params = ClockOutParams(
      attendanceId: event.attendanceId,
      notes: event.notes,
      location: event.location,
    );

    final result = await clockOutUseCase(params);
    result.fold(
      (failure) => emit(AttendanceError(message: failure.message)),
      (attendance) {
        final totalWorkedTime = attendance.workedDuration;
        emit(ClockOutSuccess(
            attendance: attendance, totalWorkedTime: totalWorkedTime));
        // Also update the loaded state
        emit(AttendanceLoaded(
          currentAttendance: attendance,
          isOnline: true,
          pendingOfflineRequests: 0,
          lastSyncTime: DateTime.now(),
        ));
      },
    );
  }

  Future<void> _onRefreshAttendance(
    RefreshAttendanceEvent event,
    Emitter<AttendanceState> emit,
  ) async {
    add(GetCurrentAttendanceEvent());
  }

  Future<void> _onSyncOfflineRequests(
    SyncOfflineRequestsEvent event,
    Emitter<AttendanceState> emit,
  ) async {
    final isOnline = await networkInfo.isConnected;
    if (!isOnline) {
      emit(const AttendanceError(
        message: 'Cannot sync while offline',
        isOfflineError: true,
      ));
      return;
    }

    final result = await attendanceRepository.syncOfflineRequests();
    result.fold(
      (failure) =>
          emit(AttendanceError(message: 'Sync failed: ${failure.message}')),
      (syncResult) {
        emit(AttendanceSyncCompleted(
          result: syncResult,
          syncTime: DateTime.now(),
        ));
        // Refresh attendance after sync
        add(GetCurrentAttendanceEvent());
      },
    );
  }

  Future<void> _onNetworkStatusChanged(
    NetworkStatusChangedEvent event,
    Emitter<AttendanceState> emit,
  ) async {
    final pendingCountResult =
        await attendanceRepository.getOfflineRequestCount();

    pendingCountResult.fold(
      (failure) => emit(AttendanceError(message: failure.message)),
      (count) {
        emit(AttendanceNetworkStatusChanged(
          isOnline: event.isOnline,
          connectionType: event.connectionType,
          pendingRequests: count,
        ));

        // If we're back online and have pending requests, trigger auto-sync
        if (event.isOnline && count > 0) {
          add(SyncOfflineRequestsEvent());
        }
      },
    );
  }

  Future<void> _onCheckNetworkStatus(
    CheckNetworkStatusEvent event,
    Emitter<AttendanceState> emit,
  ) async {
    final isOnline = await networkInfo.isConnected;
    final connectivity = await Connectivity().checkConnectivity();
    final connectionType = connectivity.toString().split('.').last;

    add(NetworkStatusChangedEvent(
      isOnline: isOnline,
      connectionType: connectionType,
    ));
  }

  Future<void> _onForceSync(
    ForceSyncEvent event,
    Emitter<AttendanceState> emit,
  ) async {
    await syncService.forceSyncNow();
  }

  @override
  Future<void> close() {
    _connectivitySubscription?.cancel();
    _syncStatusSubscription?.cancel();
    return super.close();
  }

  Future<void> _onValidateClockInData(
    ValidateClockInDataEvent event,
    Emitter<AttendanceState> emit,
  ) async {
    emit(AttendanceLoading());

    try {
      // Get current attendance and recent history for validation
      final currentResult = await getCurrentAttendanceUseCase(NoParams());
      final historyResult = await attendanceRepository.getAttendanceHistory();

      AttendanceRecord? currentAttendance;
      List<AttendanceRecord>? recentAttendance;

      currentResult.fold(
        (failure) => currentAttendance = null,
        (attendance) => currentAttendance = attendance,
      );

      historyResult.fold(
        (failure) => recentAttendance = null,
        (history) => recentAttendance = history.take(10).toList(),
      );

      // Perform validation
      final validationResult = await _validationService.validateClockInData(
        location: event.location,
        notes: event.notes,
        currentAttendance: currentAttendance,
        recentAttendance: recentAttendance,
      );

      if (validationResult.isValid) {
        emit(const AttendanceValidationSuccess(
          message: 'Validation successful. Proceeding with clock-in.',
        ));
      } else {
        if (validationResult.severity == ValidationSeverity.warning) {
          emit(AttendanceValidationWarning(
            message: validationResult.errorMessage!,
            suggestion: validationResult.suggestion,
            confirmationData: {
              'location': event.location,
              'notes': event.notes,
              'validation_type': 'clock_in_warning',
            },
          ));
        } else {
          emit(AttendanceValidationError(
            message: validationResult.errorMessage!,
            severity: validationResult.severity,
            suggestion: validationResult.suggestion,
            canProceed: false,
          ));
        }
      }
    } catch (e) {
      emit(AttendanceError(message: 'Validation failed: $e'));
    }
  }

  Future<void> _onValidateClockOutData(
    ValidateClockOutDataEvent event,
    Emitter<AttendanceState> emit,
  ) async {
    emit(AttendanceLoading());

    try {
      final currentResult = await getCurrentAttendanceUseCase(NoParams());

      currentResult.fold(
        (failure) => emit(
            AttendanceError(message: 'Cannot validate: ${failure.message}')),
        (currentAttendance) async {
          if (currentAttendance == null) {
            emit(const AttendanceValidationError(
              message: 'No active clock-in session found',
              severity: ValidationSeverity.error,
              canProceed: false,
            ));
            return;
          }

          final validationResult =
              await _validationService.validateClockOutData(
            attendanceId: event.attendanceId,
            currentAttendance: currentAttendance,
            notes: event.notes,
            location: event.location,
          );

          if (validationResult.isValid) {
            emit(const AttendanceValidationSuccess(
              message: 'Validation successful. Proceeding with clock-out.',
            ));
          } else {
            if (validationResult.severity == ValidationSeverity.warning) {
              emit(AttendanceValidationWarning(
                message: validationResult.errorMessage!,
                suggestion: validationResult.suggestion,
                confirmationData: {
                  'attendanceId': event.attendanceId,
                  'notes': event.notes,
                  'location': event.location,
                  'validation_type': 'clock_out_warning',
                },
              ));
            } else {
              emit(AttendanceValidationError(
                message: validationResult.errorMessage!,
                severity: validationResult.severity,
                suggestion: validationResult.suggestion,
                canProceed: false,
              ));
            }
          }
        },
      );
    } catch (e) {
      emit(AttendanceError(message: 'Validation failed: $e'));
    }
  }

  Future<void> _onConfirmUnusualPattern(
    ConfirmUnusualPatternEvent event,
    Emitter<AttendanceState> emit,
  ) async {
    // User confirmed they want to proceed despite warnings
    final data = event.confirmationData;

    if (data['validation_type'] == 'clock_in_warning') {
      // Proceed with clock-in
      add(ClockInEvent(
        location: data['location'],
        notes: data['notes'],
      ));
    } else if (data['validation_type'] == 'clock_out_warning') {
      // Proceed with clock-out
      add(ClockOutEvent(
        attendanceId: data['attendanceId'],
        notes: data['notes'],
        location: data['location'],
      ));
    }
  }

  Future<void> _onClockIn(
      ClockInEvent event, Emitter<AttendanceState> emit) async {
    emit(AttendanceLoading());

    try {
      // Get current user from auth context to check role
      // Note: This would require access to AuthBloc or user context
      
      final result = await clockInUseCase(ClockInParams(
        location: event.location,
        notes: event.notes,
      ));

      result.fold(
        (failure) {
          emit(AttendanceError(message: failure.message));
          // Show error notification with actionable advice
          notificationService.showErrorNotification(
            'Clock-In Failed',
            _getActionableErrorMessage(failure),
            actions: _getErrorActions(failure),
          );
        },
        (attendance) {
          emit(ClockInSuccess(
            attendance: attendance,
            workedDuration: attendance.workedDuration,
          ));
          // Also update the loaded state
          emit(AttendanceLoaded(
            currentAttendance: attendance,
            isOnline: true,
            pendingOfflineRequests: 0,
            lastSyncTime: DateTime.now(),
          ));
          // Show success notification
          notificationService.showSuccessNotification(
            'Clock-In Successful',
            'You have successfully clocked in at ${_formatTime(attendance.clockInTime)}',
          );
        },
      );
    } catch (e) {
      emit(AttendanceError(message: 'An unexpected error occurred'));
      notificationService.showErrorNotification(
        'Clock-In Failed',
        'An unexpected error occurred. Please try again.',
        actions: [
          NotificationAction(
            id: 'retry',
            label: 'Retry',
            action: 'retry_clock_in',
          ),
        ],
      );
    }
  }

  // Update error message handling for role-based scenarios
  String _getActionableErrorMessage(Failure failure) {
    if (failure.message.contains('Already checked in today')) {
      return 'You are already checked in today. Please check your current status or clock out first.';
    } else if (failure.message.contains('network')) {
      return 'Network connection failed. Check your internet connection and try again.';
    } else if (failure.message.contains('location')) {
      return 'Location access required. Please enable location services and try again.';
    } else if (failure.message.contains('wifi')) {
      return 'Please connect to the office WiFi network and try again.';
    } else if (failure.message.contains('Location validation failed')) {
      return 'You are not within the office boundary. Managers and admins can override this restriction.';
    }
    return failure.message;
  }

  List<NotificationAction> _getErrorActions(Failure failure) {
    final actions = <NotificationAction>[];

    if (failure.message.contains('Already checked in today')) {
      actions.addAll([
        const NotificationAction(
          id: 'check_status',
          label: 'Check Status',
          action: 'check_attendance_status',
        ),
        const NotificationAction(
          id: 'refresh',
          label: 'Refresh',
          action: 'refresh_attendance',
        ),
      ]);
    } else {
      actions.add(const NotificationAction(
        id: 'retry',
        label: 'Retry',
        action: 'retry',
      ));

      if (failure.message.contains('location')) {
        actions.add(const NotificationAction(
          id: 'settings',
          label: 'Settings',
          action: 'open_location_settings',
        ));
      } else if (failure.message.contains('wifi')) {
        actions.add(const NotificationAction(
          id: 'wifi',
          label: 'WiFi Settings',
          action: 'open_wifi_settings',
        ));
      }
    }

    return actions;
  }

  String _formatTime(DateTime? time) {
    if (time == null) return 'Unknown';
    return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
  }
}
