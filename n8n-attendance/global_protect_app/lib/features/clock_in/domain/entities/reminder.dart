import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';

class Reminder extends Equatable {
  final String id;
  final String userId;
  final DateTime scheduledTime;
  final ReminderType type;
  final bool isEnabled;
  final int snoozeCount;
  final DateTime? lastSnoozedAt;
  final ReminderFrequency frequency;
  final Map<String, dynamic>? customSettings;

  const Reminder({
    required this.id,
    required this.userId,
    required this.scheduledTime,
    required this.type,
    this.isEnabled = true,
    this.snoozeCount = 0,
    this.lastSnoozedAt,
    this.frequency = ReminderFrequency.daily,
    this.customSettings,
  });

  Reminder copyWith({
    String? id,
    String? userId,
    DateTime? scheduledTime,
    ReminderType? type,
    bool? isEnabled,
    int? snoozeCount,
    DateTime? lastSnoozedAt,
    ReminderFrequency? frequency,
    Map<String, dynamic>? customSettings,
  }) {
    return Reminder(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      scheduledTime: scheduledTime ?? this.scheduledTime,
      type: type ?? this.type,
      isEnabled: isEnabled ?? this.isEnabled,
      snoozeCount: snoozeCount ?? this.snoozeCount,
      lastSnoozedAt: lastSnoozedAt ?? this.lastSnoozedAt,
      frequency: frequency ?? this.frequency,
      customSettings: customSettings ?? this.customSettings,
    );
  }

  @override
  List<Object?> get props => [
        id,
        userId,
        scheduledTime,
        type,
        isEnabled,
        snoozeCount,
        lastSnoozedAt,
        frequency,
        customSettings,
      ];
}

enum ReminderType {
  notification,
  alarm,
  vibration,
  silent,
  clockIn,
  clockOut,
}

enum ReminderFrequency {
  daily,
  weekdays,
  custom,
}

class WorkPattern extends Equatable {
  final String userId;
  final List<DateTime?> clockInTimes;
  final List<DateTime?> clockOutTimes;
  final Duration averageWorkDuration;
  final TimeOfDay suggestedClockOutTime;
  final double confidence;
  final DateTime? lastAnalyzed;
  final Map<String, dynamic>? metadata;

  const WorkPattern({
    required this.userId,
    required this.clockInTimes,
    required this.clockOutTimes,
    required this.averageWorkDuration,
    required this.suggestedClockOutTime,
    required this.confidence,
    this.lastAnalyzed,
    this.metadata,
  });

  @override
  List<Object?> get props => [
        userId,
        clockInTimes,
        clockOutTimes,
        averageWorkDuration,
        suggestedClockOutTime,
        confidence,
        lastAnalyzed,
        metadata,
      ];
}