import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';
import '../../../domain/entities/reminder.dart';

abstract class ReminderEvent extends Equatable {
  const ReminderEvent();

  @override
  List<Object?> get props => [];
}

class LoadReminderSettingsEvent extends ReminderEvent {
  const LoadReminderSettingsEvent();
}

class SaveReminderSettingsEvent extends ReminderEvent {
  final bool enabled;
  final bool smartEnabled;
  final bool respectDnd;
  final ReminderType defaultType;
  final TimeOfDay defaultTime;

  const SaveReminderSettingsEvent({
    required this.enabled,
    required this.smartEnabled,
    required this.respectDnd,
    required this.defaultType,
    required this.defaultTime,
  });

  @override
  List<Object?> get props => [
        enabled,
        smartEnabled,
        respectDnd,
        defaultType,
        defaultTime,
      ];
}

class CreateReminderEvent extends ReminderEvent {
  final Reminder reminder;

  const CreateReminderEvent({required this.reminder});

  @override
  List<Object?> get props => [reminder];
}

class UpdateReminderEvent extends ReminderEvent {
  final Reminder reminder;

  const UpdateReminderEvent({required this.reminder});

  @override
  List<Object?> get props => [reminder];
}

class DeleteReminderEvent extends ReminderEvent {
  final String reminderId;

  const DeleteReminderEvent({required this.reminderId});

  @override
  List<Object?> get props => [reminderId];
}

class SnoozeReminderEvent extends ReminderEvent {
  final String reminderId;
  final Duration snoozeDuration;

  const SnoozeReminderEvent({
    required this.reminderId,
    required this.snoozeDuration,
  });

  @override
  List<Object?> get props => [reminderId, snoozeDuration];
}

class LoadUserRemindersEvent extends ReminderEvent {
  final String userId;

  const LoadUserRemindersEvent({required this.userId});

  @override
  List<Object?> get props => [userId];
}

class AnalyzeWorkPatternsEvent extends ReminderEvent {
  const AnalyzeWorkPatternsEvent();
}

class GenerateSmartRemindersEvent extends ReminderEvent {
  final String userId;

  const GenerateSmartRemindersEvent({required this.userId});

  @override
  List<Object?> get props => [userId];
}

class TestReminderEvent extends ReminderEvent {
  const TestReminderEvent();
}

class ScheduleReminderEvent extends ReminderEvent {
  final Reminder reminder;

  const ScheduleReminderEvent({required this.reminder});

  @override
  List<Object?> get props => [reminder];
}

class CancelReminderEvent extends ReminderEvent {
  final String reminderId;

  const CancelReminderEvent({required this.reminderId});

  @override
  List<Object?> get props => [reminderId];
}
