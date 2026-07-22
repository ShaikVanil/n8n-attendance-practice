import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';
import '../../../domain/entities/reminder.dart';

abstract class ReminderState extends Equatable {
  const ReminderState();

  @override
  List<Object?> get props => [];
}

class ReminderInitial extends ReminderState {
  const ReminderInitial();
}

class ReminderLoading extends ReminderState {
  const ReminderLoading();
}

class ReminderSettingsLoaded extends ReminderState {
  final bool enabled;
  final bool smartEnabled;
  final bool respectDnd;
  final ReminderType defaultType;
  final TimeOfDay defaultTime;
  final List<Reminder> activeReminders;

  const ReminderSettingsLoaded({
    required this.enabled,
    required this.smartEnabled,
    required this.respectDnd,
    required this.defaultType,
    required this.defaultTime,
    required this.activeReminders,
  });

  @override
  List<Object?> get props => [
        enabled,
        smartEnabled,
        respectDnd,
        defaultType,
        defaultTime,
        activeReminders,
      ];
}

class RemindersLoaded extends ReminderState {
  final List<Reminder> reminders;

  const RemindersLoaded({required this.reminders});

  @override
  List<Object?> get props => [reminders];
}

class ReminderCreated extends ReminderState {
  final Reminder reminder;

  const ReminderCreated({required this.reminder});

  @override
  List<Object?> get props => [reminder];
}

class ReminderUpdated extends ReminderState {
  final Reminder reminder;

  const ReminderUpdated({required this.reminder});

  @override
  List<Object?> get props => [reminder];
}

class ReminderDeleted extends ReminderState {
  final String reminderId;

  const ReminderDeleted({required this.reminderId});

  @override
  List<Object?> get props => [reminderId];
}

class ReminderSnoozed extends ReminderState {
  final String reminderId;
  final Duration snoozeDuration;
  final DateTime newScheduledTime;

  const ReminderSnoozed({
    required this.reminderId,
    required this.snoozeDuration,
    required this.newScheduledTime,
  });

  @override
  List<Object?> get props => [reminderId, snoozeDuration, newScheduledTime];
}

class WorkPatternAnalyzed extends ReminderState {
  final WorkPattern workPattern;
  final List<Reminder> suggestedReminders;

  const WorkPatternAnalyzed({
    required this.workPattern,
    required this.suggestedReminders,
  });

  @override
  List<Object?> get props => [workPattern, suggestedReminders];
}

class SmartRemindersGenerated extends ReminderState {
  final List<Reminder> smartReminders;

  const SmartRemindersGenerated({required this.smartReminders});

  @override
  List<Object?> get props => [smartReminders];
}

class ReminderScheduled extends ReminderState {
  final Reminder reminder;

  const ReminderScheduled({required this.reminder});

  @override
  List<Object?> get props => [reminder];
}

class ReminderCancelled extends ReminderState {
  final String reminderId;

  const ReminderCancelled({required this.reminderId});

  @override
  List<Object?> get props => [reminderId];
}

class TestReminderSent extends ReminderState {
  const TestReminderSent();
}

class ReminderSettingsSaved extends ReminderState {
  final String message;

  const ReminderSettingsSaved({required this.message});

  @override
  List<Object?> get props => [message];
}

class ReminderError extends ReminderState {
  final String message;
  final String? errorCode;

  const ReminderError({
    required this.message,
    this.errorCode,
  });

  @override
  List<Object?> get props => [message, errorCode];
}