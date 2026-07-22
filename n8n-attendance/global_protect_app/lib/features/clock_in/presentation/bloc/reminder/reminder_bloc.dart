import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter/material.dart';
import 'package:global_protect_app/core/usecases/usecase.dart';
import 'package:global_protect_app/features/authentication/domain/usecases/get_current_user_usecase.dart';
import 'package:global_protect_app/features/clock_in/domain/repositories/attendance_repository.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../../core/error/failures.dart';
import '../../../domain/entities/reminder.dart';
import '../../../domain/usecases/create_reminder_usecase.dart';
import '../../../domain/usecases/get_smart_reminders_usecase.dart';
import '../../../domain/usecases/snooze_reminder_usecase.dart';
import '../../../../../core/services/reminder_service.dart';
import 'reminder_event.dart';
import 'reminder_state.dart';

class ReminderBloc extends Bloc<ReminderEvent, ReminderState> {
  final CreateReminderUseCase createReminderUseCase;
  final GetSmartRemindersUseCase getSmartRemindersUseCase;
  final SnoozeReminderUseCase snoozeReminderUseCase;
  final ReminderService reminderService;
  final AttendanceRepository attendanceRepository; // Add this
  final GetCurrentUserUseCase getCurrentUserUseCase;
  final SharedPreferences _prefs;

  // Settings keys
  static const String _enabledKey = 'reminders_enabled';
  static const String _smartEnabledKey = 'smart_reminders_enabled';
  static const String _respectDndKey = 'respect_dnd';
  static const String _defaultTypeKey = 'default_reminder_type';
  static const String _defaultTimeHourKey = 'default_time_hour';
  static const String _defaultTimeMinuteKey = 'default_time_minute';

  ReminderBloc({
    required this.createReminderUseCase,
    required this.getSmartRemindersUseCase,
    required this.snoozeReminderUseCase,
    required this.reminderService,
    required this.attendanceRepository, // Add this
    required this.getCurrentUserUseCase,
    required SharedPreferences prefs,
  }) : _prefs = prefs,
       super(const ReminderInitial()) {
    on<LoadReminderSettingsEvent>(_onLoadReminderSettings);
    on<SaveReminderSettingsEvent>(_onSaveReminderSettings);
    on<CreateReminderEvent>(_onCreateReminder);
    on<UpdateReminderEvent>(_onUpdateReminder);
    on<DeleteReminderEvent>(_onDeleteReminder);
    on<SnoozeReminderEvent>(_onSnoozeReminder);
    on<LoadUserRemindersEvent>(_onLoadUserReminders);
    on<AnalyzeWorkPatternsEvent>(_onAnalyzeWorkPatterns);
    on<GenerateSmartRemindersEvent>(_onGenerateSmartReminders);
    on<TestReminderEvent>(_onTestReminder);
    on<ScheduleReminderEvent>(_onScheduleReminder);
    on<CancelReminderEvent>(_onCancelReminder);
  }

  Future<void> _onLoadReminderSettings(
    LoadReminderSettingsEvent event,
    Emitter<ReminderState> emit,
  ) async {
    emit(const ReminderLoading());
    
    try {
      final enabled = _prefs.getBool(_enabledKey) ?? true;
      final smartEnabled = _prefs.getBool(_smartEnabledKey) ?? true;
      final respectDnd = _prefs.getBool(_respectDndKey) ?? true;
      final defaultTypeIndex = _prefs.getInt(_defaultTypeKey) ?? 0;
      final defaultType = ReminderType.values[defaultTypeIndex];
      final defaultTimeHour = _prefs.getInt(_defaultTimeHourKey) ?? 17;
      final defaultTimeMinute = _prefs.getInt(_defaultTimeMinuteKey) ?? 0;
      final defaultTime = TimeOfDay(hour: defaultTimeHour, minute: defaultTimeMinute);
      
      emit(ReminderSettingsLoaded(
        enabled: enabled,
        smartEnabled: smartEnabled,
        respectDnd: respectDnd,
        defaultType: defaultType,
        defaultTime: defaultTime,
        activeReminders: [], // TODO: Load from repository
      ));
    } catch (e) {
      emit(ReminderError(message: 'Failed to load reminder settings: ${e.toString()}'));
    }
  }

  Future<void> _onSaveReminderSettings(
    SaveReminderSettingsEvent event,
    Emitter<ReminderState> emit,
  ) async {
    emit(const ReminderLoading());
    
    try {
      await _prefs.setBool(_enabledKey, event.enabled);
      await _prefs.setBool(_smartEnabledKey, event.smartEnabled);
      await _prefs.setBool(_respectDndKey, event.respectDnd);
      await _prefs.setInt(_defaultTypeKey, event.defaultType.index);
      await _prefs.setInt(_defaultTimeHourKey, event.defaultTime.hour);
      await _prefs.setInt(_defaultTimeMinuteKey, event.defaultTime.minute);
      
      emit(const ReminderSettingsSaved(message: 'Settings saved successfully'));
      
      // Reload settings to show updated state
      add(const LoadReminderSettingsEvent());
    } catch (e) {
      emit(ReminderError(message: 'Failed to save reminder settings: ${e.toString()}'));
    }
  }

  Future<void> _onCreateReminder(
    CreateReminderEvent event,
    Emitter<ReminderState> emit,
  ) async {
    emit(const ReminderLoading());
    
    final result = await createReminderUseCase(
      CreateReminderParams(reminder: event.reminder),
    );
    
    result.fold(
      (failure) => emit(ReminderError(message: _mapFailureToMessage(failure))),
      (reminder) {
        emit(ReminderCreated(reminder: reminder));
        // Schedule the reminder
        add(ScheduleReminderEvent(reminder: reminder));
      },
    );
  }

  Future<void> _onUpdateReminder(
    UpdateReminderEvent event,
    Emitter<ReminderState> emit,
  ) async {
    emit(const ReminderLoading());
    
    try {
      // TODO: Implement update reminder use case
      emit(ReminderUpdated(reminder: event.reminder));
    } catch (e) {
      emit(ReminderError(message: 'Failed to update reminder: ${e.toString()}'));
    }
  }

  Future<void> _onDeleteReminder(
    DeleteReminderEvent event,
    Emitter<ReminderState> emit,
  ) async {
    emit(const ReminderLoading());
    
    try {
      // Cancel the scheduled reminder first
      await reminderService.cancelReminder(event.reminderId);
      
      // TODO: Implement delete reminder use case
      emit(ReminderDeleted(reminderId: event.reminderId));
    } catch (e) {
      emit(ReminderError(message: 'Failed to delete reminder: ${e.toString()}'));
    }
  }

  Future<void> _onSnoozeReminder(
    SnoozeReminderEvent event,
    Emitter<ReminderState> emit,
  ) async {
    emit(const ReminderLoading());
    
    final result = await snoozeReminderUseCase(
      SnoozeReminderParams(
        reminderId: event.reminderId,
        snoozeDuration: event.snoozeDuration,
      ),
    );
    
    result.fold(
      (failure) => emit(ReminderError(message: _mapFailureToMessage(failure))),
      (_) {
        final newScheduledTime = DateTime.now().add(event.snoozeDuration);
        emit(ReminderSnoozed(
          reminderId: event.reminderId,
          snoozeDuration: event.snoozeDuration,
          newScheduledTime: newScheduledTime,
        ));
      },
    );
  }

  Future<void> _onLoadUserReminders(
    LoadUserRemindersEvent event,
    Emitter<ReminderState> emit,
  ) async {
    emit(const ReminderLoading());
    
    try {
      // TODO: Implement get user reminders use case
      emit(const RemindersLoaded(reminders: []));
    } catch (e) {
      emit(ReminderError(message: 'Failed to load reminders: ${e.toString()}'));
    }
  }

  Future<void> _onAnalyzeWorkPatterns(
    AnalyzeWorkPatternsEvent event,
    Emitter<ReminderState> emit,
  ) async {
    emit(const ReminderLoading());
    
    try {
      // Get current user ID from auth service
      final userResult = await getCurrentUserUseCase(NoParams());
      
      String userId;
      
      // Get attendance history from repository
      final attendanceResult = await attendanceRepository.getAttendanceHistory(
        userId: userResult.fold(
          (failure) => throw Exception('Unable to get current user: ${failure.message}'),
          (user) => user.id,
        ),
        limit: 30, // Analyze last 30 days
      );
      
      attendanceResult.fold(
        (failure) {
          emit(ReminderError(message: 'Failed to get attendance history: ${failure.message}'));
          return;
        },
        (attendanceHistory) {
          if (attendanceHistory.isEmpty) {
            // No history available, provide default pattern
            final defaultPattern = WorkPattern(
              userId: userResult.fold(
                (failure) => throw Exception('Unable to get current user: ${failure.message}'),
                (user) => user.id,
              ),
              clockInTimes: [DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day, 9, 0)],
              clockOutTimes: [DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day, 17, 0)],
              averageWorkDuration: const Duration(hours: 8),
              suggestedClockOutTime: const TimeOfDay(hour: 17, minute: 0),
              confidence: 0.1,
            );
            
            emit(WorkPatternAnalyzed(
              workPattern: defaultPattern,
              suggestedReminders: _generateDefaultReminders(),
            ));
            return;
          }
          
          // Continue with existing analysis logic...
          // Analyze clock-in patterns
          final clockInTimes = attendanceHistory
              .where((record) => record.clockInTime != null)
              .map((record) => record.clockInTime)
              .toList();
          
          // Analyze clock-out patterns
          final clockOutTimes = attendanceHistory
              .where((record) => record.clockOutTime != null)
              .map((record) => record.clockOutTime)
              .toList();
          
          // Calculate average work duration
          final workDurations = attendanceHistory
              .where((record) => record.clockInTime != null && record.clockOutTime != null)
              .map((record) => DateTime(
                record.clockOutTime!.hour,
                record.clockOutTime!.minute,
              ).difference(DateTime(
                record.clockInTime!.hour,
                record.clockInTime!.minute,
              )))
              .toList();
          
          final averageWorkDuration = workDurations.isNotEmpty
              ? Duration(
                  milliseconds: workDurations
                      .map((d) => d.inMilliseconds)
                      .reduce((a, b) => a + b) ~/
                      workDurations.length,
                )
              : const Duration(hours: 8);
          
          // Calculate most common clock-in time
          final mostCommonClockIn = _calculateMostCommonTime(clockInTimes.whereType<TimeOfDay>().toList());
          
          // Suggest optimal clock-out time based on average duration
          final suggestedClockOut = _addDurationToTime(
            mostCommonClockIn,
            averageWorkDuration,
          );
          
          // Calculate confidence based on data consistency
          final confidence = _calculateConfidence(
            clockInTimes.whereType<TimeOfDay>().toList(),
            clockOutTimes.whereType<TimeOfDay>().toList(),
            workDurations,
          );
          
          final workPattern = WorkPattern(
            userId: userResult.fold(
              (failure) => throw Exception('Unable to get current user: ${failure.message}'),
              (user) => user.id,
            ),
            clockInTimes: clockInTimes,
            clockOutTimes: clockOutTimes,
            averageWorkDuration: averageWorkDuration,
            suggestedClockOutTime: suggestedClockOut,
            confidence: confidence,
            lastAnalyzed: DateTime.now(),
            metadata: {
              'totalRecords': attendanceHistory.length,
              'recordsWithBothTimes': workDurations.length,
              'analysisDate': DateTime.now().toIso8601String(),
            },
          );
          
          // Generate intelligent reminders based on pattern
          final suggestedReminders = _generateIntelligentReminders(workPattern);
          
          emit(WorkPatternAnalyzed(
            workPattern: workPattern,
            suggestedReminders: suggestedReminders,
          ));
        }
      );
    } catch (e) {
      emit(ReminderError(message: 'Failed to analyze work patterns: ${e.toString()}'));
    }
  }
  
  TimeOfDay _calculateMostCommonTime(List<TimeOfDay> times) {
    if (times.isEmpty) return const TimeOfDay(hour: 9, minute: 0);
    
    // Group times by hour and find most frequent
    final hourCounts = <int, int>{};
    for (final time in times) {
      hourCounts[time.hour] = (hourCounts[time.hour] ?? 0) + 1;
    }
    
    final mostCommonHour = hourCounts.entries
        .reduce((a, b) => a.value > b.value ? a : b)
        .key;
    
    // Calculate average minute for the most common hour
    final minutesForHour = times
        .where((time) => time.hour == mostCommonHour)
        .map((time) => time.minute)
        .toList();
    
    final averageMinute = minutesForHour.isNotEmpty
        ? minutesForHour.reduce((a, b) => a + b) ~/ minutesForHour.length
        : 0;
    
    return TimeOfDay(hour: mostCommonHour, minute: averageMinute);
  }
  
  TimeOfDay _addDurationToTime(TimeOfDay time, Duration duration) {
    final totalMinutes = time.hour * 60 + time.minute + duration.inMinutes;
    final hours = (totalMinutes ~/ 60) % 24;
    final minutes = totalMinutes % 60;
    return TimeOfDay(hour: hours, minute: minutes);
  }
  
  double _calculateConfidence(
    List<TimeOfDay> clockInTimes,
    List<TimeOfDay> clockOutTimes,
    List<Duration> workDurations,
  ) {
    if (clockInTimes.length < 3) return 0.2; // Low confidence with little data
    
    // Calculate variance in clock-in times
    final clockInVariance = _calculateTimeVariance(clockInTimes);
    
    // Calculate variance in work durations
    final durationVariance = _calculateDurationVariance(workDurations);
    
    // Lower variance = higher confidence
    final clockInConfidence = 1.0 - (clockInVariance / 120.0).clamp(0.0, 1.0); // 120 minutes max variance
    final durationConfidence = 1.0 - (durationVariance / 240.0).clamp(0.0, 1.0); // 240 minutes max variance
    
    // Data amount factor
    final dataFactor = (clockInTimes.length / 30.0).clamp(0.0, 1.0); // 30 days ideal
    
    return (clockInConfidence * 0.4 + durationConfidence * 0.4 + dataFactor * 0.2).clamp(0.0, 1.0);
  }
  
  double _calculateTimeVariance(List<TimeOfDay> times) {
    if (times.length < 2) return 0.0;
    
    final minutes = times.map((time) => time.hour * 60 + time.minute).toList();
    final mean = minutes.reduce((a, b) => a + b) / minutes.length;
    final variance = minutes.map((m) => (m - mean) * (m - mean)).reduce((a, b) => a + b) / minutes.length;
    
    return variance;
  }
  
  double _calculateDurationVariance(List<Duration> durations) {
    if (durations.length < 2) return 0.0;
    
    final minutes = durations.map((d) => d.inMinutes.toDouble()).toList();
    final mean = minutes.reduce((a, b) => a + b) / minutes.length;
    final variance = minutes.map((m) => (m - mean) * (m - mean)).reduce((a, b) => a + b) / minutes.length;
    
    return variance;
  }
  
  List<Reminder> _generateIntelligentReminders(WorkPattern pattern) {
    final reminders = <Reminder>[];
    
    // Morning reminder based on typical clock-in time
    if (pattern.clockInTimes.isNotEmpty) {
      final typicalClockIn = _calculateMostCommonTime(pattern.clockInTimes.whereType<TimeOfDay>().toList());
      final reminderTime = TimeOfDay(
        hour: typicalClockIn.hour,
        minute: (typicalClockIn.minute - 15).clamp(0, 59),
      );
      
      // Convert TimeOfDay to DateTime for scheduledTime
      final now = DateTime.now();
      final scheduledDateTime = DateTime(
        now.year,
        now.month,
        now.day,
        reminderTime.hour,
        reminderTime.minute,
      );
      
      reminders.add(Reminder(
        id: 'morning_${DateTime.now().millisecondsSinceEpoch}',
        userId: pattern.userId, // Add required userId
        scheduledTime: scheduledDateTime, // Use DateTime instead of TimeOfDay
        type: ReminderType.clockIn,
      ));
    }
    
    // Evening reminder based on suggested clock-out time
    final eveningReminderTime = TimeOfDay(
      hour: pattern.suggestedClockOutTime?.hour ?? 0,
      minute: ((pattern.suggestedClockOutTime?.minute ?? 0) - 10).clamp(0, 59),
    );
    
    // Convert TimeOfDay to DateTime for scheduledTime
    final now = DateTime.now();
    final eveningScheduledDateTime = DateTime(
      now.year,
      now.month,
      now.day,
      eveningReminderTime.hour,
      eveningReminderTime.minute,
    );
    
    reminders.add(Reminder(
      id: 'evening_${DateTime.now().millisecondsSinceEpoch}',
      userId: pattern.userId, // Add required userId
      scheduledTime: eveningScheduledDateTime, // Use DateTime instead of TimeOfDay
      type: ReminderType.clockOut,
    ));
    
    return reminders;
  }
  
  List<Reminder> _generateDefaultReminders() {
    final now = DateTime.now();
    
    return [
      Reminder(
        id: 'default_morning_${DateTime.now().millisecondsSinceEpoch}',
        userId: 'current_user', // TODO: Get from auth service
        scheduledTime: DateTime(now.year, now.month, now.day, 8, 45), // Convert to DateTime
        type: ReminderType.clockIn,
      ),
      Reminder(
        id: 'default_evening_${DateTime.now().millisecondsSinceEpoch}',
        userId: 'current_user', // TODO: Get from auth service
        scheduledTime: DateTime(now.year, now.month, now.day, 16, 50), // Convert to DateTime
        type: ReminderType.clockOut,
      ),
    ];
  }

  Future<void> _onGenerateSmartReminders(
    GenerateSmartRemindersEvent event,
    Emitter<ReminderState> emit,
  ) async {
    emit(const ReminderLoading());
    
    final result = await getSmartRemindersUseCase(
      GetSmartRemindersParams(userId: event.userId),
    );
    
    result.fold(
      (failure) => emit(ReminderError(message: _mapFailureToMessage(failure))),
      (smartReminders) => emit(SmartRemindersGenerated(smartReminders: smartReminders)),
    );
  }

  Future<void> _onTestReminder(
    TestReminderEvent event,
    Emitter<ReminderState> emit,
  ) async {
    try {
      // Create a test reminder for immediate notification
      final testReminder = Reminder(
        id: 'test_${DateTime.now().millisecondsSinceEpoch}',
        userId: 'current_user', // TODO: Get from auth
        scheduledTime: DateTime.now().add(const Duration(seconds: 2)),
        type: ReminderType.notification,
      );
      
      await reminderService.scheduleReminder(testReminder);
      emit(const TestReminderSent());
    } catch (e) {
      emit(ReminderError(message: 'Failed to send test reminder: ${e.toString()}'));
    }
  }

  Future<void> _onScheduleReminder(
    ScheduleReminderEvent event,
    Emitter<ReminderState> emit,
  ) async {
    try {
      await reminderService.scheduleReminder(event.reminder);
      emit(ReminderScheduled(reminder: event.reminder));
    } catch (e) {
      emit(ReminderError(message: 'Failed to schedule reminder: ${e.toString()}'));
    }
  }

  Future<void> _onCancelReminder(
    CancelReminderEvent event,
    Emitter<ReminderState> emit,
  ) async {
    try {
      await reminderService.cancelReminder(event.reminderId);
      emit(ReminderCancelled(reminderId: event.reminderId));
    } catch (e) {
      emit(ReminderError(message: 'Failed to cancel reminder: ${e.toString()}'));
    }
  }

  String _mapFailureToMessage(Failure failure) {
    switch (failure.runtimeType) {
      case ServerFailure:
        return 'Server error occurred. Please try again later.';
      case CacheFailure:
        return 'Cache error occurred. Please try again.';
      case NetworkFailure:
        return 'Network error. Please check your connection.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}